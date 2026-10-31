const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const BASE_URL = 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority";

async function runSettingsTestSuite() {
    console.log("=== SkillForge Developer Settings & Workspace Test Suite ===");
    let passed = 0;
    let failed = 0;

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI);
    }

    const testPassword = "Passw0rd!SettingsTest2026";
    const testEmail = `settings_user_${Date.now()}@example.com`;
    const hashedPassword = await bcrypt.hash(testPassword, 12);

    // Create a verified active user in DB
    const dbUser = await User.create({
        name: "Settings Engineer",
        username: `eng_${Date.now()}`,
        email: testEmail,
        password: hashedPassword,
        role: "student",
        isEmailVerified: true
    });

    let accessToken = "";

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            failed++;
        }
    }

    try {
        // Step 1: Sign in with the verified user
        console.log("\n[1] Authenticating verified test user...");
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: testEmail,
            password: testPassword
        });
        assert(loginRes.status === 200, "User logged in successfully");
        accessToken = loginRes.data.token;
        assert(Boolean(accessToken), "Received valid JWT access token");

        // Step 2: GET default settings
        console.log("\n[2] Testing GET /user/settings (Default Preferences)...");
        const getDefRes = await axios.get(`${BASE_URL}/user/settings`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        assert(getDefRes.status === 200, "Fetched default settings status 200");
        assert(getDefRes.data.settings?.editor?.fontSize === 13.5, "Editor font size defaults to 13.5");
        assert(getDefRes.data.settings?.ai?.copilotAutoSuggest === true, "AI Copilot autosuggest enabled by default");
        assert(getDefRes.data.settings?.privacy?.publicProfile === true, "Public profile defaults to true");

        // Step 3: PUT update settings
        console.log("\n[3] Testing PUT /user/settings (Customizing Preferences)...");
        const updatePayload = {
            editor: {
                fontSize: 16,
                fontFamily: "'JetBrains Mono', monospace",
                tabSize: 2,
                wordWrap: "off",
                theme: "vs-dark"
            },
            ai: {
                socraticMode: false,
                verbosity: "concise"
            },
            privacy: {
                publicProfile: false
            }
        };

        const updateRes = await axios.put(`${BASE_URL}/user/settings`, updatePayload, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        assert(updateRes.status === 200, "Updated settings status 200");
        assert(updateRes.data.settings.editor.fontSize === 16, "Editor font size updated to 16");
        assert(updateRes.data.settings.editor.tabSize === 2, "Tab size updated to 2");
        assert(updateRes.data.settings.ai.verbosity === "concise", "AI verbosity updated to concise");
        assert(updateRes.data.settings.privacy.publicProfile === false, "Public profile updated to false");

        // Step 4: GET settings again to verify persistence
        console.log("\n[4] Verifying persisted settings via GET /user/settings...");
        const getPersistedRes = await axios.get(`${BASE_URL}/user/settings`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        assert(getPersistedRes.data.settings.editor.fontFamily === "'JetBrains Mono', monospace", "Font family persisted");
        assert(getPersistedRes.data.settings.ai.socraticMode === false, "AI socratic mode persisted");
        assert(getPersistedRes.data.settings.notifications.securityAdvisories === true, "Security advisories forced enabled");

        // Step 5: GET Data Export (GDPR Portability)
        console.log("\n[5] Testing GET /user/settings/export (GDPR Export Archive)...");
        const exportRes = await axios.get(`${BASE_URL}/user/settings/export`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        assert(exportRes.status === 200, "Export data status 200");
        assert(exportRes.data.platform === "SkillForge Engineering Hub", "Export archive metadata valid");
        assert(exportRes.data.account.email === testEmail, "Exported account contains matching email");
        assert(exportRes.data.settings.editor.fontSize === 16, "Exported settings match updated preferences");
        assert(Array.isArray(exportRes.data.enrollments), "Export includes enrollments array");

        // Step 6: DELETE account with invalid password
        console.log("\n[6] Testing DELETE /user/settings/account with invalid password...");
        try {
            await axios.delete(`${BASE_URL}/user/settings/account`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                data: { password: "WrongPassword123!" }
            });
            assert(false, "Should have rejected deletion with wrong password");
        } catch (err) {
            assert(err.response?.status === 400, "Rejected account deletion with status 400 for incorrect password");
        }

        // Step 7: DELETE account with valid password
        console.log("\n[7] Testing DELETE /user/settings/account with valid password...");
        const deleteRes = await axios.delete(`${BASE_URL}/user/settings/account`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            data: { password: testPassword }
        });
        assert(deleteRes.status === 200, "Account deleted successfully with status 200");

        // Step 8: Verify access token is now invalid / user no longer exists
        console.log("\n[8] Verifying deleted user cannot access protected /user/settings...");
        try {
            await axios.get(`${BASE_URL}/user/settings`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            assert(false, "Should have rejected request from deleted user");
        } catch (err) {
            assert(err.response?.status === 401, "Rejected request from deleted user with 401 Unauthorized");
        }

    } catch (error) {
        console.error("Test execution failed:", error.response?.data || error.message);
        failed++;
    } finally {
        await mongoose.disconnect();
    }

    console.log("\n==================================================");
    console.log(`TOTAL PASSED: ${passed}`);
    console.log(`TOTAL FAILED: ${failed}`);
    console.log(`SUCCESS RATE: ${Math.round((passed / (passed + failed || 1)) * 100)}%`);
    console.log("==================================================");
    
    if (failed > 0) process.exit(1);
}

runSettingsTestSuite();
