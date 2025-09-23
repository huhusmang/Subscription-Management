const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseMigrations {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.migrations = [
      {
        version: 1,
        name: 'initial_schema_consolidated',
        up: () => this.migration_001_initial_schema_consolidated()
      },
      {
        version: 2,
        name: 'add_notification_system',
        up: () => this.migration_002_add_notification_system()
      },
      {
        version: 3,
        name: 'add_hkd_currency_support',
        up: () => this.migration_003_add_hkd_currency_support()
      },
      {
        version: 4,
        name: 'add_email_notification_support',
        up: () => this.migration_004_add_email_notification_support()
      }
    ];
  }

  // Initialize migrations table
  initMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Get current database version
  getCurrentVersion() {
    try {
      const result = this.db.prepare('SELECT MAX(version) as version FROM migrations').get();
      return result.version || 0;
    } catch (error) {
      return 0;
    }
  }

  // Run all pending migrations
  async runMigrations() {
    console.log('🔄 Checking for database migrations...');

    // Set database pragmas first (outside transaction)
    console.log('📝 Setting database pragmas...');
    this.db.pragma('foreign_keys = ON');

    this.initMigrationsTable();
    const currentVersion = this.getCurrentVersion();

    console.log(`📊 Current database version: ${currentVersion}`);

    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date');
      return;
    }

    console.log(`🔄 Running ${pendingMigrations.length} pending migration(s)...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`⏳ Running migration ${migration.version}: ${migration.name}`);

        // Run migration in transaction
        this.db.transaction(() => {
          migration.up();
          this.db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
        })();

        console.log(`✅ Migration ${migration.version} completed`);
      } catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  }

  // Migration 001: Consolidated initial schema - Create all tables and data
  migration_001_initial_schema_consolidated() {
    console.log('📝 Creating consolidated database schema from schema.sql...');

    try {
      // Read and execute the schema.sql file
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

      // Remove comments and PRAGMA statements
      const cleanSQL = schemaSQL
        .split('\n')
        .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('PRAGMA'))
        .join('\n');

      // Split into statements more carefully, handling multi-line statements
      const statements = this.parseSQL(cleanSQL);

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            this.db.exec(statement);
          } catch (error) {
            // Log the problematic statement for debugging
            console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
            throw error;
          }
        }
      }



      console.log('✅ Consolidated schema created successfully from schema.sql');
    } catch (error) {
      console.error('❌ Error creating consolidated schema:', error.message);
      throw error;
    }
  }

  // Migration 002: Add notification system
  migration_002_add_notification_system() {
    console.log('📝 Adding notification system...');

    // Step 1: Add language preference to settings table
    console.log('📝 Adding language preference to settings...');
    try {
      this.db.exec(`
        ALTER TABLE settings ADD COLUMN language TEXT NOT NULL DEFAULT 'zh-CN'
        CHECK (language IN ('zh-CN', 'en', 'ja', 'ko', 'fr', 'de', 'es'));
      `);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Language column might already exist, continuing...');
    }

    // Step 2: Create notification system tables
    console.log('📝 Creating notification system tables...');

    // Create notification_settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_type TEXT NOT NULL UNIQUE CHECK (
          notification_type IN (
            'renewal_reminder', 'expiration_warning',
            'renewal_success', 'renewal_failure', 'subscription_change'
          )
        ),
        is_enabled BOOLEAN NOT NULL DEFAULT 1,
        advance_days INTEGER DEFAULT 7,
        repeat_notification BOOLEAN NOT NULL DEFAULT 0,
        notification_channels TEXT NOT NULL DEFAULT '["telegram"]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure legacy installations gain notification_channels column
    try {
      this.db.exec(`
        ALTER TABLE notification_settings
        ADD COLUMN notification_channels TEXT NOT NULL DEFAULT '["telegram"]'
      `);
    } catch (error) {
      // Column might already exist
      if (!/duplicate column name/i.test(error.message)) {
        console.log('⚠️  Unable to add notification_channels column:', error.message);
      }
    }

    // Create notification_channels table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_type TEXT NOT NULL UNIQUE CHECK (channel_type IN ('telegram', 'email')),
        channel_config TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create notification_history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id INTEGER NOT NULL,
        notification_type TEXT NOT NULL,
        channel_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
        recipient TEXT NOT NULL,
        message_content TEXT NOT NULL,
        error_message TEXT,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
      );
    `);

    // Step 3: Create scheduler settings table
    console.log('📝 Creating scheduler settings table...');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scheduler_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        notification_check_time TEXT NOT NULL DEFAULT '09:00',
        timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
        is_enabled BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Step 4: Create indexes for performance
    console.log('📝 Creating indexes...');
    this.db.exec(`
      -- Notification settings indexes
      CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(notification_type);
      CREATE INDEX IF NOT EXISTS idx_notification_settings_enabled ON notification_settings(is_enabled);

      -- Notification channels indexes
      CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON notification_channels(channel_type);
      CREATE INDEX IF NOT EXISTS idx_notification_channels_active ON notification_channels(is_active);

      -- Notification history indexes
      CREATE INDEX IF NOT EXISTS idx_notification_history_subscription ON notification_history(subscription_id);
      CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
      CREATE INDEX IF NOT EXISTS idx_notification_history_created ON notification_history(created_at);
    `);

    // Step 5: Create update triggers
    console.log('📝 Creating update triggers...');
    this.db.exec(`
      -- notification_settings update trigger
      CREATE TRIGGER IF NOT EXISTS notification_settings_updated_at
      AFTER UPDATE ON notification_settings
      FOR EACH ROW
      BEGIN
          UPDATE notification_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      -- notification_channels update trigger
      CREATE TRIGGER IF NOT EXISTS notification_channels_updated_at
      AFTER UPDATE ON notification_channels
      FOR EACH ROW
      BEGIN
          UPDATE notification_channels SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      -- scheduler_settings update trigger
      CREATE TRIGGER IF NOT EXISTS scheduler_settings_updated_at
      AFTER UPDATE ON scheduler_settings
      FOR EACH ROW
      BEGIN
          UPDATE scheduler_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // Step 6: Insert default settings
    console.log('📝 Inserting default settings...');
    this.db.exec(`
      -- Insert default notification settings
      INSERT OR IGNORE INTO notification_settings (notification_type, is_enabled, advance_days, repeat_notification, notification_channels) VALUES
      ('renewal_reminder', 1, 7, 1, '["telegram"]'),
      ('expiration_warning', 1, 0, 0, '["telegram"]'),
      ('renewal_success', 1, 0, 0, '["telegram"]'),
      ('renewal_failure', 1, 0, 0, '["telegram"]'),
      ('subscription_change', 1, 0, 0, '["telegram"]');

      -- Insert default scheduler settings
      INSERT OR IGNORE INTO scheduler_settings (id, notification_check_time, timezone, is_enabled)
      VALUES (1, '09:00', 'Asia/Shanghai', 1);
    `);

    console.log('✅ Notification system created successfully');
  }

  // Migration 003: Add HKD currency support
  migration_003_add_hkd_currency_support() {
    console.log('📝 Adding HKD currency support...');

    // Check if HKD currency already exists in exchange_rates
    const hkdExists = this.db.prepare(`
      SELECT COUNT(*) as count FROM exchange_rates WHERE to_currency = 'HKD'
    `).get();

    if (hkdExists.count === 0) {
      // Add HKD exchange rate for default CNY base currency
      this.db.exec(`
        INSERT OR IGNORE INTO exchange_rates (from_currency, to_currency, rate) VALUES
        ('CNY', 'HKD', 1.1923);
      `);
      console.log('✅ Added HKD exchange rate for CNY base currency');
    } else {
      console.log(' HKD exchange rate already exists, skipping...');
    }

    console.log('✅ HKD currency support added successfully');
  }

  // Migration 004: Ensure email channel support columns/data exist
  migration_004_add_email_notification_support() {
    console.log('📝 Ensuring notification settings support email channel...');

    try {
      const columns = this.db.prepare(`PRAGMA table_info(notification_settings)`).all();
      const hasNotificationChannels = columns.some((column) => column.name === 'notification_channels');

      if (!hasNotificationChannels) {
        this.db.exec(`
          ALTER TABLE notification_settings
          ADD COLUMN notification_channels TEXT NOT NULL DEFAULT '["telegram"]'
        `);
        console.log('✅ Added notification_channels column to notification_settings');
      }

      // Backfill NULL values just in case
      this.db.exec(`
        UPDATE notification_settings
        SET notification_channels = '["telegram"]'
        WHERE notification_channels IS NULL OR notification_channels = ''
      `);

      console.log('✅ Notification settings ready for email channels');
    } catch (error) {
      console.error('❌ Failed to update notification settings for email support:', error);
      throw error;
    }
  }

  // Helper method to parse SQL statements properly
  parseSQL(sql) {
    const statements = [];
    let currentStatement = '';
    let inTrigger = false;

    const lines = sql.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === '') continue;

      // Check if we're starting a trigger
      if (trimmedLine.toUpperCase().startsWith('CREATE TRIGGER')) {
        inTrigger = true;
      }

      currentStatement += line + '\n';

      // Check if we're ending a statement
      if (trimmedLine.endsWith(';')) {
        if (inTrigger && trimmedLine.toUpperCase().includes('END;')) {
          // End of trigger
          inTrigger = false;
          statements.push(currentStatement.trim());
          currentStatement = '';
        } else if (!inTrigger) {
          // Regular statement
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements;
  }




  close() {
    this.db.close();
  }
}

module.exports = DatabaseMigrations;
