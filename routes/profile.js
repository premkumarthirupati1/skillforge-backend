const express = require('express');
const { protect } = require('../middlewares/protect');
const { authorizeRoles } = require('../middlewares/authorizeRoles');
const profileController = require('../controllers/profile');

const router = express.Router();

router.get(
  '/profile',
  protect,
  authorizeRoles("student", "instructor", "admin"),
  profileController.getProfile
);

router.put(
  '/profile',
  protect,
  authorizeRoles("student", "instructor", "admin"),
  profileController.updateProfile
);

module.exports = router;