/**
 * DEBUG: Test notification creation
 * Run: node debug-notifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./src/models/Notification');
const User = require('./src/models/User');
const notificationService = require('./src/services/notification.service');

async function testNotifications() {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-city');
    console.log('✅ Connected to MongoDB');

    // Find a test user
    const user = await User.findOne().limit(1);
    if (!user) {
      console.log('❌ No users found. Create a user first.');
      return;
    }
    console.log(`✅ Found user: ${user.fullName} (${user._id})`);

    // Test 1: Create notification via service
    console.log('\n📬 Test 1: Creating notification via service...');
    const notif = await notificationService.sendNotification(null, user._id.toString(), {
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test notification from debug script',
      metadata: { test: true },
    });
    console.log('✅ Notification created:', notif._id);

    // Test 2: Count unread
    console.log('\n📊 Test 2: Counting unread notifications...');
    const unreadCount = await Notification.countDocuments({ userId: user._id, read: false });
    console.log(`✅ Unread count: ${unreadCount}`);

    // Test 3: Get all notifications for user
    console.log('\n📋 Test 3: Fetching all notifications...');
    const notifications = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5);
    console.log(`✅ Found ${notifications.length} notifications`);
    notifications.forEach(n => {
      console.log(`   - [${n.read ? 'read' : 'unread'}] ${n.type}: ${n.message.substring(0, 50)}...`);
    });

    console.log('\n✅ All tests passed! Notification system is working.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testNotifications();
