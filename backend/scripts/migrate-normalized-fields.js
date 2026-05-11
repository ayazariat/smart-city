/**
 * Migration script to backfill municipalityNormalized and governorateNormalized fields
 * Run this once to update existing Complaint and User documents
 */

const mongoose = require('mongoose');
const { normalizeMunicipality, normalizeGovernorate } = require('../src/utils/normalize');
const Complaint = require('../src/models/Complaint');
const User = require('../src/models/User');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-city';

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Migrate Complaints
    console.log('\n=== Migrating Complaints ===');
    const complaints = await Complaint.find({
      $or: [
        { municipalityNormalized: { $exists: false } },
        { municipalityNormalized: '' },
        { governorateNormalized: { $exists: false } },
        { governorateNormalized: '' }
      ]
    });

    console.log(`Found ${complaints.length} complaints to migrate`);

    for (const complaint of complaints) {
      const municipalityName = complaint.municipalityName || complaint.municipality?.name || complaint.location?.municipality || '';
      const governorateName = complaint.governorate || complaint.location?.governorate || '';

      const normalizedMunicipality = normalizeMunicipality(municipalityName);
      const normalizedGovernorate = normalizeGovernorate(governorateName);

      await Complaint.updateOne(
        { _id: complaint._id },
        {
          municipalityNormalized: normalizedMunicipality,
          governorateNormalized: normalizedGovernorate
        }
      );

      console.log(`Updated complaint ${complaint._id}: ${municipalityName} -> ${normalizedMunicipality}, ${governorateName} -> ${normalizedGovernorate}`);
    }

    // Migrate Users
    console.log('\n=== Migrating Users ===');
    const users = await User.find({
      $or: [
        { municipalityNormalized: { $exists: false } },
        { municipalityNormalized: '' },
        { governorateNormalized: { $exists: false } },
        { governorateNormalized: '' }
      ]
    });

    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      const municipalityName = user.municipalityName || user.municipality?.name || '';
      const governorateName = user.governorate || '';

      const normalizedMunicipality = normalizeMunicipality(municipalityName);
      const normalizedGovernorate = normalizeGovernorate(governorateName);

      await User.updateOne(
        { _id: user._id },
        {
          municipalityNormalized: normalizedMunicipality,
          governorateNormalized: normalizedGovernorate
        }
      );

      console.log(`Updated user ${user._id}: ${municipalityName} -> ${normalizedMunicipality}, ${governorateName} -> ${normalizedGovernorate}`);
    }

    console.log('\n=== Migration completed successfully ===');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

migrate();
