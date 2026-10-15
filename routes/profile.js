const express = require('express');
const { protect } = require('../middlewares/protect');
const { authorizeRoles } = require('../middlewares/authorizeRoles');
const { upload } = require('../middlewares/upload');
const profileController = require('../controllers/profile');

const router = express.Router();

router.get(
  '/profile',
  protect,
  authorizeRoles("student", "instructor", "admin"),
  profileController.getProfile
);

// Real-time username availability check
router.get(
  '/check-username',
  protect,
  profileController.checkUsernameAvailability
);

// Public profile view accessible to anyone by username or userId
router.get(
  '/profile/:identifier',
  profileController.getPublicProfile
);

router.put(
  '/profile',
  protect,
  authorizeRoles("student", "instructor", "admin"),
  upload.single('avatar'),
  profileController.updateProfile
);

module.exports = router;