const http = require('http');

const API_BASE = "http://localhost:3000";

const makeRequest = (path, method = "GET", body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const reqHeaders = {
            "Content-Type": "application/json",
            ...headers
        };

        const postData = body ? JSON.stringify(body) : null;
        if (postData) {
            reqHeaders["Content-Length"] = Buffer.byteLength(postData);
        }

        const req = http.request(url, {
            method,
            headers: reqHeaders
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    parsed = data;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });

        req.on("error", reject);
        if (postData) req.write(postData);
        req.end();
    });
};

const runSecurityTests = async () => {
    console.log("=================================================================");
    console.log("🔒 SKILLFORGE ENTERPRISE AUTHENTICATION & SECURITY TEST SUITE");
    console.log("=================================================================\n");

    let passed = 0;
    let failed = 0;

    const assertTest = (name, condition, details = "") => {
        if (condition) {
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name} ${details ? '- ' + details : ''}`);
            failed++;
        }
    };

    try {
        // Test 1: Health check & security headers
        console.log("--- 1. HTTP Security Headers & Health ---");
        const health = await makeRequest("/health");
        assertTest("Health endpoint returns status 200", health.status === 200);
        assertTest("Helmet X-Powered-By is disabled", !health.headers['x-powered-by']);
        assertTest("HSTS header is present", Boolean(health.headers['strict-transport-security']));
        assertTest("X-Content-Type-Options is nosniff", health.headers['x-content-type-options'] === 'nosniff');

        // Test 2: Password Complexity Enforcement (NIST / OWASP)
        console.log("\n--- 2. NIST/OWASP Password Complexity Validation ---");
        const weakPass1 = await makeRequest("/auth/signup", "POST", {
            name: "Test User",
            email: `sec_test_${Date.now()}@example.com`,
            password: "weak", // < 8 chars
            role: "student"
        });
        assertTest("Rejects password under 8 characters", weakPass1.status === 400 && weakPass1.body.message.includes("8 characters"));

        const weakPass2 = await makeRequest("/auth/signup", "POST", {
            name: "Test User",
            email: `sec_test_${Date.now()}@example.com`,
            password: "alllowercase123!",
            role: "student"
        });
        assertTest("Rejects password missing uppercase letter", weakPass2.status === 400 && weakPass2.body.message.includes("uppercase"));

        const weakPass3 = await makeRequest("/auth/signup", "POST", {
            name: "Test User",
            email: `sec_test_${Date.now()}@example.com`,
            password: "NoSpecialChar123",
            role: "student"
        });
        assertTest("Rejects password missing special character", weakPass3.status === 400 && weakPass3.body.message.includes("special character"));

        // Test 3: Valid Registration Flow
        console.log("\n--- 3. Secure Registration & OTP Verification Flow ---");
        const testEmail = `developer_${Date.now()}@skillforge.dev`;
        const testPassword = "SuperSecure#2026!Key";

        const signupRes = await makeRequest("/auth/signup", "POST", {
            name: "Security Tester",
            email: testEmail,
            password: testPassword,
            role: "student"
        });
        assertTest("Signup requires OTP and does not leak plain token without verification", 
            signupRes.status === 200 && signupRes.body.requiresOtp === true
        );

        // Test 4: Anti-User Enumeration in Password Recovery
        console.log("\n--- 4. Anti-User Enumeration Protection ---");
        const forgotNonExistent = await makeRequest("/auth/forgot-password", "POST", {
            email: "non_existent_random_user_99999@skillforge.dev"
        });
        const forgotExisting = await makeRequest("/auth/forgot-password", "POST", {
            email: testEmail
        });
        assertTest("Forgot-password returns identical success message for non-existent vs existing emails",
            forgotNonExistent.status === 200 && 
            forgotExisting.status === 200 &&
            forgotNonExistent.body.message === forgotExisting.body.message
        );

        // Test 5: Protect Middleware Rejection
        console.log("\n--- 5. Protect Middleware Access Control ---");
        const noToken = await makeRequest("/auth/me", "GET");
        assertTest("Rejects unauthenticated requests with 401 Unauthorized", noToken.status === 401);

        const malformedToken = await makeRequest("/auth/me", "GET", null, {
            "Authorization": "Bearer this.is.an.invalid.token"
        });
        assertTest("Rejects malformed tokens with 401 Unauthorized", malformedToken.status === 401);

        // Test 6: Brute Force & Account Lockout Defense
        console.log("\n--- 6. Account Lockout & Brute-Force Defense ---");
        // We will test consecutive failed login attempts on a verified user
        // Let's create and verify a dedicated user in DB directly or test with invalid password
        const bruteEmail = `bruteforce_target_${Date.now()}@skillforge.dev`;
        const User = require('../models/user');
        const bcrypt = require('bcrypt');
        const mongoose = require('mongoose');

        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority");
        }

        const hashed = await bcrypt.hash("InitialP@ssw0rd!123", 12);
        const targetUser = await User.create({
            name: "Brute Force Target",
            email: bruteEmail,
            password: hashed,
            isEmailVerified: true
        });

        console.log(`   Simulating 5 consecutive bad password attempts for ${bruteEmail}...`);
        let lastAttempt = null;
        for (let i = 1; i <= 5; i++) {
            lastAttempt = await makeRequest("/auth/login", "POST", {
                email: bruteEmail,
                password: "WrongPassword!999"
            });
        }

        assertTest("5th failed login attempt triggers account lockout", 
            lastAttempt.status === 403 && lastAttempt.body.message.includes("temporarily locked")
        );

        // 6th attempt while locked
        const attemptWhileLocked = await makeRequest("/auth/login", "POST", {
            email: bruteEmail,
            password: "InitialP@ssw0rd!123" // even with right password
        });
        assertTest("Rejects even correct password while account is in lockout period", 
            attemptWhileLocked.status === 403 && attemptWhileLocked.body.message.includes("temporarily locked")
        );

        // Test 7: Refresh Token Rotation (RTR) & Replay Attack Defense
        console.log("\n--- 7. Refresh Token Rotation (RTR) & Replay Detection ---");
        // Unlock user for session tests using updateOne so password is preserved
        await User.updateOne({ email: bruteEmail }, {
            $set: { failedLoginAttempts: 0 },
            $unset: { lockUntil: 1 }
        });

        const loginRes = await makeRequest("/auth/login", "POST", {
            email: bruteEmail,
            password: "InitialP@ssw0rd!123"
        });
        if (loginRes.status !== 200) {
            console.log("   [DEBUG LOGIN FAIL]:", loginRes.status, loginRes.body);
        }
        assertTest("Successful login returns access token and refresh token", 
            loginRes.status === 200 && Boolean(loginRes.body.token) && Boolean(loginRes.body.refreshToken)
        );

        const initialToken = loginRes.body.token;
        const initialRefreshToken = loginRes.body.refreshToken;

        // Verify /auth/me works with valid access token
        const meRes = await makeRequest("/auth/me", "GET", null, {
            "Authorization": `Bearer ${initialToken}`
        });
        assertTest("Access token authenticates successfully on /auth/me", 
            meRes.status === 200 && meRes.body.user.email === bruteEmail
        );

        // Perform token refresh (Rotation)
        const refreshRes1 = await makeRequest("/auth/refresh", "POST", {
            refreshToken: initialRefreshToken
        });
        assertTest("Token rotation issues fresh access token and new refresh token", 
            refreshRes1.status === 200 && 
            Boolean(refreshRes1.body.token) && 
            Boolean(refreshRes1.body.refreshToken) &&
            refreshRes1.body.refreshToken !== initialRefreshToken
        );

        const newRefreshToken = refreshRes1.body.refreshToken;

        // REPLAY ATTACK: Re-use the already-rotated initialRefreshToken!
        console.log("   Simulating replay attack: presenting already-revoked refresh token...");
        const replayAttack = await makeRequest("/auth/refresh", "POST", {
            refreshToken: initialRefreshToken
        });
        assertTest("Replay attack detected: already-used refresh token is rejected", 
            replayAttack.status === 403
        );

        // Token reuse detection should have invalidated ALL tokens in the family!
        console.log("   Verifying reuse detection: family-wide invalidation triggered...");
        const newRefreshAttempt = await makeRequest("/auth/refresh", "POST", {
            refreshToken: newRefreshToken
        });
        assertTest("Entire token family is terminated after reuse detection", 
            newRefreshAttempt.status === 403
        );

        // Test 8: Password Change & Session Invalidation
        console.log("\n--- 8. Password Change & Token Invalidation ---");
        // Log in fresh
        const freshLogin = await makeRequest("/auth/login", "POST", {
            email: bruteEmail,
            password: "InitialP@ssw0rd!123"
        });
        const currentToken = freshLogin.body.token;

        // Ensure currentToken.iat is at least 1 second prior to password change
        await new Promise(r => setTimeout(r, 1100));

        const changeRes = await makeRequest("/auth/change-password", "POST", {
            currentPassword: "InitialP@ssw0rd!123",
            newPassword: "BrandNew#SecurePass2026",
            confirmPassword: "BrandNew#SecurePass2026"
        }, {
            "Authorization": `Bearer ${currentToken}`
        });
        assertTest("Password changed successfully", changeRes.status === 200 && changeRes.body.success === true);

        // Old token should now be rejected by protect.js because passwordChangedAt > token.iat
        const oldTokenCheck = await makeRequest("/auth/me", "GET", null, {
            "Authorization": `Bearer ${currentToken}`
        });
        assertTest("Old access token issued prior to password change is rejected", 
            oldTokenCheck.status === 401 && oldTokenCheck.body.message.includes("Password was recently changed")
        );

        // Cleanup test user
        await User.deleteOne({ email: bruteEmail });
        await User.deleteOne({ email: testEmail });

        console.log("\n=================================================================");
        console.log(`🎯 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log("=================================================================\n");

        process.exit(failed > 0 ? 1 : 0);
    } catch (err) {
        console.error("Test execution error:", err);
        process.exit(1);
    }
};

runSecurityTests();
