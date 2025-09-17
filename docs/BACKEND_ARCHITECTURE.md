# 订阅管理系统后端服务架构文档

## 概述

本文档详细描述了订阅管理系统后端服务的架构设计、实现逻辑和技术细节。后端采用Node.js + Express + SQLite的技术栈，遵循分层架构模式，提供RESTful API服务。

## 🏗 整体架构

### 架构模式
采用经典的三层架构模式：
```
Controller Layer (控制器层)
    ↓
Service Layer (业务逻辑层)
    ↓
Repository Layer (数据访问层)
    ↓
Database Layer (数据库层)
```

### 技术栈
- **运行时**: Node.js 20+
- **Web框架**: Express 5
- **数据库**: SQLite + better-sqlite3
- **定时任务**: node-cron
- **HTTP客户端**: axios
- **环境配置**: dotenv

## 📁 目录结构

```
server/
├── server.js              # 应用入口和路由配置
├── config/                 # 配置管理
│   ├── index.js           # 配置入口
│   ├── database.js        # 数据库配置
│   └── currencies.js      # 货币配置
├── db/                     # 数据库相关
│   ├── schema.sql         # 数据库结构定义
│   ├── init.js            # 数据库初始化
│   ├── migrate.js         # 迁移执行器
│   └── migrations.js      # 迁移定义
├── controllers/            # 控制器层
├── services/              # 业务逻辑层
├── routes/                # 路由定义
├── middleware/            # 中间件
├── utils/                 # 工具类
└── scripts/               # 脚本文件
```

## 🗄 数据库设计

### 数据库架构
使用SQLite作为数据库，采用关系型设计，确保数据完整性和一致性。

### 核心数据表

#### 1. settings (系统设置表)
```sql
CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    currency TEXT NOT NULL DEFAULT 'CNY',
    theme TEXT NOT NULL DEFAULT 'system',
    show_original_currency BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. categories (分类表)
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. payment_methods (支付方式表)
```sql
CREATE TABLE payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. subscriptions (订阅主表)
```sql
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    plan TEXT NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly')),
    next_billing_date DATE,
    last_billing_date DATE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CNY',
    payment_method_id INTEGER NOT NULL,
    start_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    category_id INTEGER NOT NULL,
    renewal_type TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id),
    FOREIGN KEY (category_id) REFERENCES categories (id)
);
```

#### 5. payment_history (支付历史表)
```sql
CREATE TABLE payment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'succeeded',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
);
```

#### 6. monthly_category_summary (月度分类汇总表)
```sql
CREATE TABLE monthly_category_summary (
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    total_amount_in_base_currency DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    base_currency TEXT NOT NULL DEFAULT 'CNY',
    transactions_count INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (year, month, category_id),
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);
```

#### 7. exchange_rates (汇率表)
```sql
CREATE TABLE exchange_rates (
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate DECIMAL(10, 6) NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (from_currency, to_currency)
);
```

### 数据库特性

#### 外键约束
- 确保数据引用完整性
- 支持级联删除操作
- 防止孤立数据产生

#### 自动时间戳
```sql
-- 创建触发器自动更新 updated_at 字段
CREATE TRIGGER update_subscriptions_updated_at 
    AFTER UPDATE ON subscriptions
    FOR EACH ROW
    BEGIN
        UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
```

#### 性能索引
```sql
-- 为常用查询字段创建索引
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX idx_payment_history_subscription ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_date ON payment_history(payment_date);
```

## 🔧 配置管理

### 配置系统
集中式配置管理，支持环境变量和默认值。

#### config/index.js
```javascript
const path = require('path');
const fs = require('fs');

// 基础配置
const BASE_CURRENCY = process.env.BASE_CURRENCY || 'CNY';
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 数据库配置
const getDatabasePath = () => {
    if (process.env.DATABASE_PATH) {
        return process.env.DATABASE_PATH;
    }
    
    const dbDir = path.join(__dirname, '..', 'db');
    return path.join(dbDir, 'database.sqlite');
};

// 天行数据API密钥
const getTianApiKey = () => process.env.TIANAPI_KEY;
```

### 环境变量
```bash
# 必需配置
PORT=3001
BASE_CURRENCY=CNY
NODE_ENV=production
DATABASE_PATH=/app/data/database.sqlite
TIANAPI_KEY=your_tianapi_key_here
SESSION_SECRET=your_random_session_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# 首次启动时，系统会根据 ADMIN_PASSWORD 生成 bcrypt 哈希并输出日志，便于将其转存到 ADMIN_PASSWORD_HASH 后删除明文密码。
```

## 🛡 中间件系统

### 认证中间件 (middleware/requireLogin.js)
```javascript
function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ message: 'Authentication required' });
}
```

### 错误处理中间件 (middleware/errorHandler.js)
```javascript
// 异步错误处理包装器
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 全局错误处理器
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // 数据库错误处理
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ 
            error: 'Database constraint violation' 
        });
    }
    
    // 默认错误响应
    res.status(500).json({ 
        error: 'Internal server error' 
    });
};

// 404处理器
const notFoundHandler = (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found' 
    });
};
```

## 🔄 数据访问层

### BaseRepository (utils/BaseRepository.js)
通用数据访问基类，提供标准的CRUD操作。

```javascript
class BaseRepository {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }
    
    // 查询所有记录
    findAll(options = {}) {
        let query = `SELECT * FROM ${this.tableName}`;
        const params = [];
        
        // WHERE条件
        if (options.where) {
            const conditions = Object.keys(options.where);
            const whereClause = conditions.map(key => `${key} = ?`).join(' AND ');
            query += ` WHERE ${whereClause}`;
            params.push(...Object.values(options.where));
        }
        
        // 排序
        if (options.orderBy) {
            query += ` ORDER BY ${options.orderBy}`;
        }
        
        // 分页
        if (options.limit) {
            query += ` LIMIT ?`;
            params.push(options.limit);
            
            if (options.offset) {
                query += ` OFFSET ?`;
                params.push(options.offset);
            }
        }
        
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }
    
    // 根据ID查询
    findById(id, idField = 'id') {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${idField} = ?`);
        return stmt.get(id);
    }
    
    // 创建记录
    create(data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map(() => '?').join(', ');
        
        const query = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
        const stmt = this.db.prepare(query);
        
        return stmt.run(...values);
    }
    
    // 更新记录
    update(id, data, idField = 'id') {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${idField} = ?`;
        const stmt = this.db.prepare(query);
        
        return stmt.run(...values, id);
    }
    
    // 删除记录
    delete(id, idField = 'id') {
        const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${idField} = ?`);
        return stmt.run(id);
    }
    
    // 事务支持
    transaction(fn) {
        return this.db.transaction(fn);
    }
}
```

### 特性
- **通用CRUD操作**: 标准化的数据库操作
- **灵活查询**: 支持条件查询、排序、分页
- **事务支持**: 确保数据一致性
- **参数化查询**: 防止SQL注入
- **错误处理**: 统一的错误处理机制

## 🎯 控制器层

控制器层负责处理HTTP请求，调用业务逻辑，返回响应。

### 控制器基本结构
```javascript
class SubscriptionController {
    constructor(db) {
        this.subscriptionService = new SubscriptionService(db);
    }
    
    // 获取所有订阅
    getAllSubscriptions = asyncHandler(async (req, res) => {
        const subscriptions = await this.subscriptionService.getAllSubscriptions();
        res.json(subscriptions);
    });
    
    // 创建订阅
    createSubscription = asyncHandler(async (req, res) => {
        const subscription = await this.subscriptionService.createSubscription(req.body);
        res.status(201).json({ 
            id: subscription.id,
            message: '订阅创建成功' 
        });
    });
}
```

### 响应处理工具 (utils/responseHelper.js)
```javascript
// 成功响应
const success = (res, data, message = 'Success') => {
    res.json({ data, message });
};

// 查询结果处理
const handleQueryResult = (res, result, resourceName) => {
    if (Array.isArray(result)) {
        res.json(result);
    } else if (result) {
        res.json(result);
    } else {
        res.status(404).json({ 
            error: `${resourceName} not found` 
        });
    }
};

// 数据库操作结果处理
const handleDbResult = (res, result, successMessage, notFoundMessage) => {
    if (result.changes > 0) {
        res.json({ message: successMessage });
    } else {
        res.status(404).json({ error: notFoundMessage });
    }
};
```

## 🔧 业务逻辑层

业务逻辑层封装复杂的业务规则和数据处理逻辑。

### 服务类示例
```javascript
class SubscriptionService extends BaseRepository {
    constructor(db) {
        super(db, 'subscriptions');
        this.paymentHistoryService = new PaymentHistoryService(db);
    }
    
    // 创建订阅（包含业务逻辑）
    async createSubscription(subscriptionData) {
        const {
            name, plan, billing_cycle, next_billing_date,
            amount, currency, payment_method_id, start_date,
            status = 'active', category_id, renewal_type = 'manual',
            notes, website
        } = subscriptionData;
        
        // 计算上次计费日期
        const last_billing_date = this.calculateLastBillingDate(
            next_billing_date, start_date, billing_cycle
        );
        
        // 使用事务确保数据一致性
        const result = this.transaction(() => {
            // 创建订阅
            const subscriptionResult = this.create({
                name, plan, billing_cycle, next_billing_date,
                last_billing_date, amount, currency, payment_method_id,
                start_date, status, category_id, renewal_type, notes, website
            });
            
            // 创建初始支付记录
            if (status === 'active' && start_date) {
                this.paymentHistoryService.createPaymentRecord({
                    subscription_id: subscriptionResult.lastInsertRowid,
                    payment_date: start_date,
                    amount_paid: amount,
                    currency: currency,
                    billing_period_start: start_date,
                    billing_period_end: next_billing_date
                });
            }
            
            return subscriptionResult;
        });
        
        return result;
    }
    
    // 业务逻辑：计算上次计费日期
    calculateLastBillingDate(nextBillingDate, startDate, billingCycle) {
        const nextDate = new Date(nextBillingDate);
        const startDateObj = new Date(startDate);
        
        switch (billingCycle) {
            case 'monthly':
                return new Date(nextDate.setMonth(nextDate.getMonth() - 1));
            case 'yearly':
                return new Date(nextDate.setFullYear(nextDate.getFullYear() - 1));
            case 'quarterly':
                return new Date(nextDate.setMonth(nextDate.getMonth() - 3));
            default:
                return startDateObj;
        }
    }
}
```

## 🔄 定时任务系统

### 汇率更新调度器
```javascript
class ExchangeRateScheduler {
    constructor(db, apiKey) {
        this.db = db;
        this.apiKey = apiKey;
        this.exchangeRateService = new ExchangeRateService(db);
        this.job = null;
    }
    
    start() {
        // 每天凌晨2点更新汇率
        this.job = cron.schedule('0 2 * * *', async () => {
            console.log('🔄 Starting scheduled exchange rate update...');
            await this.updateExchangeRates();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        
        this.job.start();
        console.log('✅ Exchange rate scheduler started');
    }
    
    async updateExchangeRates() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ No API key provided, skipping exchange rate update');
                return { success: false, message: 'No API key configured' };
            }
            
            // 调用天行数据API获取汇率
            const response = await axios.get(`https://apis.tianapi.com/fxrate/index`, {
                params: { key: this.apiKey }
            });
            
            if (response.data.code === 200) {
                const rates = response.data.result;
                await this.exchangeRateService.updateRates(rates);
                
                console.log('✅ Exchange rates updated successfully');
                return { 
                    success: true, 
                    message: 'Exchange rates updated successfully',
                    updatedAt: new Date().toISOString()
                };
            } else {
                throw new Error(`API error: ${response.data.msg}`);
            }
        } catch (error) {
            console.error('❌ Failed to update exchange rates:', error);
            return { 
                success: false, 
                message: error.message 
            };
        }
    }
}
```

### 订阅续费调度器
```javascript
class SubscriptionRenewalScheduler {
    constructor(db) {
        this.db = db;
        this.subscriptionManagementService = new SubscriptionManagementService(db);
        this.job = null;
    }
    
    start() {
        // 每天凌晨1点检查续费
        this.job = cron.schedule('0 1 * * *', async () => {
            console.log('🔄 Starting scheduled subscription maintenance...');
            await this.runMaintenance();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        
        this.job.start();
        console.log('✅ Subscription renewal scheduler started');
    }
    
    async runMaintenance() {
        try {
            // 处理自动续费
            const autoRenewalResult = await this.subscriptionManagementService.processAutoRenewals();
            
            // 处理过期订阅
            const expiredResult = await this.subscriptionManagementService.processExpiredSubscriptions();
            
            console.log('✅ Subscription maintenance completed:', {
                autoRenewals: autoRenewalResult,
                expiredProcessed: expiredResult
            });
            
            return {
                success: true,
                autoRenewals: autoRenewalResult,
                expiredProcessed: expiredResult
            };
        } catch (error) {
            console.error('❌ Subscription maintenance failed:', error);
            return { success: false, error: error.message };
        }
    }
}
```

## 🛣 路由系统

### 路由组织
采用模块化路由设计，分为公开路由和受保护路由。

```javascript
// server.js 中的路由配置
const apiRouter = express.Router();
const protectedApiRouter = express.Router();

// 受保护路由需要登录
apiRouter.use(requireLogin);
protectedApiRouter.use(requireLogin);

// 注册路由模块
apiRouter.use('/subscriptions', createSubscriptionRoutes(db));
protectedApiRouter.use('/subscriptions', createProtectedSubscriptionRoutes(db));
protectedApiRouter.use('/subscriptions', createSubscriptionManagementRoutes(db));

// 注册到应用
app.use('/api', apiRouter);
app.use('/api/protected', protectedApiRouter);
```

### 路由模块示例
```javascript
// routes/subscriptions.js
function createSubscriptionRoutes(db) {
    const router = express.Router();
    const controller = new SubscriptionController(db);
    
    // 公开接口
    router.get('/', controller.getAllSubscriptions);
    router.get('/:id', controller.getSubscriptionById);
    router.get('/stats/overview', controller.getSubscriptionStats);
    
    return router;
}

function createProtectedSubscriptionRoutes(db) {
    const router = express.Router();
    const controller = new SubscriptionController(db);
    
    // 受保护接口
    router.post('/', controller.createSubscription);
    router.put('/:id', controller.updateSubscription);
    router.delete('/:id', controller.deleteSubscription);
    
    return router;
}
```

## 🔍 数据验证

### 验证工具 (utils/validator.js)
```javascript
const createValidator = (schema) => {
    return (data) => {
        const errors = [];
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            
            // 必填验证
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }
            
            // 类型验证
            if (value !== undefined && rules.type) {
                if (rules.type === 'number' && isNaN(value)) {
                    errors.push(`${field} must be a number`);
                }
                if (rules.type === 'string' && typeof value !== 'string') {
                    errors.push(`${field} must be a string`);
                }
            }
            
            // 枚举验证
            if (value !== undefined && rules.enum && !rules.enum.includes(value)) {
                errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
            }
            
            // 长度验证
            if (value !== undefined && rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${field} must not exceed ${rules.maxLength} characters`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    };
};

// 使用示例
const subscriptionValidator = createValidator({
    name: { required: true, type: 'string', maxLength: 100 },
    amount: { required: true, type: 'number' },
    billing_cycle: { required: true, enum: ['monthly', 'yearly', 'quarterly'] },
    status: { enum: ['active', 'trial', 'cancelled'] }
});
```

## 📊 日志系统

### 日志工具 (utils/logger.js)
```javascript
const logger = {
    info: (message, data = {}) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
    },
    
    error: (message, error = {}) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    },
    
    warn: (message, data = {}) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
    },
    
    debug: (message, data = {}) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data);
        }
    }
};
```

## 🚀 启动流程

### 应用启动序列
1. **环境配置加载** - 读取.env文件和环境变量
2. **数据库初始化** - 检查并创建数据库表结构
3. **中间件配置** - 设置CORS、JSON解析等中间件
4. **定时任务启动** - 启动汇率更新和订阅维护任务
5. **路由注册** - 注册所有API路由
6. **静态文件服务** - 配置前端静态文件服务
7. **错误处理** - 设置全局错误处理中间件
8. **服务器启动** - 监听指定端口

### 启动脚本 (start.sh)
```bash
#!/bin/bash

echo "🚀 Starting Subscription Management Server..."

# 检查数据库目录
if [ ! -d "db" ]; then
    echo "📁 Creating database directory..."
    mkdir -p db
fi

# 初始化数据库
echo "🔄 Initializing database..."
node db/init.js

# 启动服务器
echo "🌟 Starting server..."
node server.js
```

## 🔒 安全考虑

### API密钥认证
- 所有写操作需要API密钥验证
- 密钥通过环境变量配置
- 支持密钥自动生成

### 数据验证
- 输入参数严格验证
- SQL注入防护
- 数据类型检查

### 错误处理
- 敏感信息不暴露给客户端
- 统一错误响应格式
- 详细的服务器端日志

## 📈 性能优化

### 数据库优化
- 关键字段索引
- 查询语句优化
- 事务使用

### 缓存策略
- 汇率数据缓存
- 统计数据预计算
- 查询结果缓存

### 资源管理
- 数据库连接池
- 内存使用监控
- 定时任务优化
