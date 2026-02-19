const express = require('express');

const router = express.Router();

const courseController = require('../controllers/course');

const { protect } = require('../middlewares/protect');

router.post('/create-course', protect, courseController.createCourse);

