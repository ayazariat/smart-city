/**
 * Archive Job
 * Auto-archives CLOSED/REJECTED complaints after 30 days
 */

const cron = require('node-cron');
const Complaint = require('../models/Complaint');

// Auto-archive CLOSED/REJECTED after 30 days — runs daily at 02:00
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Running auto-archive job...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Complaint.updateMany(
      {
        status: { $in: ['CLOSED', 'REJECTED'] },
        updatedAt: { $lt: thirtyDaysAgo },
        isArchived: { $ne: true }
      },
      { $set: { isArchived: true, archivedAt: new Date() } }
    );
    
    console.log(`Auto-archive: ${result.modifiedCount} complaints archived`);
  } catch (err) {
    console.error('Auto-archive error:', err);
  }
});

module.exports = {};
