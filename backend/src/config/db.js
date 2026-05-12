const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('[DB] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[DB] Connected successfully');
  } catch (error) {
    console.error('[DB] Connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
