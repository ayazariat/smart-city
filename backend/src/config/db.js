const mongoose = require('mongoose');

mongoose.connection.on('connected', () => console.log('[DB] Connected successfully'));
mongoose.connection.on('disconnected', () => console.warn('[DB] Disconnected'));
mongoose.connection.on('reconnected', () => console.log('[DB] Reconnected'));
mongoose.connection.on('error', (err) => console.error('[DB] Error:', err.message));

const connectDB = async () => {
  console.log('[DB] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
};

module.exports = connectDB;
