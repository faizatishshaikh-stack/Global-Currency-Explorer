const mongoose = require('mongoose');

const exchangeRateCacheSchema = new mongoose.Schema({
    base: {
        type: String,
        required: true,
        uppercase: true,
        unique: true,
        trim: true
    },
    date: {
        type: String,
        required: true
    },
    rates: {
        type: Map,
        of: Number,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.ExchangeRateCache || mongoose.model('ExchangeRateCache', exchangeRateCacheSchema);
