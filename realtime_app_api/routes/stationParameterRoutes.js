const express = require('express');
const router = express.Router();
const stationParameterController = require('../controllers/stationParameterController');

router.get('/', stationParameterController.getAllParameters);
router.get('/:id', stationParameterController.getParameterById);
router.post('/', stationParameterController.createParameter);
router.put('/:id', stationParameterController.updateParameter);
router.delete('/:id', stationParameterController.deleteParameter);

module.exports = router;