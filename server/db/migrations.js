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
        name: 'add_semiannual_billing_cycle',
        up: () => this.migration_004_add_semiannual_billing_cycle()
      },
      {
        version: 5,
        name: 'fix_fk_after_billing_cycle_migration',
        up: () => this.migration_005_fix_fk_after_billing_cycle_migration()
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

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
      INSERT OR IGNORE INTO notification_settings (notification_type, is_enabled, advance_days, repeat_notification) VALUES
      ('renewal_reminder', 1, 7, 1),
      ('expiration_warning', 1, 0, 0),
      ('renewal_success', 1, 0, 0),
      ('renewal_failure', 1, 0, 0),
      ('subscription_change', 1, 0, 0);

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

  // Migration 004: Add 'semiannual' to subscriptions.billing_cycle CHECK constraint
  migration_004_add_semiannual_billing_cycle() {
    console.log("📝 Updating subscriptions.billing_cycle to include 'semiannual'...");

    // Ensure foreign keys are enforced during migration
    this.db.pragma('foreign_keys = ON');

    // 1) Rename existing table
    this.db.exec(`
      ALTER TABLE subscriptions RENAME TO subscriptions_old;
    `);

    // 2) Recreate subscriptions table with updated CHECK constraint
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly', 'semiannual')),
        next_billing_date DATE,
        last_billing_date DATE,
        amount DECIMAL(10, 2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'CNY',
        payment_method_id INTEGER NOT NULL,
        start_date DATE,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'cancelled')),
        category_id INTEGER NOT NULL,
        renewal_type TEXT NOT NULL DEFAULT 'manual' CHECK (renewal_type IN ('auto', 'manual')),
        notes TEXT,
        website TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id) ON DELETE RESTRICT
      );
    `);

    // 3) Copy data
    this.db.exec(`
      INSERT INTO subscriptions (
        id, name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency,
        payment_method_id, start_date, status, category_id, renewal_type, notes, website,
        created_at, updated_at
      )
      SELECT
        id, name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency,
        payment_method_id, start_date, status, category_id, renewal_type, notes, website,
        created_at, updated_at
      FROM subscriptions_old;
    `);

    // 4) Recreate indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_category_id ON subscriptions(category_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_method_id ON subscriptions(payment_method_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_cycle ON subscriptions(billing_cycle);
    `);

    // 5) Recreate update trigger
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS subscriptions_updated_at
      AFTER UPDATE ON subscriptions
      FOR EACH ROW
      BEGIN
          UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // 6) Drop old table
    this.db.exec(`
      DROP TABLE IF EXISTS subscriptions_old;
    `);

    console.log("✅ Updated subscriptions.billing_cycle to include 'semiannual'");
  }

  // Migration 005: After migration 004, SQLite renaming updated FKs in child tables
  // to reference `subscriptions_old`. Recreate affected tables so their FKs
  // correctly reference `subscriptions` again.
  migration_005_fix_fk_after_billing_cycle_migration() {
    console.log('🛠️  Fixing foreign keys referencing subscriptions_old...');

    // Ensure foreign keys are enforced during migration
    this.db.pragma('foreign_keys = ON');

    // Check whether payment_history references subscriptions_old
    const fkIssueRows = this.db.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table' 
        AND name IN ('payment_history','notification_history')
        AND sql LIKE '%subscriptions_old%'
    `).all();

    if (fkIssueRows.length === 0) {
      console.log('ℹ️  No tables reference subscriptions_old. Skipping.');
      return;
    }

    // 1) Recreate payment_history if needed
    const paymentHistoryHasIssue = fkIssueRows.some(r => r.name === 'payment_history');
    if (paymentHistoryHasIssue) {
      console.log('🔄 Recreating payment_history to fix foreign key...');

      // Rename old table
      this.db.exec(`
        ALTER TABLE payment_history RENAME TO payment_history_old;
      `);

      // Create new table with correct FK
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS payment_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subscription_id INTEGER NOT NULL,
          payment_date DATE NOT NULL,
          amount_paid DECIMAL(10, 2) NOT NULL,
          currency TEXT NOT NULL,
          billing_period_start DATE NOT NULL,
          billing_period_end DATE NOT NULL,
          status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'refunded')),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
        );
      `);

      // Copy data
      this.db.exec(`
        INSERT INTO payment_history (
          id, subscription_id, payment_date, amount_paid, currency,
          billing_period_start, billing_period_end, status, notes, created_at
        )
        SELECT id, subscription_id, payment_date, amount_paid, currency,
               billing_period_start, billing_period_end, status, notes, created_at
        FROM payment_history_old;
      `);

      // Recreate indexes
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
        CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);
        CREATE INDEX IF NOT EXISTS idx_payment_history_billing_period ON payment_history(billing_period_start, billing_period_end);
      `);

      // Drop old table
      this.db.exec(`
        DROP TABLE IF EXISTS payment_history_old;
      `);

      console.log('✅ payment_history foreign key fixed');
    }

    // 2) Recreate notification_history if needed
    const notificationHistoryHasIssue = fkIssueRows.some(r => r.name === 'notification_history');
    if (notificationHistoryHasIssue) {
      console.log('🔄 Recreating notification_history to fix foreign key...');

      // Rename old table
      this.db.exec(`
        ALTER TABLE notification_history RENAME TO notification_history_old;
      `);

      // Create new table with correct FK
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

      // Copy data
      this.db.exec(`
        INSERT INTO notification_history (
          id, subscription_id, notification_type, channel_type, status,
          recipient, message_content, error_message, sent_at, created_at
        )
        SELECT id, subscription_id, notification_type, channel_type, status,
               recipient, message_content, error_message, sent_at, created_at
        FROM notification_history_old;
      `);

      // Recreate indexes (same as migration 002)
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_notification_history_subscription ON notification_history(subscription_id);
        CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
        CREATE INDEX IF NOT EXISTS idx_notification_history_created ON notification_history(created_at);
      `);

      // Drop old table
      this.db.exec(`
        DROP TABLE IF EXISTS notification_history_old;
      `);

      console.log('✅ notification_history foreign key fixed');
    }

    console.log('🎉 Foreign key fixes completed');
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
