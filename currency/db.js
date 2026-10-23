const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/currency_explorer';
    
    // Configure mongoose connection
    mongoose.set('strictQuery', false);

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 4000, // Timeout after 4s instead of hanging
            connectTimeoutMS: 5000
        });
        isConnected = true;
        console.log(` Connected to MongoDB successfully (${uri.includes('@') ? 'Atlas Cluster' : 'Local Instance'})`);
    } catch (error) {
        isConnected = false;
        console.warn(`⚠️ MongoDB connection not available: ${error.message}`);
        console.info('ℹ️ The application will continue running with memory cache and local storage fallback.');
    }
}

mongoose.connection.on('connected', () => {
    isConnected = true;
});

mongoose.connection.on('disconnected', () => {
    isConnected = false;
});

mongoose.connection.on('error', (err) => {
    isConnected = false;
});

module.exports = {
    connectDB,
    isConnected: () => isConnected,
    mongoose
};
