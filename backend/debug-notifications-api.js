/**
 * DEBUG: Test notification API endpoints
 * Run: node debug-notifications-api.js
 */

const axios = require('axios');

// Read token from cookies or provide manually
const API_BASE = 'http://localhost:5000/api';

async function testAPI() {
  try {
    // You need to provide a valid token. Let's try reading from browser cookies or prompt
    const token = process.env.TEST_TOKEN || (require('fs').readFileSync('.token', 'utf8').trim());
    
    if (!token) {
      console.log('❌ No token provided. Set TEST_TOKEN env var or create .token file with access token');
      process.exit(1);
    }

    console.log('🔐 Using token:', token.substring(0, 20) + '...');

    // Test GET /api/notifications/count
    console.log('\n📊 Testing GET /api/notifications/count...');
    const countRes = await axios.get(`${API_BASE}/notifications/count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Response:', countRes.data);

    // Test GET /api/notifications
    console.log('\n📋 Testing GET /api/notifications...');
    const notifRes = await axios.get(`${API_BASE}/notifications?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Response:', JSON.stringify(notifRes.data, null, 2));

    console.log('\n✅ API tests completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ API Error:', error.response?.status, error.response?.data || error.message);
    process.exit(1);
  }
}

testAPI();
