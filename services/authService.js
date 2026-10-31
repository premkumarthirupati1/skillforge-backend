const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { logSecurityEvent } = require('../middlewares/security/auditLogger');

// Configuration Constants
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRES_IN || '15m'; // Standard 15m
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_SEC = 60; // 60 seconds

// Password Complexity Requirement (NIST / OWASP standard)
const validatePasswordComplexity = (password) => {
    if (!password || typeof password !== 'string') {
        throw new Error("Password is required.");
    }
    if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
    }
    if (password.length > 128) {
        throw new Error("Password cannot exceed 128 characters.");
    }
    if (!/[a-z]/.test(password)) {
        throw new Error("Password must contain at least one lowercase letter.");
    }
    if (!/[A-Z]/.test(password)) {
        throw new Error("Password must contain at least one uppercase letter.");
    }
    if (!/[0-9]/.test(password)) {
        throw new Error("Password must contain at least one number.");
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
        throw new Error("Password must contain at least one special character.");
    }
};

// Email Transporter Factory
const getTransporter = () => {
    const emailUser = process.env.EMAIL_USER || "skillforge.noreply@gmail.com";
    const emailPass = process.env.EMAIL_PASS || "laxx wion xwlu kaaj";

    if (emailUser && emailPass) {
        return nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: emailUser,
                pass: emailPass
            },
            family: 4, // Force IPv4 to eliminate Render IPv6 ENETUNREACH errors
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
    }

    if (process.env.SENDGRID_KEY && process.env.SENDGRID_KEY.startsWith("SG.")) {
        return nodemailer.createTransport({
            host: "smtp.sendgrid.net",
            port: 587,
            auth: {
                user: "apikey",
                pass: process.env.SENDGRID_KEY
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000
        });
    }

    return null;
};

const sendViaResend = async ({ to, subject, html }) => {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return false;

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "SkillForge <onboarding@resend.dev>",
                to: [to],
                subject,
                html
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`✅ Email delivered via Resend HTTP API to ${to} (ID: ${data.id})`);
            return true;
        } else {
            console.warn("⚠️ Resend notice:", data.message || data);
            return false;
        }
    } catch (e) {
        console.warn("⚠️ Resend network error:", e.message);
        return false;
    }
};

const sendViaBrevo = async ({ to, subject, html }) => {
    const brevoKey = process.env.BREVO_API_KEY;
    if (!brevoKey) return false;

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": brevoKey,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                sender: {
                    name: "SkillForge Security",
                    email: process.env.EMAIL_USER || "skillforge.noreply@gmail.com"
                },
                replyTo: {
                    name: "SkillForge Security",
                    email: process.env.EMAIL_USER || "skillforge.noreply@gmail.com"
                },
                to: [{ email: to }],
                subject,
                htmlContent: html
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`✅ Email delivered via Brevo HTTPS API to ${to} (MessageID: ${data.messageId})`);
            return true;
        } else {
            console.warn("⚠️ Brevo notice:", data.message || data);
            return false;
        }
    } catch (e) {
        console.warn("⚠️ Brevo network error:", e.message);
        return false;
    }
};

const generateOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

const hashValue = (value) => {
    return crypto.createHash('sha256').update(value.toString().trim()).digest('hex');
};

const sendOtpEmail = async ({ to, name, otp }) => {
    const senderEmail = process.env.EMAIL_USER || "skillforge.noreply@gmail.com";
    const subject = `SkillForge - ${otp} is your verification code`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SkillForge Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #1f2937;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #3b82f6;">Skill<span style="color: #60a5fa;">Forge</span></h1>
                      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">Secure Engineering Workspace</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 36px 32px;">
                      <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">Verify Your Email Address</h2>
                      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                        Hello <strong style="color: #f1f5f9;">${name ? name : 'Developer'}</strong>,<br/>
                        Welcome to SkillForge. Enter the following 6-digit verification code to complete your registration and activate your developer sandbox:
                      </p>

                      <!-- OTP Box -->
                      <div style="background-color: #0b0f19; border: 2px dashed #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
                        <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #60a5fa; display: inline-block;">
                          ${otp}
                        </span>
                        <div style="margin-top: 10px; font-size: 12px; color: #64748b; font-weight: 500;">
                          Valid for <strong>10 minutes</strong> &bull; Do not share this code
                        </div>
                      </div>

                      <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                        If you did not initiate this request, you can safely ignore this email. Your account remains protected.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 32px; background-color: #0b0f19; border-top: 1px solid #1f2937; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                        &copy; ${new Date().getFullYear()} SkillForge Platform. Encrypted with SHA-256 OTP verification.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
    `;

    // Asynchronously dispatch email without blocking client response
    (async () => {
        let sent = await sendViaBrevo({ to, subject, html });
        if (!sent) sent = await sendViaResend({ to, subject, html });
        if (!sent) {
            const transporter = getTransporter();
            if (transporter) {
                try {
                    await transporter.sendMail({
                        from: `"SkillForge Security" <${senderEmail}>`,
                        to,
                        subject,
                        html
                    });
                    sent = true;
                } catch (mailError) {
                    console.warn("⚠️ SMTP delivery note:", mailError.message);
                }
            }
        }

        // Development fallback log
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🔑 [DEV/FALLBACK] VERIFICATION OTP FOR ${to}: ${otp}`);
        }
    })().catch(err => console.error("OTP Email dispatch error:", err));
};

/**
 * Creates and persists a new authenticated session with Refresh Token Rotation (RTR)
 */
const createSession = async ({ user, ip = 'unknown', userAgent = 'unknown', familyId = null }) => {
    // 1. Generate access token
    const accessToken = jwt.sign(
        { id: user._id, role: user.role, name: user.name, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // 2. Generate opaque, cryptographically random refresh token (64 bytes hex)
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = hashValue(rawRefreshToken);
    const family = familyId || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // 3. Attach session to user, pruning old revoked sessions
    if (!user.refreshTokens) {
        user.refreshTokens = [];
    }

    // Keep only active tokens or tokens revoked in the last 24h (for reuse detection)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    user.refreshTokens = user.refreshTokens.filter(t => {
        return !t.isRevoked || (t.createdAt && new Date(t.createdAt).getTime() > cutoff);
    });

    user.refreshTokens.push({
        tokenHash,
        family,
        userAgent,
        ip,
        expiresAt,
        isRevoked: false,
        createdAt: new Date()
    });

    await user.save();

    return {
        accessToken,
        refreshToken: rawRefreshToken,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
};

/**
 * User Registration with password complexity validation and OTP verification
 */
const registerUser = async ({ name, role, email, password, ip = 'unknown', userAgent = 'unknown' }) => {
    const trimmedName = (name || "").trim();
    if (!trimmedName || trimmedName.length < 2) {
        throw new Error("Full name must be at least 2 characters long.");
    }
    if (trimmedName.length > 60) {
        throw new Error("Full name cannot exceed 60 characters.");
    }

    const normalizedEmail = (email || "").toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        throw new Error("Please enter a valid email address.");
    }

    // Validate password complexity
    validatePasswordComplexity(password);

    const validRoles = ["student", "instructor"];
    const userRole = validRoles.includes(role) ? role : "student";

    const existingUser = await User.findOne({ email: normalizedEmail }).select("+otpLastSentAt +password");
    const otp = generateOtp();
    const hashedOtp = hashValue(otp);
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    if (existingUser) {
        if (existingUser.isEmailVerified) {
            logSecurityEvent({
                event: 'SIGNUP_DUPLICATE_EMAIL_ATTEMPT',
                email: normalizedEmail,
                ip,
                userAgent,
                status: 400
            });
            throw new Error("An account with this email address already exists. Please log in.");
        }

        // Update details for unverified account & re-issue OTP
        const hashed = await bcrypt.hash(password, 12);
        existingUser.name = trimmedName;
        existingUser.role = userRole;
        existingUser.password = hashed;
        existingUser.otpHash = hashedOtp;
        existingUser.otpExpiry = otpExpiry;
        existingUser.otpAttempts = 0;
        existingUser.otpLastSentAt = new Date();
        await existingUser.save();

        await sendOtpEmail({ to: normalizedEmail, name: trimmedName, otp });

        logSecurityEvent({
            event: 'UNVERIFIED_ACCOUNT_RE_REGISTERED',
            userId: existingUser._id,
            email: normalizedEmail,
            ip,
            userAgent,
            status: 200
        });

        return {
            requiresOtp: true,
            email: normalizedEmail,
            message: "A verification code has been sent to your email."
        };
    }

    const hashed = await bcrypt.hash(password, 12);
    const newUser = await User.create({
        name: trimmedName,
        role: userRole,
        email: normalizedEmail,
        password: hashed,
        isEmailVerified: false,
        otpHash: hashedOtp,
        otpExpiry: otpExpiry,
        otpAttempts: 0,
        otpLastSentAt: new Date()
    });

    await sendOtpEmail({ to: normalizedEmail, name: trimmedName, otp });

    logSecurityEvent({
        event: 'USER_REGISTERED_PENDING_VERIFICATION',
        userId: newUser._id,
        email: normalizedEmail,
        ip,
        userAgent,
        status: 200
    });

    return {
        requiresOtp: true,
        email: normalizedEmail,
        message: "A verification code has been sent to your email."
    };
};

/**
 * OTP Verification with attempt limits and timing attack defense
 */
const verifyOtp = async ({ email, otp, ip = 'unknown', userAgent = 'unknown' }) => {
    const normalizedEmail = (email || "").toLowerCase().trim();
    const cleanOtp = (otp || "").toString().trim();

    if (!normalizedEmail) {
        throw new Error("Email is required.");
    }
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
        throw new Error("Please enter a valid 6-digit verification code.");
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+otpHash +otpExpiry +otpAttempts +otpLastSentAt +refreshTokens");
    if (!user) {
        throw new Error("No account found with this email address.");
    }

    if (user.isEmailVerified) {
        const session = await createSession({ user, ip, userAgent });
        return {
            ...session,
            message: "Email is already verified."
        };
    }

    if ((user.otpAttempts || 0) >= 5) {
        logSecurityEvent({
            event: 'OTP_MAX_ATTEMPTS_EXCEEDED',
            userId: user._id,
            email: normalizedEmail,
            ip,
            userAgent,
            status: 400
        });
        throw new Error("Too many failed attempts. Please request a new verification code.");
    }

    if (!user.otpExpiry || new Date(user.otpExpiry).getTime() < Date.now()) {
        throw new Error("Verification code has expired. Please request a new code.");
    }

    const inputHash = hashValue(cleanOtp);
    if (!user.otpHash || user.otpHash !== inputHash) {
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        await user.save();
        const remaining = Math.max(0, 5 - user.otpAttempts);
        logSecurityEvent({
            event: 'OTP_FAILED_ATTEMPT',
            userId: user._id,
            email: normalizedEmail,
            ip,
            userAgent,
            status: 400,
            details: { attempts: user.otpAttempts }
        });
        if (remaining === 0) {
            throw new Error("Invalid code. Maximum attempts reached. Please request a new code.");
        }
        throw new Error(`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
    }

    // Email Verified successfully
    user.isEmailVerified = true;
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    user.otpLastSentAt = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    await user.save();

    logSecurityEvent({
        event: 'EMAIL_VERIFIED_SUCCESSFULLY',
        userId: user._id,
        email: normalizedEmail,
        ip,
        userAgent,
        status: 200
    });

    return await createSession({ user, ip, userAgent });
};

/**
 * Resend OTP with strict cooldown enforcement
 */
const resendOtp = async ({ email, ip = 'unknown', userAgent = 'unknown' }) => {
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) {
        throw new Error("Email is required.");
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+otpHash +otpExpiry +otpAttempts +otpLastSentAt");
    if (!user) {
        throw new Error("No account found with this email address.");
    }

    if (user.isEmailVerified) {
        return {
            success: true,
            alreadyVerified: true,
            message: "Your email is already verified. You can sign in directly."
        };
    }

    const now = Date.now();
    if (user.otpLastSentAt) {
        const elapsedSeconds = Math.floor((now - new Date(user.otpLastSentAt).getTime()) / 1000);
        if (elapsedSeconds < OTP_RESEND_COOLDOWN_SEC) {
            const waitSeconds = OTP_RESEND_COOLDOWN_SEC - elapsedSeconds;
            throw new Error(`Please wait ${waitSeconds}s before requesting another verification code.`);
        }
    }

    const otp = generateOtp();
    user.otpHash = hashValue(otp);
    user.otpExpiry = new Date(now + OTP_EXPIRY_MS);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date(now);
    await user.save();

    await sendOtpEmail({ to: user.email, name: user.name, otp });

    logSecurityEvent({
        event: 'OTP_RESENT',
        userId: user._id,
        email: normalizedEmail,
        ip,
        userAgent,
        status: 200
    });

    return {
        success: true,
        message: "A fresh verification code has been sent to your email."
    };
};

/**
 * User Login with Brute-Force Lockout Defense & RTR
 */
const loginUser = async ({ email, password, ip = 'unknown', userAgent = 'unknown' }) => {
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail || !password) {
        throw new Error("Please enter both your email address and password.");
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password +otpLastSentAt +failedLoginAttempts +lockUntil +refreshTokens");
    
    // Prevent timing enumeration attack
    if (!user) {
        logSecurityEvent({
            event: 'LOGIN_FAILED_NONEXISTENT_USER',
            email: normalizedEmail,
            ip,
            userAgent,
            status: 400
        });
        // Run dummy hash comparison to prevent timing side-channel
        await bcrypt.compare(password, "$2b$12$e80yqR3X8024N5m8jU39.eqF1f0O5K3hQ40Oq5q3/N882U0N6y02m");
        throw new Error("Invalid email or password.");
    }

    // Check Account Lockout
    if (user.isLocked()) {
        const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
        logSecurityEvent({
            event: 'LOGIN_ATTEMPT_LOCKED_ACCOUNT',
            userId: user._id,
            email: normalizedEmail,
            ip,
            userAgent,
            status: 403,
            details: { remainingMinutes }
        });
        throw new Error(`Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`);
    }

    // Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
            user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            await user.save();

            logSecurityEvent({
                event: 'ACCOUNT_LOCKED_BRUTE_FORCE',
                userId: user._id,
                email: normalizedEmail,
                ip,
                userAgent,
                status: 403,
                details: { attempts: user.failedLoginAttempts }
            });

            throw new Error("Account has been temporarily locked for 15 minutes due to 5 consecutive failed login attempts.");
        }

        await user.save();

        logSecurityEvent({
            event: 'LOGIN_FAILED_WRONG_PASSWORD',
            userId: user._id,
            email: normalizedEmail,
            ip,
            userAgent,
            status: 400,
            details: { attempts: user.failedLoginAttempts }
        });

        const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts);
        throw new Error(`Invalid email or password. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining before temporary lockout.`);
    }

    // Password is valid: Reset failed attempts
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    // Check if email is verified
    if (user.isEmailVerified === false) {
        const now = Date.now();
        const lastSent = user.otpLastSentAt ? new Date(user.otpLastSentAt).getTime() : 0;
        let sentNew = false;
        if (now - lastSent > OTP_RESEND_COOLDOWN_SEC * 1000) {
            const otp = generateOtp();
            user.otpHash = hashValue(otp);
            user.otpExpiry = new Date(now + OTP_EXPIRY_MS);
            user.otpAttempts = 0;
            user.otpLastSentAt = new Date(now);
            await user.save();
            await sendOtpEmail({ to: user.email, name: user.name, otp });
            sentNew = true;
        }

        return {
            requiresOtp: true,
            email: user.email,
            message: sentNew 
                ? "Your email is not verified. A verification code has been sent to your email." 
                : "Your email is not verified. Please enter the verification code sent to your email."
        };
    }

    // Record login telemetry
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    await user.save();

    logSecurityEvent({
        event: 'LOGIN_SUCCESS',
        userId: user._id,
        email: normalizedEmail,
        ip,
        userAgent,
        status: 200
    });

    return await createSession({ user, ip, userAgent });
};

/**
 * Refresh Token Rotation (RTR) with Token Reuse / Replay Attack Detection
 */
const rotateRefreshToken = async ({ incomingRefreshToken, ip = 'unknown', userAgent = 'unknown' }) => {
    if (!incomingRefreshToken || typeof incomingRefreshToken !== 'string') {
        throw new Error("Refresh token is required.");
    }

    const tokenHash = hashValue(incomingRefreshToken);

    // Find user who owns this refresh token in active or revoked sessions
    const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash }).select('+refreshTokens');
    
    if (!user) {
        // Fallback: check legacy JWT format refresh token for backward compatibility
        try {
            const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_SECRET + "_REFRESH");
            const legacyUser = await User.findById(decoded.id).select('+refreshTokens');
            if (legacyUser) {
                logSecurityEvent({
                    event: 'LEGACY_REFRESH_TOKEN_UPGRADED',
                    userId: legacyUser._id,
                    ip,
                    userAgent,
                    status: 200
                });
                return await createSession({ user: legacyUser, ip, userAgent });
            }
        } catch (e) {
            // Not a valid legacy JWT either
        }

        logSecurityEvent({
            event: 'REFRESH_TOKEN_NOT_FOUND',
            ip,
            userAgent,
            status: 403
        });
        throw new Error("Invalid or expired session. Please sign in again.");
    }

    const sessionObj = user.refreshTokens.find(t => t.tokenHash === tokenHash);
    if (!sessionObj) {
        throw new Error("Session not found.");
    }

    // REPLAY ATTACK / TOKEN REUSE DETECTION
    // If a token that was ALREADY revoked is presented, an attacker has stolen and reused a token!
    if (sessionObj.isRevoked) {
        // Revoke ALL tokens in this family (or for this user) immediately!
        user.refreshTokens.forEach(t => {
            if (t.family === sessionObj.family) {
                t.isRevoked = true;
            }
        });
        await user.save();

        logSecurityEvent({
            event: 'TOKEN_REUSE_DETECTED_POSSIBLE_THEFT',
            userId: user._id,
            email: user.email,
            ip,
            userAgent,
            status: 403,
            details: { family: sessionObj.family }
        });

        throw new Error("Security Alert: Invalid session state detected. All active sessions have been terminated. Please sign in again.");
    }

    // Check expiration
    if (new Date(sessionObj.expiresAt).getTime() < Date.now()) {
        sessionObj.isRevoked = true;
        await user.save();
        throw new Error("Session has expired. Please sign in again.");
    }

    // Mark current token as revoked (used)
    sessionObj.isRevoked = true;

    // Issue new session in the same token family
    const newSession = await createSession({
        user,
        ip,
        userAgent,
        familyId: sessionObj.family
    });

    logSecurityEvent({
        event: 'TOKEN_ROTATED_SUCCESSFULLY',
        userId: user._id,
        email: user.email,
        ip,
        userAgent,
        status: 200
    });

    return newSession;
};

/**
 * Revoke specific refresh token (Single Session Logout)
 */
const revokeSession = async ({ refreshToken, userId }) => {
    if (!refreshToken) return;
    const tokenHash = hashValue(refreshToken);

    const user = await User.findOne({
        ...(userId ? { _id: userId } : {}),
        'refreshTokens.tokenHash': tokenHash
    }).select('+refreshTokens');

    if (user) {
        const session = user.refreshTokens.find(t => t.tokenHash === tokenHash);
        if (session) {
            session.isRevoked = true;
            await user.save();
        }
    }
};

/**
 * Revoke ALL active sessions for a user (Global Logout)
 */
const revokeAllSessions = async ({ userId, ip = 'unknown', userAgent = 'unknown' }) => {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) {
        throw new Error("User not found.");
    }

    if (user.refreshTokens && user.refreshTokens.length > 0) {
        user.refreshTokens.forEach(t => {
            t.isRevoked = true;
        });
    }

    // Update passwordChangedAt to invalidate all outstanding JWT access tokens
    user.passwordChangedAt = new Date();
    await user.save();

    logSecurityEvent({
        event: 'LOGOUT_ALL_SESSIONS',
        userId: user._id,
        email: user.email,
        ip,
        userAgent,
        status: 200
    });

    return { success: true, message: "Logged out from all devices successfully." };
};

/**
 * Change Password for Authenticated User
 */
const changePassword = async ({ userId, currentPassword, newPassword, confirmPassword, ip = 'unknown', userAgent = 'unknown' }) => {
    if (!currentPassword || !newPassword) {
        throw new Error("Current password and new password are required.");
    }

    if (newPassword !== confirmPassword) {
        throw new Error("New password and confirmation do not match.");
    }

    if (currentPassword === newPassword) {
        throw new Error("New password cannot be the same as your current password.");
    }

    validatePasswordComplexity(newPassword);

    const user = await User.findById(userId).select('+password +refreshTokens');
    if (!user) {
        throw new Error("User not found.");
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
        logSecurityEvent({
            event: 'PASSWORD_CHANGE_WRONG_CURRENT_PASSWORD',
            userId: user._id,
            email: user.email,
            ip,
            userAgent,
            status: 400
        });
        throw new Error("The current password you entered is incorrect.");
    }

    const hashedNew = await bcrypt.hash(newPassword, 12);
    user.password = hashedNew;
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    // Revoke all existing sessions
    if (user.refreshTokens) {
        user.refreshTokens.forEach(t => { t.isRevoked = true; });
    }

    await user.save();

    logSecurityEvent({
        event: 'PASSWORD_CHANGED_SUCCESSFULLY',
        userId: user._id,
        email: user.email,
        ip,
        userAgent,
        status: 200
    });

    // Create fresh session for current device
    const freshSession = await createSession({ user, ip, userAgent });

    return {
        success: true,
        message: "Your password has been changed successfully.",
        ...freshSession
    };
};

/**
 * Forgot Password Request with Anti-User Enumeration
 */
const forgotPassword = async ({ email, ip = 'unknown', userAgent = 'unknown' }) => {
    const genericResponse = {
        success: true,
        message: "If an account with this email exists, password reset instructions have been sent."
    };

    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) {
        return genericResponse;
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
        logSecurityEvent({
            event: 'FORGOT_PASSWORD_NONEXISTENT_EMAIL',
            email: normalizedEmail,
            ip,
            userAgent,
            status: 200
        });
        return genericResponse;
    }

    // Generate cryptographically secure random token (64 hex characters)
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashValue(token);
    const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

    user.resetTokens = (user.resetTokens || []).filter(t => t.expiry && new Date(t.expiry) > new Date());
    user.resetTokens.push({ tokenHash: hashedToken, expiry: new Date(expiry) });
    user.resetToken = hashedToken;
    user.resetTokenExpiry = expiry;
    await user.save();

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, '');
    const resetLink = `${frontendUrl}/auth/forgot-password/${token}?email=${encodeURIComponent(user.email)}`;
    const senderEmail = process.env.EMAIL_USER || "skillforge.noreply@gmail.com";

    const mailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #4F46E5; margin: 0; font-size: 24px; font-weight: 800;">SkillForge</h2>
            </div>
            <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Reset Your Password</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                We received a request to reset your password for your SkillForge account. Click the button below to choose a new password:
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="background-color: #4F46E5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
                This link will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely disregard this email.
            </p>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 11px; margin: 0; word-break: break-all;">
                Or copy this link: <a href="${resetLink}" style="color: #4F46E5;">${resetLink}</a>
            </p>
        </div>
    `;

    (async () => {
        let sent = await sendViaBrevo({ to: user.email, subject: "SkillForge - Password Reset Request", html: mailHtml });
        if (!sent) sent = await sendViaResend({ to: user.email, subject: "SkillForge - Password Reset Request", html: mailHtml });
        if (!sent) {
            const transporter = getTransporter();
            if (transporter) {
                try {
                    await transporter.sendMail({
                        from: `"SkillForge Support" <${senderEmail}>`,
                        to: user.email,
                        subject: "SkillForge - Password Reset Request",
                        html: mailHtml
                    });
                    sent = true;
                } catch (e) {
                    console.warn("SMTP fallback error:", e.message);
                }
            }
        }
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🔗 [DEV/FALLBACK] RESET LINK FOR ${user.email}: ${resetLink}`);
        }
    })().catch(err => console.error("Forgot password email error:", err));

    logSecurityEvent({
        event: 'PASSWORD_RESET_DISPATCHED',
        userId: user._id,
        email: user.email,
        ip,
        userAgent,
        status: 200
    });

    return genericResponse;
};

/**
 * Validate Password Reset Token
 */
const forgotPasswordTokenCheck = async ({ token, email }) => {
    const normalizedEmail = (email || "").toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
        throw new Error("Password reset link is invalid or has expired.");
    }

    const shaHash = hashValue(token);
    const now = Date.now();

    const validInArray = (user.resetTokens || []).some(
        t => t.tokenHash === shaHash && new Date(t.expiry) > new Date(now)
    );

    if (validInArray || (user.resetToken === shaHash && user.resetTokenExpiry && new Date(user.resetTokenExpiry) > new Date(now))) {
        return { success: true, message: "Token valid, proceed to reset password" };
    }

    throw new Error("Password reset link is invalid or has expired. Please request a new one.");
};

/**
 * Complete Password Reset
 */
const resetPassword = async ({ email, token, password, ip = 'unknown', userAgent = 'unknown' }) => {
    if (!token) {
        throw new Error("Security reset token is required.");
    }

    validatePasswordComplexity(password);

    const normalizedEmail = (email || "").toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+refreshTokens');
    if (!user) {
        throw new Error("Password reset link is invalid or has expired.");
    }

    const shaHash = hashValue(token);
    const now = Date.now();

    const isValid = (user.resetTokens || []).some(
        t => t.tokenHash === shaHash && new Date(t.expiry) > new Date(now)
    ) || (user.resetToken === shaHash && user.resetTokenExpiry && new Date(user.resetTokenExpiry) > new Date(now));

    if (!isValid) {
        throw new Error("Invalid or expired security token. Please request a fresh reset link.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    user.resetTokens = [];
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    // Revoke all active sessions on password reset
    if (user.refreshTokens) {
        user.refreshTokens.forEach(t => { t.isRevoked = true; });
    }

    await user.save();

    logSecurityEvent({
        event: 'PASSWORD_RESET_SUCCESSFUL',
        userId: user._id,
        email: user.email,
        ip,
        userAgent,
        status: 200
    });

    return { success: true, message: "Password updated successfully! Please log in with your new password." };
};

/**
 * Get Active User Sessions
 */
const getUserSessions = async (userId, currentRefreshToken = null) => {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return [];

    const currentHash = currentRefreshToken ? hashValue(currentRefreshToken) : null;
    const now = Date.now();

    return (user.refreshTokens || [])
        .filter(t => !t.isRevoked && new Date(t.expiresAt).getTime() > now)
        .map(t => ({
            id: t._id,
            userAgent: t.userAgent || 'Unknown Device',
            ip: t.ip || 'Unknown IP',
            createdAt: t.createdAt,
            expiresAt: t.expiresAt,
            isCurrent: currentHash ? t.tokenHash === currentHash : false
        }));
};

module.exports = {
    validatePasswordComplexity,
    registerUser,
    loginUser,
    verifyOtp,
    resendOtp,
    rotateRefreshToken,
    revokeSession,
    revokeAllSessions,
    changePassword,
    forgotPassword,
    forgotPasswordTokenCheck,
    resetPassword,
    getUserSessions
};
