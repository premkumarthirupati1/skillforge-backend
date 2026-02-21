const express = require('express');
require('dotenv').config();
const app = express();
const mongoose = require('mongoose');
const enrollmentRoutes = require('./routes/enrollment');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/course');
const e = require('express');
const MONGODB_URI = `mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority`;

app.use(express.json());
app.use('/admin', authRoutes);
app.use('/course', courseRoutes);
app.use('/enrollments', enrollmentRoutes);

const PORT = 3000;
mongoose.connect(MONGODB_URI)
    .then(result => {
        app.listen(PORT);
    })
    .catch(err => {
        console.log(err);
    })