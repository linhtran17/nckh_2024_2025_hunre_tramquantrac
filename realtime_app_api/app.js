const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const stationRoutes = require('./routes/stationRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const thresholdRoutes = require('./routes/thresholdRoutes');
const alertRoutes = require('./routes/alertRoutes');
const stationParameterRoutes = require('./routes/stationParameterRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/stations', stationRoutes);
app.use('/api/station-parameters', stationParameterRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/thresholds', thresholdRoutes);
app.use('/api/alerts', alertRoutes);

const thresholdController = require('./controllers/thresholdController');

// Gọi checkThresholds định kỳ
setInterval(async () => {
  try {
    const io = app.get('io'); // Lấy io từ app
    await thresholdController.checkThresholds(io);
    console.log('Periodic threshold check completed');
  } catch (error) {
    console.error('Error in periodic threshold check:', error);
  }
}, 5 * 60 * 1000); // Chạy mỗi 5 phút

module.exports = app;