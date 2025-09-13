## 通知系统说明

### 概览
- 目标：为订阅管理提供到期提醒、到期警告、续订结果与订阅变更等通知
- 支持的通知类型：
  - renewal_reminder（续订提醒）
  - expiration_warning（过期警告）
  - renewal_success（续订成功）
  - renewal_failure（续订失败）
  - subscription_change（订阅变更）
- 支持的渠道：telegram（已实现）、email（占位/预留）
- 多语言：zh-CN、en（根据用户偏好语言渲染模板）

### 架构与主要组件
- 配置
  - server/config/notification.js：通知类型、渠道、语言、时区及默认值
  - server/config/notificationTemplates.js：多语言、多渠道模板
- 服务
  - NotificationService（server/services/notificationService.js）：
    - 统一发送入口（sendNotification）
    - 按渠道发送（sendToChannel）
    - 渲染模板（renderMessageTemplate）
    - 记录历史（createNotificationRecord）
  - TelegramService（server/services/telegramService.js）：调用 Telegram Bot API 发送消息
  - NotificationScheduler（server/services/notificationScheduler.js）：基于 cron 的定时检查与发送
- 控制器与路由
  - NotificationController（server/controllers/notificationController.js）：通知设置、渠道配置、发送/测试、历史、统计、Telegram 工具接口
  - 路由注册（server/routes/notifications.js、server/routes/scheduler.js；在 server/server.js 中挂载 /api 与 /api/protected）
- 前端（部分）
  - src/services/notificationApi.ts：通知相关 API 客户端
  - src/components/notification/*：通知设置 UI（TelegramConfig、NotificationRules、SchedulerSettings 等）

### 环境变量与运行前置
- TELEGRAM_BOT_TOKEN：Telegram Bot Token
- NOTIFICATION_DEFAULT_CHANNELS（可选，JSON 字符串，默认 ["telegram"]）
- NOTIFICATION_DEFAULT_LANGUAGE（可选，默认 zh-CN）

注意：受保护接口需登录后访问（会话鉴权）。

### 数据库结构（关键表）
- notification_settings（每种通知类型一条，支持用户维度）
  - id, user_id
  - notification_type（见上方类型枚举）
  - is_enabled（是否启用）
  - advance_days（提前天数；expiration_warning 固定为 0）
  - notification_channels（JSON，示例：["telegram"]）
  - repeat_notification（是否重复提醒）
  - created_at, updated_at
- notification_channels（各渠道配置）
  - id
  - channel_type（telegram/email）
  - channel_config（JSON，如 Telegram 的 chat_id 等）
  - is_active, last_used_at
  - created_at, updated_at
- notification_history（发送历史）
  - id, user_id, subscription_id
  - notification_type, channel_type
  - status（sent/failed）
  - recipient, message_content, error_message
  - sent_at, created_at
- scheduler_settings（通知定时器设置）
  - user_id（单用户系统固定为 1）
  - notification_check_time（如 "09:00"）
  - timezone（如 "Asia/Shanghai"）
  - is_enabled, created_at, updated_at

注：具体建表/索引可参考 server/db/migrations.js 与 .specstory 变更记录。

### 模板与多语言
- 模板位于 server/config/notificationTemplates.js，按通知类型/语言/渠道组织。
- 未命中模板时，后备为 NotificationService.getDefaultMessage 生成的简短文本。
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

### 错误处理与排查
- 401：未登录或会话无效
- 400：请求参数校验失败（见控制器内 validator）
- Telegram 发送失败常见原因：
  - 未配置 TELEGRAM_BOT_TOKEN
  - chat_id 无效或机器人未与用户/群聊建立会话
  - 网络或 Telegram API 返回错误（记录在 notification_history.error_message）

### 扩展与定制
- 新增渠道：
  - 在 NotificationService.sendToChannel 中增加渠道分支及发送实现
  - 在配置与校验中加入新的 channel_type
  - 为新渠道添加模板与模板变量映射
- 自定义模板：
  - 在 server/config/notificationTemplates.js 中增添对应类型/语言/渠道的模板
- 多语言：
  - 通过用户偏好（UserPreferenceService）或 NOTIFICATION_DEFAULT_LANGUAGE 控制模板语言

### 参考文件
- server/config/notification.js
- server/config/notificationTemplates.js
- server/services/notificationService.js
- server/services/notificationScheduler.js
- server/services/telegramService.js
- server/controllers/notificationController.js
- server/routes/notifications.js、server/routes/scheduler.js、server/server.js
- src/services/notificationApi.ts、src/components/notification/*

