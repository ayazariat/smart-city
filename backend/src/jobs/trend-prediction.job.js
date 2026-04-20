/**
 * Trend Prediction Job (BL-37)
 * Runs nightly to generate complaint trend forecasts
 * Scheduled at 02:00 daily
 */

const cron = require('node-cron');
const axios = require('axios');

// Run at 02:00 daily
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('[BL-37] Starting trend prediction batch...');
    
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    // Fetch historical data from MongoDB (aggregated by municipality+category+date)
    // For now, we'll make an aggregated query
    const Complaint = require('../models/Complaint');
    
    // Get complaints from last 90 days (need at least 30 for prediction)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const complaints = await Complaint.find({
      createdAt: { $gte: ninetyDaysAgo },
      status: { $ne: 'ARCHIVED' }
    }).select('municipalityName category createdAt').lean();
    
    // Aggregate by municipality + category + date
    const aggregated = {};
    for (const c of complaints) {
      const mun = c.municipalityName || 'UNKNOWN';
      const cat = c.category || 'OTHER';
      const dateKey = c.createdAt.toISOString().split('T')[0];
      
      const key = `${mun}|${cat}`;
      if (!aggregated[key]) {
        aggregated[key] = {};
      }
      if (!aggregated[key][dateKey]) {
        aggregated[key][dateKey] = 0;
      }
      aggregated[key][dateKey]++;
    }
    
    // Convert to format expected by AI service
    const historicalData = [];
    for (const [key, dates] of Object.entries(aggregated)) {
      const [municipality, category] = key.split('|');
      for (const [date, count] of Object.entries(dates)) {
        historicalData.push({ municipality, category, date, count });
      }
    }
    
    console.log(`[BL-37] Prepared ${historicalData.length} data points for trend analysis`);
    
    // Call AI service
    const result = await axios.post(
      `${aiServiceUrl}/ai/trend/run-batch`,
      { historicalData },
      { timeout: 30000 }
    );
    
    if (result.data?.success) {
      const data = result.data.data;
      console.log(`[BL-37] Trend batch completed: ${data.processed} predictions, ${data.alerts} alerts`);
    } else {
      console.log('[BL-37] Trend batch returned no data');
    }
    
  } catch (err) {
    console.error('[BL-37] Trend prediction failed:', err.message);
  }
});

module.exports = {};