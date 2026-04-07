const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/smart-city').then(async () => {
  const db = mongoose.connection.db;
  const results = await db.collection('complaints').aggregate([
    { $group: { _id: '$governorate', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('All complaints by governorate:');
  console.log(JSON.stringify(results, null, 2));
  
  const statuses = await db.collection('complaints').aggregate([
    { $match: { status: { $in: ['VALIDATED','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED'] }, isArchived: { $ne: true } } },
    { $group: { _id: '$governorate', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\nPublic-visible complaints by governorate:');
  console.log(JSON.stringify(statuses, null, 2));
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
