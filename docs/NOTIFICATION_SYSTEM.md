## 通知系统说明

### 概览
- 目标：为订阅管理提供到期提醒、到期警告、续订结果与订阅变更等通知
- 支持的通知类型：
  - renewal_reminder（续订提醒）
  - expiration_warning（过期警告）
  - renewal_success（续订成功）
  - renewal_failure（续订失败）
  - subscription_change（订阅变更）
- 支持的渠道：telegram、email（SMTP）
- 多语言：zh-CN、en（根据用户偏好语言渲染模板）
- 邮件服务：基于nodemailer，支持多种SMTP提供商（Gmail、Outlook、自定义SMTP等）
- 模板系统：支持HTML邮件模板，自定义样式和品牌化

### 架构与主要组件
- 配置
  - server/config/notification.js：通知类型、渠道、语言、时区及默认值
  - server/config/notificationTemplates.js：多语言、多渠道模板
  - server/config/index.js：邮件服务配置（SMTP设置、认证信息等）
- 服务
  - NotificationService（server/services/notificationService.js）：
    - 统一发送入口（sendNotification）
    - 按渠道发送（sendToChannel）
    - 渲染模板（renderMessageTemplate）
    - 记录历史（createNotificationRecord）
  - TelegramService（server/services/telegramService.js）：调用 Telegram Bot API 发送消息
  - EmailService（server/services/emailService.js）：封装 nodemailer 基于 SMTP 的邮件发送
    - SMTP配置管理
    - HTML和纯文本邮件支持
    - 测试邮件功能
    - 错误处理和重试机制
  - NotificationScheduler（server/services/notificationScheduler.js）：基于 cron 的定时检查与发送
- 控制器与路由
  - NotificationController（server/controllers/notificationController.js）：通知设置、渠道配置、发送/测试、历史、统计、Telegram 工具接口
  - 路由注册（server/routes/notifications.js、server/routes/scheduler.js；在 server/server.js 中挂载 /api 与 /api/protected）
- 前端（部分）
  - src/services/notificationApi.ts：通知相关 API 客户端
  - src/components/notification/*：通知设置 UI（TelegramConfig、EmailConfig、NotificationRules、SchedulerSettings 等）

### 环境变量与运行前置

#### Telegram通知配置
- TELEGRAM_BOT_TOKEN：Telegram Bot Token（必需用于Telegram通知）

#### 邮件通知配置
- EMAIL_HOST：SMTP服务器主机（例如：smtp.gmail.com）
- EMAIL_PORT：SMTP服务器端口（例如：587 for Gmail, 465 for secure）
- EMAIL_SECURE：是否使用SSL/TLS（布尔值，Gmail通常为false）
- EMAIL_USER：SMTP认证用户名（通常是邮箱地址）
- EMAIL_PASSWORD：SMTP认证密码或应用专用密码
- EMAIL_FROM：默认发件人地址（格式：`Subscription Manager <no-reply@example.com>`）
- EMAIL_TLS_REJECT_UNAUTHORIZED：是否验证SSL证书（默认true）
- EMAIL_LOCALE：邮件测试消息的本地化语言（默认zh-CN）

#### 通知系统配置
- NOTIFICATION_DEFAULT_CHANNELS：默认通知渠道JSON字符串（默认["telegram"]）
- NOTIFICATION_DEFAULT_LANGUAGE：默认通知语言（默认zh-CN）

#### 认证配置（用于访问受保护接口）
- SESSION_SECRET：会话密钥（必需）
- ADMIN_USERNAME：管理员用户名（默认admin）
- ADMIN_PASSWORD：管理员密码（首次启动时使用）
- ADMIN_PASSWORD_HASH：管理员密码哈希（生产环境推荐）

注意：所有受保护接口均需基于会话的登录认证。邮件通知需要配置有效的SMTP服务器信息。

### 数据库结构（关键表）

#### notification_settings（通知设置表）
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- notification_type: TEXT NOT NULL UNIQUE（续订提醒、过期警告等）
- is_enabled: BOOLEAN NOT NULL DEFAULT 1（是否启用）
- advance_days: INTEGER DEFAULT 7（提前天数）
- repeat_notification: BOOLEAN NOT NULL DEFAULT 0（是否重复提醒）
- notification_channels: TEXT NOT NULL DEFAULT '["telegram"]'（JSON数组，支持多渠道）
- created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at: DATETIME DEFAULT CURRENT_TIMESTAMP

#### notification_channels（通知渠道配置表）
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- channel_type: TEXT NOT NULL UNIQUE（telegram/email）
- channel_config: TEXT NOT NULL（JSON格式配置）
  - Telegram: `{"chat_id": "123456789"}`
  - Email: `{"email": "user@example.com"}`
- is_active: BOOLEAN NOT NULL DEFAULT 1（是否激活）
- last_used_at: DATETIME（最后使用时间）
- created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at: DATETIME DEFAULT CURRENT_TIMESTAMP

#### notification_history（通知历史表）
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- subscription_id: INTEGER NOT NULL（关联订阅）
- notification_type: TEXT NOT NULL（通知类型）
- channel_type: TEXT NOT NULL（通知渠道）
- status: TEXT NOT NULL CHECK (status IN ('sent', 'failed'))（发送状态）
- recipient: TEXT NOT NULL（接收者标识）
- message_content: TEXT NOT NULL（消息内容）
- error_message: TEXT（错误信息，发送失败时记录）
- sent_at: DATETIME（发送时间）
- created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
- FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE

#### scheduler_settings（调度器设置表）
- id: INTEGER PRIMARY KEY CHECK (id = 1)
- notification_check_time: TEXT NOT NULL DEFAULT '09:00'（检查时间 HH:mm）
- timezone: TEXT NOT NULL DEFAULT 'Asia/Shanghai'（时区）
- is_enabled: BOOLEAN NOT NULL DEFAULT 1（是否启用调度）
- created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at: DATETIME DEFAULT CURRENT_TIMESTAMP

注：具体建表语句、索引和触发器可参考 server/db/migrations.js 文件。

### 模板与多语言
- 模板位于 server/config/notificationTemplates.js，按通知类型/语言/渠道组织。
- 未命中模板时，后备为 NotificationService.getDefaultContent 生成的简短文本。
- 模板变量示例：name、plan、amount、currency、payment_method、next_billing_date、billing_cycle 等。

可用的模板辅助接口（只读）：
- GET /api/templates/languages
- GET /api/templates/types
- GET /api/templates/channels?notificationType=...&language=...
- GET /api/templates/template?notificationType=...&language=...&channel=...
- GET /api/templates/overview

### API 一览（/api/protected 需登录）

- 通知设置（Protected：/api/protected/notifications）
  - GET /settings/:userId
  - GET /settings/:userId/:type
  - PUT /settings/:id
    - body：{ is_enabled, advance_days, notification_channels, repeat_notification }
    - 注：当 notification_type 为 expiration_warning 时，advance_days 将被强制为 0

- 渠道配置（Protected：/api/protected/notifications）
  - POST /channels
    - body：{ channel_type: "telegram"|"email"|"webhook", config: { ... } }
  - GET /channels/:channelType

- 发送与测试（Protected：/api/protected/notifications）
  - POST /send
    - body：{ user_id?, subscription_id, notification_type, channels? }
    - channels 不传时按配置/默认渠道发送
  - POST /test
    - body：{ channel_type }

- 历史与统计（Public：/api/notifications）
  - GET /history?page=&limit=&status=&type=
  - GET /stats

- Telegram 辅助（Protected：/api/protected/notifications）
  - POST /validate-chat-id（body：{ chat_id }）
  - GET /telegram/bot-info
  - GET /telegram/config-status

- 调度器（Scheduler）
  - 公开（/api/scheduler）
    - GET /settings
    - GET /status
  - 受保护（/api/protected/scheduler）
    - PUT /settings（更新通知检查时间、时区、开关）
    - POST /trigger（手动触发一次检查）

请求示例（curl）：

- 更新通知设置
  curl -X PUT \
       -H "Content-Type: application/json" \
       -b cookie.txt -c cookie.txt \
       -d '{"is_enabled":true,"advance_days":7,"notification_channels":["telegram"],"repeat_notification":false}' \
       http://localhost:3001/api/protected/notifications/settings/1

- 配置 Telegram 渠道
  curl -X POST \
       -H "Content-Type: application/json" \
       -b cookie.txt -c cookie.txt \
       -d '{"channel_type":"telegram","config":{"chat_id":"123456789"}}' \
       http://localhost:3001/api/protected/notifications/channels

- 发送测试通知
  curl -X POST \
       -H "Content-Type: application/json" \
       -b cookie.txt -c cookie.txt \
       -d '{"channel_type":"telegram"}' \
       http://localhost:3001/api/protected/notifications/test

- 手动发送通知
  curl -X POST \
       -H "Content-Type: application/json" \
       -b cookie.txt -c cookie.txt \
       -d '{"subscription_id":42,"notification_type":"renewal_reminder","channels":["telegram"]}' \
       http://localhost:3001/api/protected/notifications/send

- 更新调度器设置
  curl -X PUT \
       -H "Content-Type: application/json" \
       -b cookie.txt -c cookie.txt \
       -d '{"notification_check_time":"09:00","timezone":"Asia/Shanghai","is_enabled":true}' \
       http://localhost:3001/api/protected/scheduler/settings

### 发送流程（服务端逻辑要点）
1) 校验通知类型是否受支持
2) 读取通知设置（启用状态、提前天数、渠道等）
3) 加载订阅数据（subscription_id）
4) 根据用户语言偏好选择模板并渲染内容（未命中模板则使用默认文案）
5) 按启用的渠道并行发送（当前支持 telegram）
6) 将结果写入 notification_history（sent/failed、时间戳、错误信息）

### 调度器行为
- 在 scheduler_settings 中配置每日检查时间与时区（HH:mm），由 node-cron 生成表达式并在对应时区执行
- checkAndSendNotifications 将扫描需要提醒/警告的订阅并调用 sendNotification 执行发送

### Telegram 配置指引
- 配置 TELEGRAM_BOT_TOKEN 环境变量
- 通过 /api/protected/notifications/validate-chat-id 校验 chat_id 合法性
- 通过 /api/protected/notifications/channels 保存 chat_id 配置
- 使用 /api/protected/notifications/test 进行渠道连通性测试

### 邮件通知配置指引

#### 1. SMTP服务器配置
在 `.env` 文件中配置以下环境变量：

```bash
# Gmail SMTP配置示例
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password  # Gmail需要应用专用密码
EMAIL_FROM=Subscription Manager <no-reply@example.com>
EMAIL_LOCALE=zh-CN

# Outlook SMTP配置示例
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@outlook.com
EMAIL_PASSWORD=your_password
EMAIL_FROM=Subscription Manager <no-reply@outlook.com>
```

#### 2. 获取应用专用密码（Gmail）
1. 启用Gmail的"不够安全的应用访问"或使用应用专用密码
2. 在Google账户设置中生成应用专用密码
3. 将生成的16位密码（不含空格）填入 EMAIL_PASSWORD

#### 3. 配置邮件渠道
```bash
# 通过API配置邮件渠道
curl -X POST \
  -H "Content-Type: application/json" \
  -b cookie.txt -c cookie.txt \
  -d '{"channel_type":"email","config":{"email":"your_email@example.com"}}' \
  http://localhost:3001/api/protected/notifications/channels
```

#### 4. 测试邮件发送
```bash
# 发送测试邮件
curl -X POST \
  -H "Content-Type: application/json" \
  -b cookie.txt -c cookie.txt \
  -d '{"channel_type":"email"}' \
  http://localhost:3001/api/protected/notifications/test
```

#### 5. 邮件模板定制
邮件使用HTML模板，包含品牌样式和格式化内容：
- 支持响应式设计
- 包含公司标志和品牌色彩
- 多语言内容支持
- 格式化的订阅信息展示

### 错误处理与排查
- **401：未登录或会话无效**
  - 确保已通过 `/api/auth/login` 登录
  - 检查会话Cookie是否有效
  - 会话默认12小时后过期

- **400：请求参数校验失败**
  - 检查请求参数格式和必需字段
  - 查看控制器内的validator错误详情

- **Telegram 发送失败常见原因：**
  - 未配置 TELEGRAM_BOT_TOKEN 环境变量
  - chat_id 无效或机器人未与用户/群聊建立会话
  - 网络连接问题或 Telegram API 临时不可用
  - 错误信息记录在 notification_history.error_message 字段

- **邮件发送失败常见原因：**
  - SMTP配置错误（EMAIL_HOST、EMAIL_PORT、EMAIL_USER、EMAIL_PASSWORD）
  - 网络连接问题或SMTP服务器不可用
  - 认证失败（用户名/密码错误或应用专用密码问题）
  - SSL/TLS配置问题（EMAIL_SECURE设置不正确）
  - 发件人邮箱未正确验证或被限制
  - 接收者邮箱地址无效或被标记为垃圾邮件

### 扩展与定制

#### 新增通知渠道
1. **在NotificationService中添加渠道支持：**
   - 在 `sendToChannel` 方法中增加新的渠道分支
   - 实现具体的发送逻辑（例如：Slack、Discord、Webhook等）
   - 添加错误处理和重试机制

2. **更新配置和校验：**
   - 在 `server/config/notification.js` 中添加新的 `channel_type`
   - 在验证器中添加新的渠道类型校验
   - 更新环境变量配置

3. **添加模板支持：**
   - 在 `server/config/notificationTemplates.js` 中为新渠道添加模板
   - 支持HTML和纯文本格式
   - 添加模板变量映射

#### 邮件通知定制
- **自定义邮件模板：** 修改 `server/config/notificationTemplates.js` 中的HTML模板
- **品牌化：** 自定义邮件头部、颜色、标志等样式
- **SMTP配置：** 支持自定义SMTP服务器配置
- **批量发送：** 支持一次发送多封邮件的优化

#### 自定义模板
- 在 `server/config/notificationTemplates.js` 中增添对应类型/语言/渠道的模板
- 支持HTML和纯文本两种格式
- 模板变量包括：订阅信息、用户信息、格式化的金额和日期等

#### 多语言支持
- 通过用户偏好设置（UserPreferenceService）或 `NOTIFICATION_DEFAULT_LANGUAGE` 控制模板语言
- 支持中英文切换
- 日期、货币等本地化格式化

#### 高级功能扩展
- **邮件附件支持：** 为通知邮件添加PDF报告等附件
- **邮件队列：** 实现异步邮件发送队列，提升性能
- **发送统计：** 详细的邮件发送成功率和错误统计
- **A/B测试：** 不同邮件模板的效果对比测试

### 参考文件

#### 后端核心文件
- server/config/notification.js - 通知系统配置
- server/config/notificationTemplates.js - 通知模板定义
- server/config/index.js - 邮件服务配置
- server/services/notificationService.js - 通知服务主类
- server/services/notificationScheduler.js - 通知调度器
- server/services/telegramService.js - Telegram服务
- server/services/emailService.js - 邮件服务
- server/controllers/notificationController.js - 通知控制器
- server/routes/notifications.js - 通知路由
- server/routes/scheduler.js - 调度器路由
- server/server.js - 服务器入口和路由注册

#### 前端文件
- src/services/notificationApi.ts - 通知API客户端
- src/components/notification/* - 通知设置UI组件
  - EmailConfig.tsx - 邮件配置组件
  - NotificationHistory.tsx - 通知历史组件
  - NotificationRules.tsx - 通知规则组件
  - NotificationSettings.tsx - 通知设置组件

#### 数据库相关
- server/db/migrations.js - 数据库迁移脚本
- server/db/schema.sql - 数据库结构定义
