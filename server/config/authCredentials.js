const bcrypt = require('bcryptjs');

let cachedCredentials = null;

function getAdminCredentials() {
    if (cachedCredentials) {
        return cachedCredentials;
    }

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const configuredHash = process.env.ADMIN_PASSWORD_HASH;
    const plainPassword = process.env.ADMIN_PASSWORD;

    if (!configuredHash && !plainPassword) {
        console.error('❌ Missing admin password configuration. Set ADMIN_PASSWORD in your environment file.');
        process.exit(1);
    }

    let passwordHash = configuredHash;
    if (!passwordHash && plainPassword) {
        passwordHash = bcrypt.hashSync(plainPassword, 12);
        console.warn('⚠️  Generated ADMIN_PASSWORD_HASH from ADMIN_PASSWORD.');
        console.warn('   For better security, set ADMIN_PASSWORD_HASH to the value below and remove ADMIN_PASSWORD:');
        console.warn(`   ADMIN_PASSWORD_HASH=${passwordHash}`);
    }

    cachedCredentials = {
        username: adminUsername,
        passwordHash
    };

    return cachedCredentials;
}

module.exports = {
    getAdminCredentials,
};
