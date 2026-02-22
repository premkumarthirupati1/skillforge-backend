const express = require('express');

const { protect } = require('../middlewares/protect');

const { authorizeRoles } = require('../middlewares/authorizeRoles');

const moduleController = require('../controllers/module');

const router = express.Router();

router.post('/:courseID', protect, authorizeRoles("instructor"), moduleController.createModule);


module.exports = router;