# 订阅管理系统 API 文档

## 概述

本API提供完整的订阅管理功能，包括订阅CRUD操作、支付历史追踪、数据分析、设置管理、汇率处理等核心功能。

**基础URL:** `http://localhost:3001/api`  
**受保护API基础URL:** `http://localhost:3001/api/protected`

## 认证机制

所有接口均需要登录后访问（基于用户名密码的会话认证）。

### 认证流程

1. **登录**: 使用管理员用户名和密码通过 `POST /api/auth/login` 端点获取会话
2. **会话验证**: 后端使用 `express-session` 管理会话，Cookie 中存储会话ID
3. **访问受保护接口**: 所有 `/api/protected/*` 端点都需要有效的会话

### 认证端点

- `POST /api/auth/login` - 用户名密码登录（请求体包含 `username`, `password`）
- `POST /api/auth/logout` - 注销会话
- `GET /api/auth/me` - 获取当前用户信息

### 环境配置

在 `.env` 文件中配置以下环境变量：

```bash
# 会话管理
SESSION_SECRET=your_random_session_secret

# 管理员认证
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password  # 首次启动时使用，系统会生成哈希值

# 生产环境推荐使用哈希值（系统首次启动时会生成）
ADMIN_PASSWORD_HASH=$2a$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 安全特性

- **HTTP-Only Cookie**: 会话ID存储在HTTP-Only Cookie中，前端无法直接访问
- **自动过期**: 会话默认12小时后过期
- **安全标志**: 生产环境启用 `secure` 和 `sameSite` 标志
- **密码哈希**: 使用bcrypt对密码进行安全哈希存储

## 响应格式

所有API响应均为JSON格式。成功响应返回请求的数据，错误响应遵循以下结构：

```json
{
  "error": "错误信息描述"
}
```

成功响应通常包含以下结构：
```json
{
  "data": "响应数据",
  "message": "操作成功信息"
}
```

## API端点概览

### 核心模块
- **健康检查** - 服务状态检查
- **认证管理** - 用户名密码登录和会话管理
- **订阅管理** - 订阅CRUD操作和查询
- **订阅管理服务** - 续费、过期处理等高级功能
- **支付历史** - 支付记录管理和统计
- **数据分析** - 收入分析和趋势统计
- **月度分类汇总** - 按分类的月度支出统计
- **设置管理** - 系统设置和用户偏好
- **汇率管理** - 汇率数据和货币转换
- **分类管理** - 订阅分类CRUD
- **支付方式管理** - 支付方式CRUD
- **通知系统** - 多渠道通知管理（Telegram、Email）
- **续费调度器** - 自动续费任务管理

---

## 1. 健康检查

### GET /health
检查API服务器运行状态。

**响应:**
```json
{
  "message": "Subscription Management Backend is running!",
  "status": "healthy"
}
```

---

## 2. 订阅管理 (Subscriptions)

### 公开接口

#### GET /subscriptions
获取所有订阅信息。

**响应:**
```json
[
  {
    "id": 1,
    "name": "Netflix",
    "plan": "Premium",
    "billing_cycle": "monthly",
    "next_billing_date": "2025-08-01",
    "last_billing_date": "2025-07-01",
    "amount": 15.99,
    "currency": "USD",
    "payment_method_id": 1,
    "payment_method": {
      "id": 1,
      "value": "creditcard",
      "label": "信用卡"
    },
    "start_date": "2024-01-01",
    "status": "active",
    "category_id": 1,
    "category": {
      "id": 1,
      "value": "video",
      "label": "视频娱乐"
    },
    "renewal_type": "auto",
    "notes": "家庭计划",
    "website": "https://netflix.com",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-07-01T00:00:00.000Z"
  }
]
```

#### GET /subscriptions/:id
根据ID获取特定订阅信息。

**参数:**
- `id` (路径参数): 订阅ID

**响应:** 单个订阅对象（结构同上）

#### GET /subscriptions/stats/overview
获取订阅统计概览。

**响应:**
```json
{
  "totalSubscriptions": 15,
  "activeSubscriptions": 12,
  "totalMonthlyAmount": 299.99,
  "averageAmount": 24.99
}
```

#### GET /subscriptions/stats/upcoming-renewals
获取即将续费的订阅列表。

**查询参数:**
- `days` (可选): 未来天数，默认7天

**响应:**
```json
[
  {
    "id": 1,
    "name": "Netflix",
    "next_billing_date": "2025-07-15",
    "amount": 15.99,
    "currency": "USD"
  }
]
```

#### GET /subscriptions/stats/expired
获取已过期的订阅列表。

#### GET /subscriptions/category/:category
根据分类获取订阅。

#### GET /subscriptions/status/:status
根据状态获取订阅。

#### GET /subscriptions/search
搜索订阅。

**查询参数:**
- `q`: 搜索关键词
- `category`: 分类筛选
- `status`: 状态筛选

#### GET /subscriptions/:id/payment-history
获取订阅的支付历史。

### 受保护接口 (需要登录)

#### POST /protected/subscriptions
创建新订阅。

**请求体:**
```json
{
  "name": "Netflix",
  "plan": "Premium",
  "billing_cycle": "monthly",
  "next_billing_date": "2025-08-01",
  "amount": 15.99,
  "currency": "USD",
  "payment_method_id": 1,
  "start_date": "2025-07-01",
  "status": "active",
  "category_id": 1,
  "renewal_type": "auto",
  "notes": "家庭计划",
  "website": "https://netflix.com"
}
```

#### POST /protected/subscriptions/bulk
批量创建订阅。

#### PUT /protected/subscriptions/:id
更新订阅。

#### DELETE /protected/subscriptions/:id
删除订阅。

#### POST /protected/subscriptions/reset
重置所有订阅数据。

---

## 3. 订阅管理服务 (Subscription Management)

### POST /protected/subscriptions/auto-renew
处理自动续费。

### POST /protected/subscriptions/process-expired
处理过期订阅。

### POST /protected/subscriptions/:id/manual-renew
手动续费订阅。

### POST /protected/subscriptions/:id/reactivate
重新激活订阅。

### POST /protected/subscriptions/batch-process
批量处理订阅。

### GET /protected/subscriptions/stats
获取订阅管理统计。

### GET /protected/subscriptions/upcoming-renewals
预览即将续费的订阅。

---

## 4. 支付历史 (Payment History)

### 公开接口

#### GET /payment-history
获取支付历史列表。

**查询参数:**
- `subscription_id`: 订阅ID筛选
- `start_date`: 开始日期
- `end_date`: 结束日期
- `limit`: 限制数量
- `offset`: 偏移量

#### GET /payment-history/:id
根据ID获取支付记录。

#### GET /payment-history/stats/monthly
获取月度支付统计。

#### GET /payment-history/stats/yearly
获取年度支付统计。

#### GET /payment-history/stats/quarterly
获取季度支付统计。

### 受保护接口 (需要登录)

#### POST /protected/payment-history
创建支付记录。

#### PUT /protected/payment-history/:id
更新支付记录。

#### DELETE /protected/payment-history/:id
删除支付记录。

---

## 5. 数据分析 (Analytics)

#### GET /analytics/monthly-revenue
获取月度收入统计。

#### GET /analytics/monthly-active-subscriptions
获取月度活跃订阅统计。

#### GET /analytics/revenue-trends
获取收入趋势分析。

#### GET /analytics/subscription-overview
获取订阅概览。

---

## 6. 设置管理 (Settings)

### 公开接口

#### GET /settings
获取系统设置。

#### GET /settings/currencies
获取支持的货币列表。

#### GET /settings/themes
获取支持的主题列表。

### 受保护接口 (需要登录)

#### PUT /protected/settings
更新系统设置。

#### POST /protected/settings/reset
重置系统设置。

---

## 7. 汇率管理 (Exchange Rates)

### 公开接口

#### GET /exchange-rates
获取所有汇率。

#### GET /exchange-rates/:from/:to
获取特定汇率。

#### GET /exchange-rates/convert
货币转换。

### 受保护接口

#### POST /protected/exchange-rates
创建或更新汇率。

#### POST /protected/exchange-rates/update
手动更新汇率。

---

## 8. 分类和支付方式管理

### 分类 (Categories)

#### GET /categories
获取所有分类。

#### POST /protected/categories
创建分类。

#### PUT /protected/categories/:value
更新分类。

#### DELETE /protected/categories/:value
删除分类。

### 支付方式 (Payment Methods)

#### GET /payment-methods
获取所有支付方式。

#### POST /protected/payment-methods
创建支付方式。

#### PUT /protected/payment-methods/:value
更新支付方式。

#### DELETE /protected/payment-methods/:value
删除支付方式。

---

## 错误代码

- `400` - 请求参数错误
- `401` - 未授权（未登录或会话无效）
  - 认证失败时返回：`{"error": "Authentication required"}`
  - 会话过期时返回：`{"error": "Session expired"}`
- `404` - 资源未找到
- `500` - 服务器内部错误

## Cookie 和会话管理

### 前端集成说明

使用认证API时，需要在请求中包含会话Cookie：

```javascript
// 登录请求
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 重要：包含会话Cookie
  body: JSON.stringify({
    username: 'admin',
    password: 'your_password'
  })
});

// 访问受保护接口
fetch('/api/protected/subscriptions', {
  method: 'GET',
  credentials: 'include' // 重要：包含会话Cookie
});
```

## 使用示例

### 认证流程示例

#### 1. 登录获取会话
```bash
# 登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }' \
  -c cookie.txt

# 验证登录状态
curl -b cookie.txt http://localhost:3001/api/auth/me
```

#### 2. 使用会话访问受保护接口
```bash
# 创建订阅
curl -X POST http://localhost:3001/api/protected/subscriptions \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{
    "name": "Netflix",
    "plan": "Premium",
    "billing_cycle": "monthly",
    "next_billing_date": "2025-08-01",
    "amount": 15.99,
    "currency": "USD",
    "payment_method_id": 1,
    "category_id": 1,
    "renewal_type": "auto"
  }'

# 获取订阅列表
curl -b cookie.txt http://localhost:3001/api/subscriptions

# 获取月度收入分析
curl -b cookie.txt "http://localhost:3001/api/analytics/monthly-revenue?start_date=2025-01-01&end_date=2025-12-31&currency=USD"
```

#### 3. 登出
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookie.txt
```

### 通知系统示例

#### 发送测试邮件通知
```bash
curl -X POST http://localhost:3001/api/protected/notifications/test \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"channel_type": "email"}'
```

#### 更新通知设置
```bash
curl -X PUT http://localhost:3001/api/protected/notifications/settings/1 \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{
    "notification_channels": ["telegram", "email"],
    "is_enabled": true,
    "advance_days": 7
  }'
```

---

## 9. 通知系统 (Notifications)

### 通知类型
- `renewal_reminder` - 续订提醒
- `expiration_warning` - 过期警告
- `renewal_success` - 续订成功
- `renewal_failure` - 续订失败
- `subscription_change` - 订阅变更

### 支持的通知渠道
- `telegram` - Telegram机器人通知
- `email` - 电子邮件通知

### 公开接口

#### GET /notifications/history
获取通知历史记录。

**查询参数:**
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认20
- `status` (可选): 状态筛选 (sent/failed)
- `type` (可选): 通知类型筛选

#### GET /notifications/stats
获取通知统计信息。

### 受保护接口 (需要登录)

#### GET /protected/notifications/settings/:userId
获取用户的通知设置。

#### PUT /protected/notifications/settings/:id
更新通知设置。

**请求体:**
```json
{
  "is_enabled": true,
  "advance_days": 7,
  "notification_channels": ["telegram", "email"],
  "repeat_notification": false
}
```

#### GET /protected/notifications/channels/:channelType
获取指定类型的渠道配置。

#### POST /protected/notifications/channels
配置通知渠道。

**请求体:**
```json
{
  "channel_type": "telegram",
  "config": {
    "chat_id": "123456789"
  }
}
```

#### POST /protected/notifications/test
发送测试通知。

**请求体:**
```json
{
  "channel_type": "email"
}
```

#### POST /protected/notifications/send
手动发送通知。

**请求体:**
```json
{
  "subscription_id": 42,
  "notification_type": "renewal_reminder",
  "channels": ["telegram", "email"]
}
```

#### GET /protected/scheduler/settings
获取调度器设置。

#### PUT /protected/scheduler/settings
更新调度器设置。

**请求体:**
```json
{
  "notification_check_time": "09:00",
  "timezone": "Asia/Shanghai",
  "is_enabled": true
}
```

#### POST /protected/scheduler/trigger
手动触发通知检查。

---

## 环境配置

### 必需环境变量

```bash
# 服务器配置
PORT=3001
NODE_ENV=production
SESSION_SECRET=your_random_session_secret

# 数据库配置
BASE_CURRENCY=CNY
DATABASE_PATH=/app/data/database.sqlite

# 管理员认证
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password  # 首次启动时使用
ADMIN_PASSWORD_HASH=$2a$12$...  # 生产环境推荐使用

# 汇率API
TIANAPI_KEY=your_tianapi_key

# Telegram通知
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# 邮件通知
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Subscription Manager <no-reply@example.com>
```

---

**注意**: 本文档会随着API的更新而持续维护。如有疑问或发现问题，请提交Issue。
