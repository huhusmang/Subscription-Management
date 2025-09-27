const Database = require('better-sqlite3');
const config = require('../config');
const DatabaseMigrations = require('./migrations');
const { createAdminUserManager } = require('../config/authCredentials');

const dbPath = config.getDatabasePath();

console.log('🔄 Initializing database...');
console.log('📂 Database path:', dbPath);

async function initializeDatabase() {
    try {
        // Ensure database directory exists
        config.ensureDatabaseDir();

        // Check if database file exists
        const dbExists = config.databaseExists();
        if (!dbExists) {
            console.log('📝 Creating new database file...');
        } else {
            console.log('📋 Database file exists, checking for migrations...');
        }

        // Run migrations to create/update database schema
        console.log('🔄 Running database migrations...');
        const migrations = new DatabaseMigrations(dbPath);
        await migrations.runMigrations();
        migrations.close();

        console.log('✅ Database schema is up to date!');

        const db = new Database(dbPath);
        try {
            const adminManager = createAdminUserManager(db);
            adminManager.bootstrapDefaultAdmin();
            console.log('✅ Admin user bootstrapped successfully.');
        } finally {
            db.close();
        }

        console.log('🎉 Database initialization completed successfully!');
        console.log('\n📊 Database is ready with all required tables and data.');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Run initialization if this script is executed directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;
