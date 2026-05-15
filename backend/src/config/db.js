const mongoose = require('mongoose');

mongoose.connection.on('connected', () => console.log('[DB] Connected successfully'));
mongoose.connection.on('disconnected', () => console.warn('[DB] Disconnected'));
mongoose.connection.on('reconnected', () => console.log('[DB] Reconnected'));
mongoose.connection.on('error', (err) => console.error('[DB] Error:', err.message));

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const connectDB = async () => {
  console.log('[DB] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
};

module.exports = connectDB;
