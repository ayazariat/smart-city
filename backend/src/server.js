const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

connectDB();
require('./utils/mailer');

// Import models to register them with Mongoose
require('./models/User');
require('./models/Municipality');
require('./models/Department');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
