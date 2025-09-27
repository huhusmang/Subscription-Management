const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const session = require('express-session');
const request = require('supertest');
const Database = require('better-sqlite3');

const DatabaseMigrations = require('../db/migrations');
const createAuthRoutes = require('../routes/auth');
const { createAdminUserManager } = require('../config/authCredentials');

function createTempDatabasePath() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subscription-db-'));
    return {
        dir: tempDir,
        path: path.join(tempDir, 'database.sqlite'),
    };
}

function cleanupTempDir(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (err) {
        // Ignore cleanup errors in tests
    }
}

describe('Admin authentication and migrations', () => {
    const originalEnv = {
        ADMIN_USERNAME: process.env.ADMIN_USERNAME,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
        ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    };

    afterAll(() => {
        if (originalEnv.ADMIN_USERNAME === undefined) {
            delete process.env.ADMIN_USERNAME;
        } else {
            process.env.ADMIN_USERNAME = originalEnv.ADMIN_USERNAME;
        }

        if (originalEnv.ADMIN_PASSWORD === undefined) {
            delete process.env.ADMIN_PASSWORD;
        } else {
            process.env.ADMIN_PASSWORD = originalEnv.ADMIN_PASSWORD;
        }

        if (originalEnv.ADMIN_PASSWORD_HASH === undefined) {
            delete process.env.ADMIN_PASSWORD_HASH;
        } else {
            process.env.ADMIN_PASSWORD_HASH = originalEnv.ADMIN_PASSWORD_HASH;
        }
    });

    beforeEach(() => {
        process.env.ADMIN_USERNAME = 'admin';
        process.env.ADMIN_PASSWORD = 'super-secret';
        delete process.env.ADMIN_PASSWORD_HASH;
    });

    test('migration creates users table and seeds admin user', async () => {
        const { dir, path: dbPath } = createTempDatabasePath();

        try {
            const migrations = new DatabaseMigrations(dbPath);
            await migrations.runMigrations();
            migrations.close();

            const db = new Database(dbPath);
            const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
            expect(tableInfo).toBeDefined();

            const admin = db.prepare('SELECT username, role, password_hash FROM users WHERE username = ?').get('admin');
            expect(admin).toBeDefined();
            expect(admin.role).toBe('admin');
            expect(admin.password_hash).toBeDefined();
            expect(admin.password_hash).not.toEqual('super-secret');
            db.close();
        } finally {
            cleanupTempDir(dir);
        }
    });

    test('migration backfills admin user when previous versions were applied', async () => {
        const { dir, path: dbPath } = createTempDatabasePath();

        try {
            const db = new Database(dbPath);
            db.exec(`
                CREATE TABLE migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version INTEGER NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            const insertStmt = db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)');
            const insert = db.transaction((records) => {
                for (const [version, name] of records) {
                    insertStmt.run(version, name);
                }
            });
            insert([
                [1, 'initial_schema_consolidated'],
                [2, 'add_notification_system'],
                [3, 'add_hkd_currency_support'],
                [4, 'add_semiannual_billing_cycle'],
                [5, 'fix_fk_after_billing_cycle_migration'],
                [6, 'add_email_notification_support'],
            ]);
            db.close();

            const migrations = new DatabaseMigrations(dbPath);
            await migrations.runMigrations();
            migrations.close();

            const verifyDb = new Database(dbPath);
            const admin = verifyDb.prepare('SELECT username FROM users WHERE username = ?').get('admin');
            expect(admin).toBeDefined();
            verifyDb.close();
        } finally {
            cleanupTempDir(dir);
        }
    });

    test('login succeeds with seeded credentials and updates last_login_at', async () => {
        const { dir, path: dbPath } = createTempDatabasePath();

        try {
            const migrations = new DatabaseMigrations(dbPath);
            await migrations.runMigrations();
            migrations.close();

            const db = new Database(dbPath);
            const app = express();
            app.use(express.json());
            app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
            app.use('/auth', createAuthRoutes(db));

            const loginResponse = await request(app)
                .post('/auth/login')
                .send({ username: 'admin', password: 'super-secret' });

            expect(loginResponse.status).toBe(200);

            const record = db.prepare('SELECT last_login_at FROM users WHERE username = ?').get('admin');
            expect(record.last_login_at).toBeTruthy();
            db.close();
        } finally {
            cleanupTempDir(dir);
        }
    });

    test('password rotation invalidates old credentials and accepts new ones', async () => {
        const { dir, path: dbPath } = createTempDatabasePath();

        try {
            const migrations = new DatabaseMigrations(dbPath);
            await migrations.runMigrations();
            migrations.close();

            const db = new Database(dbPath);
            const adminManager = createAdminUserManager(db);
            adminManager.bootstrapDefaultAdmin();

            const app = express();
            app.use(express.json());
            app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
            app.use('/auth', createAuthRoutes(db));

            const oldPasswordResponse = await request(app)
                .post('/auth/login')
                .send({ username: 'admin', password: 'super-secret' });
            expect(oldPasswordResponse.status).toBe(200);

            adminManager.setAdminPassword({ password: 'new-secret' });

            const failedLogin = await request(app)
                .post('/auth/login')
                .send({ username: 'admin', password: 'super-secret' });
            expect(failedLogin.status).toBe(401);

            const successfulLogin = await request(app)
                .post('/auth/login')
                .send({ username: 'admin', password: 'new-secret' });
            expect(successfulLogin.status).toBe(200);
            db.close();
        } finally {
            cleanupTempDir(dir);
        }
    });

    test('authenticated change password endpoint rotates credentials', async () => {
        const { dir, path: dbPath } = createTempDatabasePath();

        try {
            const migrations = new DatabaseMigrations(dbPath);
            await migrations.runMigrations();
            migrations.close();

            const db = new Database(dbPath);
            const app = express();
            app.use(express.json());
            const testSession = session({ secret: 'test', resave: false, saveUninitialized: false });
            app.use(testSession);
            app.use('/auth', createAuthRoutes(db));

            const agent = request.agent(app);

            const loginResponse = await agent
                .post('/auth/login')
                .send({ username: 'admin', password: 'super-secret' });
            expect(loginResponse.status).toBe(200);

            const changeResponse = await agent
                .post('/auth/change-password')
                .send({ currentPassword: 'super-secret', newPassword: 'another-secret1', confirmPassword: 'another-secret1' });
            expect(changeResponse.status).toBe(200);

            const oldPasswordLogin = await agent
                .post('/auth/login')
                .send({ username: 'admin', password: 'super-secret' });
            expect(oldPasswordLogin.status).toBe(401);

            const newPasswordLogin = await agent
                .post('/auth/login')
                .send({ username: 'admin', password: 'another-secret1' });
            expect(newPasswordLogin.status).toBe(200);

            db.close();
        } finally {
            cleanupTempDir(dir);
        }
    });
});
