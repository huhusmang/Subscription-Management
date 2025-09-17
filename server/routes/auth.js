const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

const { getAdminCredentials } = require('../config/authCredentials');

// Resolve admin credentials once; module exits on missing config
const { username: ADMIN_USERNAME, passwordHash: ADMIN_PASSWORD_HASH } = getAdminCredentials();

async function verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
}

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        if (username !== ADMIN_USERNAME) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const ok = await verifyPassword(password, ADMIN_PASSWORD_HASH);
        if (!ok) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        req.session.user = { username: ADMIN_USERNAME, role: 'admin' };
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

module.exports = router;
