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

const nodemailer = require('nodemailer');

app.get('/health', (req, res) => {
    const hasSmtpConfigured = !!(process.env.EMAIL_USER || true);
    res.json({
        status: "ok",
        version: "1.0.6-ipv4-enforced",
        frontendUrl: process.env.FRONTEND_URL || "https://skillforge-frontend-aijn.vercel.app",
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS,
        smtpActive: hasSmtpConfigured
    });
});

app.get('/test-email', async (req, res) => {
    const to = req.query.to || "thirupatipremkumar1@gmail.com";
    const emailUser = process.env.EMAIL_USER || "skillforge.noreply@gmail.com";
    const emailPass = process.env.EMAIL_PASS || "laxx wion xwlu kaaj";

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: emailUser, pass: emailPass },
        family: 4,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
    });

    try {
        const verify = await transporter.verify();
        const info = await transporter.sendMail({
            from: `"SkillForge Support" <${emailUser}>`,
            to,
            subject: "Render Direct Test",
            text: "Testing Render email delivery directly from API."
        });
        res.json({ success: true, verify, info: info.response });
    } catch (err) {
        console.error("Test email error:", err);
        res.status(500).json({ success: false, error: err.message, code: err.code, stack: err.stack });
    }
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