# 订阅管理系统 (Subscription Management System)

[English](README.md) | [简体中文](README.zh-CN.md)

一个现代化的订阅管理系统，帮助用户轻松管理和追踪各种订阅服务的费用和续费情况。

## 📸 界面预览

### 仪表板 - 智能费用概览
![仪表板](docs/images/dashboard.png)
*智能仪表板展示月度/年度支出统计、即将到期的订阅提醒和分类费用分析*

### 订阅管理 - 完整服务管理
![订阅管理](docs/images/subscriptions.png)
*完整的订阅生命周期管理，支持添加、编辑、状态管理和批量导入*

### 支付历史 - 详细记录追踪
![支付历史](docs/images/subscriptions-payments.png)
*完整的支付历史记录，支持搜索，以及订单的增删改查*

### 月度费用 - 趋势分析
![月度费用](docs/images/monthly-expense.png)
*月度支出订单，直观展示支出详情*

### 费用报告 - 深度数据分析
![费用报告](docs/images/reports.png)
*强大的费用分析功能，包含趋势图表、分类统计和多维度数据展示*

### 深色主题 - 现代化界面
![深色主题报告](docs/images/reports-dark.png)
*支持深色主题*

## 🌟 项目特色

- **智能订阅管理** - 全面的订阅生命周期管理，支持自动/手动续费
- **多币种支持** - 支持7种主要货币，实时汇率自动更新
- **费用分析报告** - 强大的数据分析和可视化图表功能
- **响应式设计** - 完美适配桌面和移动端
- **本地优先** - 基于SQLite的本地数据存储，保护隐私
- **Docker部署** - 一键部署，开箱即用

## 📊 功能特性

### 核心功能
- ✅ **订阅管理** - 添加、编辑、删除订阅服务
- ✅ **智能仪表板** - 支出概览和即将到期提醒
- ✅ **分类统计** - 按类别、支付方式统计费用
- ✅ **搜索筛选** - 多维度搜索和状态筛选
- ✅ **自定义配置** - 自定义分类和支付方式

### 高级功能
- ✅ **自动续费处理** - 智能检测到期订阅并自动更新
- ✅ **多币种支持** - 9种主要货币实时转换 (USD, EUR, GBP, CAD, AUD, JPY, CNY, TRY, HKD)
- ✅ **汇率自动更新** - 集成天行数据API，每日更新汇率
- ✅ **费用报告仪表板** - 全面的费用分析和可视化
- ✅ **支付历史追踪** - 完整的支付记录和历史分析
- ✅ **数据导入导出** - CSV、Json格式数据导入导出
- ✅ **主题切换** - 支持浅色/深色/系统主题
- ✅ **国际化支持 (i18n)** - 多语言支持，包含中英文界面
- ✅ **多渠道通知系统** - 支持Telegram和Email的智能通知提醒系统

## 🛠 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **路由**: React Router
- **图表**: Recharts
- **UI组件**: Radix UI
- **国际化**: React i18next + i18next-browser-languagedetector

### 后端
- **运行时**: Node.js
- **框架**: Express 5
- **数据库**: SQLite + better-sqlite3
- **定时任务**: node-cron
- **认证**: 基于会话（Session）的登录（bcrypt密码哈希），所有接口需登录
- **通知服务**: Telegram Bot API + 邮件通知（SMTP with nodemailer）
- **会话管理**: express-session with HTTP-only cookies
- **密码哈希**: bcryptjs 用于安全的密码存储

### 部署
- **容器化**: Docker + Docker Compose
- **进程管理**: dumb-init
- **健康检查**: 内置健康检查端点

## 🚀 快速开始

### 环境要求
- Node.js 20+
- Docker & Docker Compose (推荐)

### Docker 部署 (推荐)

1. **克隆项目**
```bash
git clone <repository-url>
cd subscription-management
```

2. **配置环境变量**
```bash
cp .env.production.example .env
# 编辑 .env 文件，设置必要的配置
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **访问应用**
- 前端界面: http://localhost:3001

### 本地开发

1. **安装依赖**
```bash
# 前端依赖
npm install

# 后端依赖
cd server
npm install
cd ..
```

2. **初始化数据库**
```bash
cd server
npm run db:init
cd ..
```

3. **启动开发服务**
```bash
# 启动后端 (终端1)
cd server
npm start

# 启动前端 (终端2)
npm run dev
```
前端界面: http://localhost:5173
后端服务: http://localhost:3001/api

## 🔧 配置说明

### 环境变量

创建 `.env` 文件并配置以下变量：

> **关于 SESSION_SECRET 与 ADMIN_PASSWORD_HASH 的生成方法**：
>
> - `SESSION_SECRET` 建议使用足够长度的高强度随机字符串（可用 `openssl rand -base64 48` 生成）。
> - `ADMIN_PASSWORD_HASH` 推荐通过首次启动时由系统自动生成，或使用 bcrypt 工具（成本因子≥12）离线生成。
> - 详细操作步骤与安全建议请参见 [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md#session_secret-与-admin_password_hash-生成方法)。

```bash
# 服务端口 (可选，默认3001)
PORT=3001

# 基础货币 (可选，默认CNY)
# 支持的货币: USD, EUR, GBP, CNY, JPY, CAD, AUD, TRY, HKD
BASE_CURRENCY=CNY

# 数据库路径 (Docker部署时使用)
DATABASE_PATH=/app/data/database.sqlite

# 天行数据API密钥 (可选，用于实时汇率更新)
# 获取密钥: https://www.tianapi.com/
TIANAPI_KEY=your_tianapi_key_here

# 会话认证（必填）
SESSION_SECRET=your_random_session_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
# ADMIN_PASSWORD_HASH=your_password_hash (可选）
# 首次启动时会输出生成的 ADMIN_PASSWORD_HASH，可将其复制到 .env 并删除 ADMIN_PASSWORD 以提升安全性。

# Telegram 通知设置 (可选，用于 Telegram 通知)
# 从Telegram的@BotFather获取
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# 邮件通知设置 (可选，用于邮件通知)
# SMTP服务器配置 (Gmail示例)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Subscription Manager <no-reply@example.com>
EMAIL_LOCALE=zh-CN

# 通知设置
NOTIFICATION_DEFAULT_CHANNELS=["telegram"]
NOTIFICATION_DEFAULT_LANGUAGE=zh-CN
SCHEDULER_TIMEZONE=Asia/Shanghai
SCHEDULER_CHECK_TIME=09:00
NOTIFICATION_DEFAULT_ADVANCE_DAYS=7
NOTIFICATION_DEFAULT_REPEAT_NOTIFICATION=false
```

### 数据库管理

```bash
# 初始化数据库
npm run db:init

# 运行迁移
npm run db:migrate

# 重置数据库
npm run db:reset
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情
