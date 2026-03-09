const express = require('express');

const router = express.Router();

const { protect } = require('../middlewares/protect');

const { authorizeRoles } = require('../middlewares/authorizeRoles');

const profileController = require('../controllers/profile');

router.get('/profile', protect, authorizeRoles("student", "instructor", "admin"), profileController.getProfile);

router.put('/profile', protect, authorizeRoles("student", "instructor", "admin"), profileController.updateProfile);

module.exports = router;