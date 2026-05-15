const mongoose = require('mongoose');

const connectDB = async () => {
  console.log('[DB] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[DB] Connected successfully');
};

module.exports = connectDB;
