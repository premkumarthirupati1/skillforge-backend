const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');

const enrollmentRoutes = require('./routes/enrollment');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/course');
const moduleRoutes = require('./routes/module');
const lessonRoutes = require('./routes/lesson');
const profileRoutes = require('./routes/profile');
const reviewRoutes = require('./routes/review');
const paymentRoutes = require('./routes/payment');
const errorHandler = require('./middlewares/errorHandler');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();
app.use(cookieParser());
const MONGODB_URI = `mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority`;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        `default-src 'self'; connect-src 'self' ${FRONTEND_URL}`
    );
    next();
});

app.use('/uploads', express.static('uploads'));
app.use('/api/lessons', lessonRoutes);

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

app.use(express.json());
app.use('/user', profileRoutes);
app.use('/auth', authRoutes);
app.use('/course', courseRoutes);
app.use('/enrollments', enrollmentRoutes);
app.use('/modules', moduleRoutes);
app.use('/lessons', lessonRoutes);
app.use('/review', reviewRoutes);
app.use('/payment', paymentRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

mongoose.connect(MONGODB_URI)
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error(err);
    });