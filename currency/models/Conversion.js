const mongoose = require('mongoose');

const conversionSchema = new mongoose.Schema({
    fromAmount: {
        type: Number,
        required: true
    },
    fromCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    toAmount: {
        type: Number,
        required: true
    },
    toCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    rate: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Conversion || mongoose.model('Conversion', conversionSchema);
