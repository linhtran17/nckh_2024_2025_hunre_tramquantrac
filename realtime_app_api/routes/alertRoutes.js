const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

router.get('/', alertController.getAllAlerts);
router.get('/:id', alertController.getAlertById);
router.post('/', alertController.createAlert);
router.delete('/:id', alertController.deleteAlert);
router.get('/export', alertController.exportAlerts);

module.exports = router;