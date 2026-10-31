const express = require('express');
const { protect } = require('../middlewares/protect');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

router.use(protect);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.get('/export', settingsController.exportData);
router.delete('/account', settingsController.deleteAccount);

module.exports = router;
