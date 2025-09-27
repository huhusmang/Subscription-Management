const bcrypt = require('bcryptjs');
const UserService = require('../services/userService');
const logger = require('../utils/logger');

function hashAdminPassword(plainPassword) {
    if (!plainPassword) {
        throw new Error('Plain password is required to generate a hash');
    }
    return bcrypt.hashSync(plainPassword, 12);
}

function resolveAdminPasswordHashFromEnv() {
    const configuredHash = process.env.ADMIN_PASSWORD_HASH;
    const configuredPassword = process.env.ADMIN_PASSWORD;

    if (configuredHash) {
        return {
            passwordHash: configuredHash,
            source: 'hash',
        };
    }

    if (configuredPassword) {
        return {
            passwordHash: hashAdminPassword(configuredPassword),
            source: 'password',
        };
    }

    return {
        passwordHash: hashAdminPassword('admin'),
        source: 'default',
    };
}

function createAdminUserManager(db) {
    if (!db) {
        throw new Error('Database connection is required to create an admin user manager');
    }

    const userService = new UserService(db);
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';

    function getAdminUser() {
        return userService.getByUsername(adminUsername);
    }

    function ensureAdminUser() {
        let user = getAdminUser();
        if (user) {
            return user;
        }

        const { passwordHash, source } = resolveAdminPasswordHashFromEnv();

        const result = userService.createUser({
            username: adminUsername,
            password_hash: passwordHash,
            role: 'admin',
        });

        logger.info(`Seeded default admin user \`${adminUsername}\` using ${source === 'default' ? 'fallback' : source} credentials`);

        if (source === 'password') {
            logger.warn('Generated ADMIN_PASSWORD_HASH from ADMIN_PASSWORD.');
            logger.warn('Consider storing the generated hash and removing ADMIN_PASSWORD for improved security.');
        }

        if (!result || result.changes === 0) {
            throw new Error('Failed to seed default admin user');
        }

        return getAdminUser();
    }

    function bootstrapDefaultAdmin() {
        const user = ensureAdminUser();
        if (!user) {
            throw new Error('Unable to bootstrap admin user');
        }
        return user;
    }

    function setAdminPassword({ password, passwordHash }) {
        if (!password && !passwordHash) {
            throw new Error('Either password or passwordHash must be provided');
        }

        const newHash = passwordHash || hashAdminPassword(password);

        const existing = ensureAdminUser();
        if (!existing) {
            throw new Error('Admin user does not exist');
        }

        userService.updatePasswordHash(adminUsername, newHash);
        return newHash;
    }

    function recordSuccessfulLogin() {
        const existing = ensureAdminUser();
        if (!existing) {
            throw new Error('Admin user does not exist');
        }
        userService.recordLastLogin(adminUsername);
    }

    return {
        getAdminUser,
        ensureAdminUser,
        bootstrapDefaultAdmin,
        setAdminPassword,
        recordSuccessfulLogin,
    };
}

module.exports = {
    createAdminUserManager,
    resolveAdminPasswordHashFromEnv,
    hashAdminPassword,
};
