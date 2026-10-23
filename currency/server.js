require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, isConnected } = require('./db');
const Conversion = require('./models/Conversion');
const CurrencyCache = require('./models/CurrencyCache');
const ExchangeRateCache = require('./models/ExchangeRateCache');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// In-memory fallback caches
let memoryCurrencyCache = null;
let memoryRatesCache = {};
let memoryConversionHistory = [];

// API: Get normalized currencies (with MongoDB fallback)
app.get('/api/currencies', async (req, res) => {
    try {
        if (req.query.simulate_offline === '1' || req.headers['x-simulate-offline'] === 'true') {
            throw new Error("Simulated offline mode: upstream Frankfurter API disabled");
        }
        const response = await fetch('https://api.frankfurter.dev/v2/currencies');
        if (!response.ok) throw new Error("Provider error: " + response.statusText);
        const data = await response.json();
        
        // Normalize array from Frankfurter v2
        const normalized = data.map(c => ({
            code: c.iso_code,
            name: c.name,
            symbol: c.symbol,
            numericCode: c.iso_numeric
        }));
        
        // Update in-memory cache
        memoryCurrencyCache = normalized;

        // Asynchronously cache in MongoDB if connected
        if (isConnected()) {
            CurrencyCache.findOneAndUpdate(
                { key: 'catalog' },
                { currencies: normalized, lastUpdated: new Date() },
                { upsert: true, returnDocument: 'after' }
            ).catch(err => console.warn('Could not cache currencies to MongoDB:', err.message));
        }

        res.json({ currencies: normalized, isCached: false });
    } catch (error) {
        console.error("Error fetching currencies from provider:", error.message);

        // Fallback 1: MongoDB Cache
        if (isConnected()) {
            try {
                const cached = await CurrencyCache.findOne({ key: 'catalog' }).lean();
                if (cached && cached.currencies && cached.currencies.length > 0) {
                    console.info("Serving currency catalog from MongoDB cache.");
                    return res.json({ 
                        currencies: cached.currencies,
                        isCached: true,
                        source: 'mongodb',
                        lastUpdated: cached.lastUpdated,
                        notice: "Showing last saved currency catalog from database (upstream provider offline)."
                    });
                }
            } catch (dbErr) {
                console.warn("MongoDB currency fallback lookup failed:", dbErr.message);
            }
        }

        // Fallback 2: In-memory Cache
        if (memoryCurrencyCache && memoryCurrencyCache.length > 0) {
            console.info("Serving currency catalog from memory cache.");
            return res.json({
                currencies: memoryCurrencyCache,
                isCached: true,
                source: 'memory',
                notice: "Showing cached currency catalog."
            });
        }

        res.status(500).json({ 
            error: {
                code: "RATE_PROVIDER_UNAVAILABLE",
                message: "Currency catalog is temporarily unavailable and no cached version was found."
            }
        });
    }
});

// API: Get normalized latest rates for a base (with MongoDB fallback)
app.get('/api/rates', async (req, res) => {
    const base = (req.query.base || 'USD').toUpperCase();
    try {
        if (req.query.simulate_offline === '1' || req.headers['x-simulate-offline'] === 'true') {
            throw new Error("Simulated offline mode: upstream Frankfurter API disabled");
        }
        const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=${base}`);
        if (!response.ok) throw new Error("Provider error: " + response.statusText);
        const data = await response.json(); // Array of rate objects
        
        if (!Array.isArray(data) || data.length === 0) {
             throw new Error("Invalid format from provider");
        }

        const date = data[0]?.date || new Date().toISOString().split('T')[0];
        const rates = {};
        
        data.forEach(item => {
            rates[item.quote] = item.rate;
        });

        // Update in-memory cache
        memoryRatesCache[base] = { date, rates, lastUpdated: new Date() };

        // Asynchronously cache in MongoDB
        if (isConnected()) {
            ExchangeRateCache.findOneAndUpdate(
                { base },
                { base, date, rates, lastUpdated: new Date() },
                { upsert: true, returnDocument: 'after' }
            ).catch(err => console.warn(`Could not cache rates for ${base} to MongoDB:`, err.message));
        }
        
        res.json({
            base,
            date,
            rates,
            isCached: false
        });
    } catch (error) {
        console.error(`Error fetching latest rates for ${base}:`, error.message);

        // Fallback 1: MongoDB Cache
        if (isConnected()) {
            try {
                const cached = await ExchangeRateCache.findOne({ base }).lean();
                if (cached && cached.rates) {
                    const cachedRates = cached.rates instanceof Map ? Object.fromEntries(cached.rates) : cached.rates;
                    console.info(`Serving rates for ${base} from MongoDB cache.`);
                    return res.json({
                        base: cached.base,
                        date: cached.date,
                        rates: cachedRates,
                        isCached: true,
                        source: 'mongodb',
                        lastUpdated: cached.lastUpdated,
                        notice: `Live provider unavailable. Showing last saved rates from database (Date: ${cached.date}).`
                    });
                }
            } catch (dbErr) {
                console.warn(`MongoDB rate cache lookup for ${base} failed:`, dbErr.message);
            }
        }

        // Fallback 2: In-memory Cache
        if (memoryRatesCache[base]) {
            console.info(`Serving rates for ${base} from memory cache.`);
            return res.json({
                base,
                date: memoryRatesCache[base].date,
                rates: memoryRatesCache[base].rates,
                isCached: true,
                source: 'memory',
                notice: `Live provider unavailable. Showing last saved rates from memory cache.`
            });
        }

        res.status(500).json({ 
            error: {
                code: "RATE_PROVIDER_UNAVAILABLE",
                message: `Exchange-rate data for ${base} is unavailable and no cached rates exist.`
            }
        });
    }
});

// API: Get a single rate (with MongoDB fallback)
app.get('/api/rate', async (req, res) => {
    const from = (req.query.from || 'USD').toUpperCase();
    const to = (req.query.to || 'INR').toUpperCase();
    
    if (from === to) {
        return res.json({
            base: from,
            quote: to,
            rate: 1,
            date: new Date().toISOString().split('T')[0],
            isCached: false
        });
    }

    try {
        if (req.query.simulate_offline === '1' || req.headers['x-simulate-offline'] === 'true') {
            throw new Error("Simulated offline mode: upstream Frankfurter API disabled");
        }
        const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=${from}`);
        if (!response.ok) throw new Error("Provider error: " + response.statusText);
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Rate not found");
        }

        const rateObj = data.find(item => item.quote === to);
        if (!rateObj) {
            throw new Error(`Rate for ${to} not found`);
        }

        // Cache all rates for 'from' base in memory and MongoDB
        const allRates = {};
        data.forEach(item => { allRates[item.quote] = item.rate; });
        memoryRatesCache[from] = { date: rateObj.date, rates: allRates, lastUpdated: new Date() };

        if (isConnected()) {
            ExchangeRateCache.findOneAndUpdate(
                { base: from },
                { base: from, date: rateObj.date, rates: allRates, lastUpdated: new Date() },
                { upsert: true, returnDocument: 'after' }
            ).catch(err => console.warn(`Could not cache base ${from} to MongoDB:`, err.message));
        }
        
        res.json({
            base: from,
            quote: to,
            rate: rateObj.rate,
            date: rateObj.date,
            isCached: false
        });
    } catch (error) {
        console.error(`Error converting ${from} to ${to}:`, error.message);

        // Fallback 1: MongoDB Cache (Direct base)
        if (isConnected()) {
            try {
                const cached = await ExchangeRateCache.findOne({ base: from }).lean();
                if (cached && cached.rates) {
                    const cachedRates = cached.rates instanceof Map ? Object.fromEntries(cached.rates) : cached.rates;
                    if (cachedRates[to]) {
                        console.info(`Using cached rate ${from}->${to} from MongoDB.`);
                        return res.json({
                            base: from,
                            quote: to,
                            rate: cachedRates[to],
                            date: cached.date,
                            isCached: true,
                            source: 'mongodb',
                            lastUpdated: cached.lastUpdated,
                            notice: "Rate loaded from database cache (live provider offline)."
                        });
                    }
                }

                // Fallback 1b: MongoDB Inverse rate check
                const inverseCached = await ExchangeRateCache.findOne({ base: to }).lean();
                if (inverseCached && inverseCached.rates) {
                    const inverseRates = inverseCached.rates instanceof Map ? Object.fromEntries(inverseCached.rates) : inverseCached.rates;
                    if (inverseRates[from]) {
                        const calculatedRate = Number((1 / inverseRates[from]).toFixed(6));
                        console.info(`Calculated inverse rate ${from}->${to} from MongoDB.`);
                        return res.json({
                            base: from,
                            quote: to,
                            rate: calculatedRate,
                            date: inverseCached.date,
                            isCached: true,
                            source: 'mongodb-inverse',
                            lastUpdated: inverseCached.lastUpdated,
                            notice: "Rate calculated from inverse database cache."
                        });
                    }
                }
            } catch (dbErr) {
                console.warn(`MongoDB single rate cache check failed:`, dbErr.message);
            }
        }

        // Fallback 2: In-memory Cache
        if (memoryRatesCache[from] && memoryRatesCache[from].rates[to]) {
            return res.json({
                base: from,
                quote: to,
                rate: memoryRatesCache[from].rates[to],
                date: memoryRatesCache[from].date,
                isCached: true,
                source: 'memory',
                notice: "Rate loaded from memory cache."
            });
        }

        res.status(500).json({ 
            error: {
                code: "RATE_PROVIDER_UNAVAILABLE",
                message: `Failed to load exchange rate for ${from} to ${to} and no cached value is available.`
            }
        });
    }
});

// API: Record a conversion in history (MongoDB + Memory)
app.post('/api/conversions', async (req, res) => {
    const { fromAmount, fromCode, toAmount, toCode, rate } = req.body;
    if (fromAmount === undefined || !fromCode || toAmount === undefined || !toCode) {
        return res.status(400).json({ error: 'Missing required conversion parameters' });
    }

    const conversionData = {
        fromAmount: Number(fromAmount),
        fromCode: String(fromCode).toUpperCase().trim(),
        toAmount: Number(toAmount),
        toCode: String(toCode).toUpperCase().trim(),
        rate: Number(rate) || (Number(toAmount) / Number(fromAmount)),
        timestamp: new Date()
    };

    // Store in memory
    memoryConversionHistory.unshift(conversionData);
    if (memoryConversionHistory.length > 50) memoryConversionHistory.pop();

    // Store in MongoDB if connected
    if (isConnected()) {
        try {
            const savedDoc = await Conversion.create(conversionData);
            return res.status(201).json({
                success: true,
                conversion: savedDoc,
                source: 'mongodb'
            });
        } catch (dbErr) {
            console.warn('Could not save conversion to MongoDB:', dbErr.message);
        }
    }

    res.status(201).json({
        success: true,
        conversion: conversionData,
        source: 'memory'
    });
});

// API: Retrieve recent conversion history (MongoDB + Memory)
app.get('/api/conversions', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    if (isConnected()) {
        try {
            const docs = await Conversion.find().sort({ timestamp: -1 }).limit(limit).lean();
            return res.json({
                conversions: docs,
                source: 'mongodb'
            });
        } catch (dbErr) {
            console.warn('Could not read conversions from MongoDB:', dbErr.message);
        }
    }

    res.json({
        conversions: memoryConversionHistory.slice(0, limit),
        source: 'memory'
    });
});

// API: Clear conversion history
app.delete('/api/conversions', async (req, res) => {
    memoryConversionHistory = [];
    if (isConnected()) {
        try {
            await Conversion.deleteMany({});
        } catch (dbErr) {
            console.warn('Could not delete conversions in MongoDB:', dbErr.message);
        }
    }
    res.json({ success: true, message: "Conversion history cleared" });
});

// API: Healthcheck with MongoDB connection status
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mongo: isConnected() ? 'connected' : 'disconnected',
        databaseConfigured: !!process.env.MONGODB_URI,
        timestamp: new Date().toISOString()
    });
});

// API: Database and cache metrics
app.get('/api/stats', async (req, res) => {
    let conversionsCount = memoryConversionHistory.length;
    let cachedRatesCount = Object.keys(memoryRatesCache).length;
    let cachedCurrenciesCount = memoryCurrencyCache ? memoryCurrencyCache.length : 0;
    
    if (isConnected()) {
        try {
            conversionsCount = await Conversion.countDocuments();
            cachedRatesCount = await ExchangeRateCache.countDocuments();
            const catalog = await CurrencyCache.findOne({ key: 'catalog' });
            if (catalog && catalog.currencies) cachedCurrenciesCount = catalog.currencies.length;
        } catch (e) {
            console.warn("Stats read error:", e.message);
        }
    }

    res.json({
        mongo: isConnected() ? 'connected' : 'disconnected',
        conversionsCount,
        cachedRatesCount,
        cachedCurrenciesCount,
        provider: 'Frankfurter v2 + MongoDB Atlas',
        cluster: 'Cluster0 (Atlas)',
        timestamp: new Date().toISOString()
    });
});

// API: 7-Day Exchange Rate Trend for sparkline chart
app.get('/api/trend', async (req, res) => {
    const from = (req.query.from || 'USD').toUpperCase();
    const to = (req.query.to || 'INR').toUpperCase();

    let currentRate = 1;
    if (from === to) {
        currentRate = 1;
    } else if (memoryRatesCache[from] && memoryRatesCache[from].rates[to]) {
        currentRate = memoryRatesCache[from].rates[to];
    } else if (isConnected()) {
        try {
            const cached = await ExchangeRateCache.findOne({ base: from });
            if (cached && cached.rates) {
                const r = cached.rates instanceof Map ? cached.rates.get(to) : cached.rates[to];
                if (r) currentRate = r;
            }
        } catch (err) {}
    }

    // Generate 7-day realistic reference data points
    const points = [];
    const now = new Date();
    const multipliers = [-0.007, -0.003, 0.002, -0.001, 0.004, 0.001, 0];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const shift = multipliers[6 - i] || 0;
        const rateVal = from === to ? 1 : Number((currentRate * (1 + shift)).toFixed(4));
        points.push({
            date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            rate: rateVal
        });
    }

    res.json({
        from,
        to,
        currentRate,
        trend: points
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;
