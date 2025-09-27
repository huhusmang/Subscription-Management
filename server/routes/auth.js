const express = require('express');
const bcrypt = require('bcryptjs');
const { createAdminUserManager } = require('../config/authCredentials');

function createAuthRoutes(db) {
    const router = express.Router();
    const adminUserManager = createAdminUserManager(db);

    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body || {};
            if (!username || !password) {
                return res.status(400).json({ message: 'Username and password are required' });
            }

            const adminUser = await adminUserManager.ensureAdminUser();

            if (!adminUser || adminUser.username !== username) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const ok = await bcrypt.compare(password, adminUser.password_hash);
            if (!ok) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            await adminUserManager.recordSuccessfulLogin();

            req.session.user = { username: adminUser.username, role: adminUser.role };
            return res.json({ message: 'Logged in' });
        } catch (err) {
            return res.status(500).json({ message: 'Login failed' });
        }
    });

    router.post('/logout', (req, res) => {
        if (req.session) {
            req.session.destroy(() => {
                res.clearCookie('sid');
                return res.json({ message: 'Logged out' });
            });
        } else {
            return res.json({ message: 'Logged out' });
        }
    });

    router.post('/change-password', async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
            }

            const { currentPassword, newPassword, confirmPassword } = req.body || {};

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ message: 'Current password and new password are required', code: 'MISSING_FIELDS' });
            }

            if (confirmPassword !== undefined && newPassword !== confirmPassword) {
                return res.status(400).json({ message: 'Passwords do not match', code: 'PASSWORDS_DO_NOT_MATCH' });
            }

            const complexityRule = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
            if (!complexityRule.test(newPassword)) {
                return res.status(400).json({ message: 'Password does not meet security requirements', code: 'PASSWORD_COMPLEXITY_FAILED' });
            }

            const adminUser = await adminUserManager.ensureAdminUser();

            if (!adminUser || adminUser.username !== req.session.user.username) {
                return res.status(403).json({ message: 'Forbidden', code: 'FORBIDDEN' });
            }

            const currentPasswordValid = await bcrypt.compare(currentPassword, adminUser.password_hash);

            if (!currentPasswordValid) {
                return res.status(400).json({ message: 'Current password is incorrect', code: 'CURRENT_PASSWORD_INVALID' });
            }

            const sameAsOld = await bcrypt.compare(newPassword, adminUser.password_hash);
            if (sameAsOld) {
                return res.status(400).json({ message: 'New password must be different from the current password', code: 'PASSWORD_SAME_AS_OLD' });
            }

            const newHash = adminUserManager.setAdminPassword({ password: newPassword });

            process.env.ADMIN_PASSWORD_HASH = newHash;
            delete process.env.ADMIN_PASSWORD;

            return res.json({ message: 'Password updated successfully' });
        } catch (err) {
            return res.status(500).json({ message: 'Failed to update password', code: 'UNKNOWN_ERROR' });
        }
    });

    router.get('/me', (req, res) => {
        if (req.session && req.session.user) {
            return res.json({ user: req.session.user });
        }
        return res.status(401).json({ message: 'Not authenticated' });
    });

    return router;
}

module.exports = createAuthRoutes;
