# 订阅管理系统 API 文档

## 概述

本API提供完整的订阅管理功能，包括订阅CRUD操作、支付历史追踪、数据分析、设置管理、汇率处理等核心功能。

**基础URL:** `http://localhost:3001/api`  
**受保护API基础URL:** `http://localhost:3001/api/protected`

## 认证机制

所有接口均需要登录后访问（基于会话的身份验证）。

相关端点：

- `POST /api/auth/login`（请求体包含 `username`, `password`）
- `POST /api/auth/logout`
- `GET /api/auth/me`

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
- **订阅管理** - 订阅CRUD操作和查询
- **订阅管理服务** - 续费、过期处理等高级功能
- **支付历史** - 支付记录管理和统计
- **数据分析** - 收入分析和趋势统计
- **月度分类汇总** - 按分类的月度支出统计
- **设置管理** - 系统设置和用户偏好
- **汇率管理** - 汇率数据和货币转换
- **分类管理** - 订阅分类CRUD
- **支付方式管理** - 支付方式CRUD
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
- `404` - 资源未找到
- `500` - 服务器内部错误

## 使用示例

### 创建订阅
```bash
curl -X POST http://localhost:3001/api/protected/subscriptions \
  -H "Content-Type: application/json" \
  -b cookie.txt -c cookie.txt \
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
```

### 获取订阅列表
```bash
curl http://localhost:3001/api/subscriptions
```

### 获取月度收入分析
```bash
curl "http://localhost:3001/api/analytics/monthly-revenue?start_date=2025-01-01&end_date=2025-12-31&currency=USD"
```

---

**注意**: 本文档会随着API的更新而持续维护。如有疑问或发现问题，请提交Issue。
