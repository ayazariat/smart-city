// Run this script once (node scripts/migrateLocationToGeojson.js) to convert existing complaints
// from {location:{latitude:Number,longitude:Number,...}} to GeoJSON Point

const mongoose = require('mongoose');
const Complaint = require('../src/models/Complaint');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcity', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to database');

  const cursor = Complaint.find({
    'location.latitude': { $exists: true },
    'location.coordinates': { $exists: false },
  }).cursor();

  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const lat = doc.location.latitude;
    const lon = doc.location.longitude;
    if (typeof lat === 'number' && typeof lon === 'number') {
      doc.location = {
        type: 'Point',
        coordinates: [lon, lat],
        address: doc.location.address,
        commune: doc.location.commune,
        governorate: doc.location.governorate,
        municipality: doc.location.municipality,
      };
      await doc.save();
      count++;
    }
  }

  console.log(`Migrated ${count} documents`);
  mongoose.disconnect();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});