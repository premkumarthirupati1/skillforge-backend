const express = require('express');
const Module = require('../models/module');
const { protect } = require('../middlewares/protect');
const { authorizeRoles } = require('../middlewares/authorizeRoles');
const moduleController = require('../controllers/module');

const router = express.Router();

router.post(
  '/:courseId/create',
  protect,
  authorizeRoles("instructor"),
  moduleController.createModule
);

router.patch(
  '/:moduleId/update-module',
  protect,
  authorizeRoles("instructor", "admin"),
  moduleController.updateModule
);

router.get(
  '/:courseId/get-modules',
  protect,
  authorizeRoles("instructor", "admin"),
  moduleController.fetchModules
);

router.get(
  '/:moduleId',
  protect,
  authorizeRoles("instructor", "admin", "student"),
  moduleController.getModule
);

module.exports = router;