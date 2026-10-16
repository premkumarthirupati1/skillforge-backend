const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');

const enrollmentRoutes = require('./routes/enrollment');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/course');
const moduleRoutes = require('./routes/module');
const lessonRoutes = require('./routes/lesson');
const profileRoutes = require('./routes/profile');
const reviewRoutes = require('./routes/review');
const paymentRoutes = require('./routes/payment');
const runnerRoutes = require('./routes/runner');
const projectRoutes = require('./routes/project');
const errorHandler = require('./middlewares/errorHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const { applySecurityLayer } = require('./middlewares/security');

dotenv.config();

const app = express();
app.set('trust proxy', 1);

const MONGODB_URI = `mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority`;

const configuredFrontend = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/+$/, '') : null;
const allowedOrigins = [
    configuredFrontend,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
].filter(Boolean);

// 1. Enterprise Security Layer (Helmet Headers, CSP, HSTS, Audit Logging, HPP)
const [mongoSanitizer, xssSanitizer] = applySecurityLayer(app, { allowedOrigins });

// 2. Hardened CORS Configuration
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400 // 24h preflight cache
}));

// 3. Request Body Parsing with Strict Payload Limits (DoS / Memory Exhaustion Defense)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 4. NoSQL Injection & Stored XSS Sanitizers
app.use(mongoSanitizer);
app.use(xssSanitizer);

// 5. Global Rate Limiting
app.use(globalLimiter);

// 6. Static Uploads
app.use('/uploads', express.static('uploads'));
app.use('/api/lessons', lessonRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: "ok",
        version: "1.0.8-brevo-live",
        frontendUrl: process.env.FRONTEND_URL || "https://skillforge-frontend-aijn.vercel.app",
        hasBrevo: !!process.env.BREVO_API_KEY,
        hasResend: !!process.env.RESEND_API_KEY
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
app.use('/api/runner', runnerRoutes);
app.use('/runner', runnerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/projects', projectRoutes);
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