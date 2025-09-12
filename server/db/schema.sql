-- SQLite Database Schema for Subscription Management
-- This file contains the complete database schema for the subscription management system
-- Version: 1.0 (Consolidated from multiple migrations)

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Create settings table
-- Note: Default currency is set via application configuration (BASE_CURRENCY)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    currency TEXT NOT NULL DEFAULT 'CNY',
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    show_original_currency BOOLEAN NOT NULL DEFAULT 1,
    language TEXT NOT NULL DEFAULT 'zh-CN' CHECK (language IN ('zh-CN', 'en', 'ja', 'ko', 'fr', 'de', 'es')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate DECIMAL(15, 8) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_currency, to_currency)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create subscriptions table (with foreign key relationships)
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    plan TEXT NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly', 'semiannual')),
    next_billing_date DATE,
    last_billing_date DATE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CNY', -- Default currency from BASE_CURRENCY config
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

-- Create payment_history table
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

-- Create monthly_category_summary table
CREATE TABLE IF NOT EXISTS monthly_category_summary (
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    total_amount_in_base_currency DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    base_currency TEXT NOT NULL DEFAULT 'CNY', -- Base currency from BASE_CURRENCY config
    transactions_count INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (year, month, category_id),
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Trigger for settings table
CREATE TRIGGER IF NOT EXISTS settings_updated_at
AFTER UPDATE ON settings
FOR EACH ROW
BEGIN
    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for exchange_rates table
CREATE TRIGGER IF NOT EXISTS exchange_rates_updated_at
AFTER UPDATE ON exchange_rates
FOR EACH ROW
BEGIN
    UPDATE exchange_rates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for categories table
CREATE TRIGGER IF NOT EXISTS categories_updated_at
AFTER UPDATE ON categories
FOR EACH ROW
BEGIN
    UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for payment_methods table
CREATE TRIGGER IF NOT EXISTS payment_methods_updated_at
AFTER UPDATE ON payment_methods
FOR EACH ROW
BEGIN
    UPDATE payment_methods SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for subscriptions table
CREATE TRIGGER IF NOT EXISTS subscriptions_updated_at
AFTER UPDATE ON subscriptions
FOR EACH ROW
BEGIN
    UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for monthly_category_summary table
CREATE TRIGGER IF NOT EXISTS monthly_category_summary_updated_at
AFTER UPDATE ON monthly_category_summary
FOR EACH ROW
BEGIN
    UPDATE monthly_category_summary
    SET updated_at = CURRENT_TIMESTAMP
    WHERE year = NEW.year AND month = NEW.month AND category_id = NEW.category_id;
END;

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Indexes for subscriptions table
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_category_id ON subscriptions(category_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_method_id ON subscriptions(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_cycle ON subscriptions(billing_cycle);

-- Indexes for categories and payment_methods tables
CREATE INDEX IF NOT EXISTS idx_categories_value ON categories(value);
CREATE INDEX IF NOT EXISTS idx_payment_methods_value ON payment_methods(value);

-- Indexes for payment_history table
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_billing_period ON payment_history(billing_period_start, billing_period_end);

-- Indexes for monthly_category_summary table
CREATE INDEX IF NOT EXISTS idx_monthly_category_summary_year_month ON monthly_category_summary(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_category_summary_category_id ON monthly_category_summary(category_id);
CREATE INDEX IF NOT EXISTS idx_monthly_category_summary_year_month_category ON monthly_category_summary(year, month, category_id);

-- ============================================================================
-- DEFAULT DATA INSERTION
-- ============================================================================

-- Insert default settings
-- Note: Currency value should match BASE_CURRENCY from application config
INSERT OR IGNORE INTO settings (id, currency, theme, show_original_currency, language)
VALUES (1, 'CNY', 'system', 1, 'zh-CN');

-- Insert default categories
INSERT OR IGNORE INTO categories (value, label) VALUES
('video', 'Video Streaming'),
('music', 'Music Streaming'),
('software', 'Software'),
('cloud', 'Cloud Storage'),
('news', 'News & Magazines'),
('game', 'Games'),
('productivity', 'Productivity'),
('education', 'Education'),
('finance', 'Finance'),
('other', 'Other');

-- Insert default payment methods
INSERT OR IGNORE INTO payment_methods (value, label) VALUES
('creditcard', 'Credit Card'),
('debitcard', 'Debit Card'),
('paypal', 'PayPal'),
('applepay', 'Apple Pay'),
('googlepay', 'Google Pay'),
('banktransfer', 'Bank Transfer'),
('crypto', 'Cryptocurrency'),
('other', 'Other');

-- Insert default exchange rates (Base currency from application config)
-- Note: These rates should match BASE_CURRENCY configuration
-- Only supported currencies: USD, EUR, GBP, CAD, AUD, JPY, CNY, TRY, HKD
INSERT OR IGNORE INTO exchange_rates (from_currency, to_currency, rate) VALUES
('CNY', 'CNY', 1.0000),
('CNY', 'USD', 0.1538),
('CNY', 'EUR', 0.1308),
('CNY', 'GBP', 0.1154),
('CNY', 'JPY', 16.9231),
('CNY', 'CAD', 0.1923),
('CNY', 'AUD', 0.2077),
('CNY', 'TRY', 4.2000),
('CNY', 'HKD', 1.1923);