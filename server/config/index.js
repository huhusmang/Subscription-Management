const path = require('path');
const fs = require('fs');

/**
 * 统一配置管理模块
 * 提供应用程序的所有配置项，包括数据库路径、环境变量等
 */
class Config {
    constructor() {
        // 加载环境变量 - 统一从根目录的 .env 文件加载
        this.loadEnvironmentVariables();
        
        // 缓存配置项
        this._databasePath = null;
    }

    /**
     * 加载环境变量
     * 统一的环境变量加载逻辑，确保所有模块使用相同的配置
     */
    loadEnvironmentVariables() {
        const envPath = path.join(__dirname, '..', '..', '.env');
        require('dotenv').config({ path: envPath });
    }

    /**
     * 获取数据库路径 - 支持多种环境
     * 统一的数据库路径获取逻辑，替代各模块中重复的 getDatabasePath 函数
     * @returns {string} 数据库文件路径
     */
    getDatabasePath() {
        if (this._databasePath) {
            return this._databasePath;
        }

        // 优先使用环境变量
        if (process.env.DATABASE_PATH) {
            this._databasePath = process.env.DATABASE_PATH;
            return this._databasePath;
        }

        // Docker 环境中的常见路径
        const dockerPath = '/app/data/database.sqlite';

        // 检查 Docker 数据目录是否存在
        if (fs.existsSync('/app/data')) {
            this._databasePath = dockerPath;
            return this._databasePath;
        }

        // 本地开发环境
        this._databasePath = path.resolve(__dirname, '..', 'db', 'database.sqlite');
        return this._databasePath;
    }

    /**
     * 获取应用程序端口
     * @returns {number} 端口号
     */
    getPort() {
        return parseInt(process.env.PORT) || 3001;
    }

    /**
     * 获取天行 API 密钥
     * @returns {string|null} 天行 API 密钥
     */
    getTianApiKey() {
        return process.env.TIANAPI_KEY || null;
    }

    /**
     * 获取基础货币
     * @returns {string} 基础货币代码
     */
    getBaseCurrency() {
        return process.env.BASE_CURRENCY || 'CNY';
    }

    /**
     * 获取日志级别
     * @returns {string} 日志级别
     */
    getLogLevel() {
        // 生产环境默认使用 warn，开发环境默认使用 info
        const defaultLevel = this.isProduction() ? 'warn' : 'info';
        return process.env.LOG_LEVEL || defaultLevel;
    }

    /**
     * 获取运行环境
     * @returns {string} 运行环境 (development, production, test)
     */
    getNodeEnv() {
        return process.env.NODE_ENV || 'development';
    }

    /**
     * 是否为开发环境
     * @returns {boolean}
     */
    isDevelopment() {
        return this.getNodeEnv() === 'development';
    }

    /**
     * 是否为生产环境
     * @returns {boolean}
     */
    isProduction() {
        return this.getNodeEnv() === 'production';
    }

    /**
     * 是否为测试环境
     * @returns {boolean}
     */
    isTest() {
        return this.getNodeEnv() === 'test';
    }

    /**
     * 获取数据库目录路径
     * @returns {string} 数据库目录路径
     */
    getDatabaseDir() {
        return path.dirname(this.getDatabasePath());
    }

    /**
     * 确保数据库目录存在
     * @returns {void}
     */
    ensureDatabaseDir() {
        const dbDir = this.getDatabaseDir();
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`📁 Created database directory: ${dbDir}`);
        }
    }

    /**
     * 检查数据库文件是否存在
     * @returns {boolean}
     */
    databaseExists() {
        return fs.existsSync(this.getDatabasePath());
    }

    /**
     * 获取所有配置的摘要信息
     * @returns {Object} 配置摘要
     */
    getSummary() {
        return {
            nodeEnv: this.getNodeEnv(),
            port: this.getPort(),
            databasePath: this.getDatabasePath(),
            logLevel: this.getLogLevel(),
            baseCurrency: this.getBaseCurrency(),
            hasApiKey: false,
            hasTianApiKey: !!this.getTianApiKey(),
            databaseExists: this.databaseExists(),
            emailConfigured: this.getEmailConfig().enabled
        };
    }

    /**
     * 打印配置信息
     */
    printSummary() {
        const summary = this.getSummary();
        console.log('📋 Configuration Summary:');
        console.log(`   Environment: ${summary.nodeEnv}`);
        console.log(`   Port: ${summary.port}`);
        console.log(`   Database Path: ${summary.databasePath}`);
        console.log(`   Log Level: ${summary.logLevel}`);
        console.log(`   Base Currency: ${summary.baseCurrency}`);
        console.log(`   API Key: ❌ Removed (session-based auth)`);
        console.log(`   TianAPI Key: ${summary.hasTianApiKey ? '✅ Set' : '❌ Not set'}`);
        console.log(`   Email Notifications: ${summary.emailConfigured ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   Database Exists: ${summary.databaseExists ? '✅ Yes' : '❌ No'}`);
    }

    /**
     * 获取邮件通知配置
     * @returns {Object} 邮件配置
     */
    getEmailConfig() {
        const host = process.env.EMAIL_HOST;
        const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
        const secureEnv = process.env.EMAIL_SECURE;
        const secure = secureEnv !== undefined ? secureEnv === 'true' : port === 465;
        const authUser = process.env.EMAIL_USER || process.env.EMAIL_USERNAME;
        const authPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
        const from = process.env.EMAIL_FROM || authUser || 'no-reply@example.com';
        const rejectUnauthorizedEnv = process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;
        const rejectUnauthorized = rejectUnauthorizedEnv === undefined ? true : rejectUnauthorizedEnv === 'true';

        const enabled = Boolean(host && from && (authUser ? authPass : true));

        return {
            enabled,
            host,
            port,
            secure,
            from,
            authUser,
            authPass,
            tlsOptions: {
                rejectUnauthorized
            },
            locale: process.env.EMAIL_LOCALE || 'zh-CN'
        };
    }
}

// 导出单例实例
const config = new Config();

module.exports = config;
