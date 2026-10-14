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
const { globalLimiter } = require('./middlewares/rateLimiter');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(cookieParser());
const MONGODB_URI = `mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority`;

const configuredFrontend = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/+$/, '') : null;
const allowedOrigins = [
    configuredFrontend,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
].filter(Boolean);

app.use((req, res, next) => {
    const connectSources = allowedOrigins.join(" ");
    res.setHeader(
        "Content-Security-Policy",
        `default-src 'self'; connect-src 'self' ${connectSources}`
    );
    next();
});

app.use('/uploads', express.static('uploads'));
app.use('/api/lessons', lessonRoutes);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(globalLimiter);
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: "ok",
        version: "1.0.3-fast-async-email",
        frontendUrl: process.env.FRONTEND_URL || "not_set",
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS,
        hasSendGrid: !!process.env.SENDGRID_KEY
    });
});

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