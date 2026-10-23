const mongoose = require('mongoose');

const currencyItemSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    symbol: { type: String, default: '' },
    numericCode: { type: String, default: '' }
}, { _id: false });

const currencyCacheSchema = new mongoose.Schema({
    key: {
        type: String,
        default: 'catalog',
        unique: true
    },
    currencies: [currencyItemSchema],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.CurrencyCache || mongoose.model('CurrencyCache', currencyCacheSchema);
