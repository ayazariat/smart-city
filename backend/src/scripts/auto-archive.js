/**
 * Auto-Archive Script
 * Runs daily to archive closed complaints older than 30 days
 * Can be run as a cron job: 0 0 * * * (midnight every day)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Complaint = require('../models/Complaint');

const ARCHIVE_DAYS = 30;

async function autoArchive() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcity';
    await mongoose.connect(mongoUri);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_DAYS);

    // Find closed complaints older than 30 days that aren't already archived
    const complaintsToArchive = await Complaint.find({
      status: 'CLOSED',
      isArchived: false,
      updatedAt: { $lt: cutoffDate }
    });

    if (complaintsToArchive.length === 0) {
      await mongoose.disconnect();
      return;
    }

    // Archive each complaint
    let archivedCount = 0;
    for (const complaint of complaintsToArchive) {
      try {
        complaint.status = 'ARCHIVED';
        complaint.isArchived = true;
        complaint.archivedAt = new Date();
        
        // Add to status history
        complaint.statusHistory.push({
          status: 'ARCHIVED',
          updatedAt: new Date(),
          notes: 'Auto-archived: Closed for more than 30 days'
        });

        await complaint.save();
        archivedCount++;
      } catch (err) {
        // Continue with other complaints
      }
    }
    
  } catch (error) {
    // Handle error silently
  } finally {
    await mongoose.disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  autoArchive();
}

module.exports = { autoArchive };
