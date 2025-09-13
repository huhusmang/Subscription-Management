const session = require('express-session');
const crypto = require('crypto');

function createSessionMiddleware() {
    let sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
        sessionSecret = crypto.randomBytes(32).toString('hex');
        process.env.SESSION_SECRET = sessionSecret;
        console.warn('SESSION_SECRET not set. Generated a temporary secret for this process. Sessions will be invalidated on restart.');
    }

    const isProduction = process.env.NODE_ENV === 'production';

    return session({
        name: 'sid',
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'lax' : 'lax',
            maxAge: 1000 * 60 * 60 * 12 // 12 hours
        }
    });
}

module.exports = { createSessionMiddleware };

