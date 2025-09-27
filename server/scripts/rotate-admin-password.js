#!/usr/bin/env node

const Database = require('better-sqlite3');
const config = require('../config');
const { createAdminUserManager } = require('../config/authCredentials');

function printUsage() {
    console.log('Usage: node server/scripts/rotate-admin-password.js [--password <newPassword> | --hash <bcryptHash>]');
    console.log('Options:');
    console.log('  --password, -p   Plain text password that will be hashed before storing');
    console.log('  --hash, -h       Pre-generated bcrypt hash to store directly');
    console.log('  --help           Show this message');
}

function parseArgs(argv) {
    const args = { password: undefined, hash: undefined, help: false };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--password':
            case '-p':
                args.password = argv[i + 1];
                i += 1;
                break;
            case '--hash':
            case '-h':
                args.hash = argv[i + 1];
                i += 1;
                break;
            case '--help':
                args.help = true;
                break;
            default:
                console.error(`Unknown argument: ${arg}`);
                args.help = true;
                break;
        }
    }

    return args;
}

function main() {
    const argv = process.argv.slice(2);
    const args = parseArgs(argv);

    if (args.help || ((!args.password || args.password.startsWith('--')) && (!args.hash || args.hash.startsWith('--')))) {
        printUsage();
        if (args.help) {
            process.exit(0);
        }
        process.exit(1);
    }

    if (args.password && args.hash) {
        console.error('Please provide either --password or --hash, not both.');
        process.exit(1);
    }

    const db = new Database(config.getDatabasePath());

    try {
        const adminManager = createAdminUserManager(db);
        adminManager.bootstrapDefaultAdmin();

        const newHash = adminManager.setAdminPassword({
            password: args.password,
            passwordHash: args.hash,
        });

        console.log('✅ Admin password updated successfully.');
        console.log(`🔐 Stored hash: ${newHash}`);

        if (args.password) {
            console.log('⚠️  Remember to update your ADMIN_PASSWORD_HASH environment variable with the new hash.');
        }
    } catch (error) {
        console.error('❌ Failed to rotate admin password:', error.message);
        process.exit(1);
    } finally {
        db.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
