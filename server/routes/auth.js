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

    router.get('/me', (req, res) => {
        if (req.session && req.session.user) {
            return res.json({ user: req.session.user });
        }
        return res.status(401).json({ message: 'Not authenticated' });
    });

    return router;
}

module.exports = createAuthRoutes;
