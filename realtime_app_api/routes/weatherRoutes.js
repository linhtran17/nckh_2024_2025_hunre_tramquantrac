const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

router.get('/', weatherController.getAllWeatherData);
router.get('/latest', weatherController.getLatestWeatherData);
router.post('/', weatherController.createWeatherData);
router.post('/esp32', weatherController.createWeatherData); // Thay / bằng /esp32 để khớp với /api/weather/esp32
router.get('/filter', weatherController.filterDataByDateRange);
router.post('/export', weatherController.exportFilteredDataToExcel);
router.get('/alerts/:station_id', weatherController.getAlertsByStation);
router.get('/filter-by-range', weatherController.filterDataByTimeRange); 


module.exports = router;