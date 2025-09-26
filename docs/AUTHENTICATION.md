# 认证概述

本文档解释了订阅管理系统在从API密钥检查迁移到基于会话登录后的认证工作原理。

## 高层设计

- **基于会话的认证**：后端使用 `express-session` 在成功登录后颁发仅限HTTP的Cookie。该Cookie仅存储会话ID，用户数据保存在服务器端的会话存储（默认情况下为内存存储）。
- **单一管理员账户**：通过环境变量配置一个管理员用户。所有发送到 `/api/**` 或 `/api/protected/**` 的请求必须来自经过认证的会话。
- **前端保护**：React应用在启动时获取当前会话（`GET /api/auth/me`），并在检查完成之前阻止所有受保护的路由。
- **通知系统集成**：所有通知相关的配置和管理功能都通过相同的会话认证系统进行保护，确保只有认证用户才能配置和使用通知功能。

## 配置

在 `.env` 文件中设置以下环境变量（后端根目录或项目根目录，具体取决于部署方式）：

```
SESSION_SECRET=your_random_session_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

服务器启动时会从 `ADMIN_PASSWORD` 派生出一个bcrypt哈希值，记录一次并将哈希保存在内存中。将生成的值复制到 `ADMIN_PASSWORD_HASH` 中，并删除 `ADMIN_PASSWORD` 以用于生产环境部署。

其他注意事项：

- `SESSION_SECRET` 必须是一个长随机字符串，以确保会话Cookie无法被伪造。如果缺失，后端会为每个进程生成一个临时密钥并打印警告；这样会导致每次重启时会话失效，因此建议明确设置。
- `ADMIN_PASSWORD_HASH`（如果提供）优先于明文密码。它应是使用成本≥12生成的bcrypt哈希值。
- 密钥轮换：更新 `ADMIN_USERNAME` 或 `ADMIN_PASSWORD_HASH` 需要重启服务器。现有会话在到期前仍然有效。



## SESSION_SECRET 与 ADMIN_PASSWORD_HASH 生成方法

### SESSION_SECRET 生成方法

- 推荐使用高强度随机字符串，长度不少于 32 字节。
- 可通过如下命令生成：

```bash
openssl rand -base64 48
```

- 生成后将结果粘贴到 `.env` 文件的 `SESSION_SECRET` 变量中。

### ADMIN_PASSWORD_HASH 生成方法

有两种方式：

#### 方式A：系统自动生成（推荐）

1. 在 `.env` 中设置明文 `ADMIN_PASSWORD`，如：

   ```bash
   ADMIN_PASSWORD=your_secure_password
   ```

2. 启动后端服务，控制台会输出生成的 `ADMIN_PASSWORD_HASH`。

3. 将该哈希复制到 `.env` 的 `ADMIN_PASSWORD_HASH`，并删除明文 `ADMIN_PASSWORD`。

4. 重启服务。

#### 方式B：手动离线生成

- 使用 bcrypt 工具（如 Node.js、Python、在线工具等），成本因子建议 ≥ 12。

- Node.js 示例：

  ```js
  // 安装 bcryptjs
  npm install -g bcryptjs
  // 生成哈希
  npx bcryptjs your_secure_password 12
  ```

- 将生成的哈希粘贴到 `.env` 的 `ADMIN_PASSWORD_HASH`。

### 安全建议

- 切勿将 `.env` 文件提交到版本控制。
- 仅保留 `ADMIN_PASSWORD_HASH`，删除明文 `ADMIN_PASSWORD`。
- `SESSION_SECRET` 和 `ADMIN_PASSWORD_HASH` 建议通过安全渠道管理和注入。
- 详细流程和常见问题见本文件其余章节。



## ADMIN_PASSWORD 与 ADMIN_PASSWORD_HASH 使用指南

本系统使用单一管理员账户。管理员密码有两种配置方式：明文 `ADMIN_PASSWORD` 与哈希 `ADMIN_PASSWORD_HASH`，两者的优先级与生效时机如下。

- 优先级：`ADMIN_PASSWORD_HASH` > `ADMIN_PASSWORD`
- 读取与缓存时机：在后端进程启动时由 `server/config/authCredentials.js` 的 `getAdminCredentials()` 读取一次，并写入内存缓存 `cachedCredentials`；之后整个进程生命周期都仅使用内存中的值，不会在每个请求动态读取 `.env`。
- 登录校验：`/api/auth/login` 使用 `bcrypt.compare(plain, cachedHash)` 验证（参见 `server/routes/auth.js`）。

### 首次启动与推荐生产流程

1. 在 `.env` 中设置：
   - `SESSION_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`（明文，仅在首次或轮换时临时使用）
2. 启动后端。启动日志会打印派生的哈希：`ADMIN_PASSWORD_HASH=...`。
3. 将打印出的值复制到 `.env` 的 `ADMIN_PASSWORD_HASH`，并删除明文 `ADMIN_PASSWORD`。
4. 重启后端。之后将只依赖 `ADMIN_PASSWORD_HASH`，不会再重新生成或改变。

示例：

首次启动（开发/临时）

```
SESSION_SECRET=change_me_to_a_long_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

固化为生产（推荐）

```
SESSION_SECRET=long_random_string_generated_once
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# 删除 ADMIN_PASSWORD
```

### 为什么重启时哈希会变化？

当仅配置了明文 `ADMIN_PASSWORD` 而未提供 `ADMIN_PASSWORD_HASH` 时，系统在每次启动都会用随机盐执行一次 bcrypt，因此打印的哈希每次都不同。这是 bcrypt 的正常安全特性（即使密码相同，盐不同导致哈希不同）。将打印出的哈希写入 `ADMIN_PASSWORD_HASH` 并删除明文后，重启将不再变化。

### 运行时是否会再读取 `.env` 或重新生成？

不会。凭证在进程启动时被读取并缓存到内存。登录校验始终使用该内存值。只有在你修改 `.env` 并重启进程后，新的值才会生效。

### 密码轮换（更改管理员密码）

- 方式 A（在线一次性生成）：
  1) 在 `.env` 暂时设置 `ADMIN_PASSWORD=new_secure_password`（保留原有 `ADMIN_PASSWORD_HASH` 亦可）。
  2) 启动一次后端，复制日志中打印的 `ADMIN_PASSWORD_HASH`。
  3) 用新哈希替换 `.env` 中的 `ADMIN_PASSWORD_HASH`，并移除明文 `ADMIN_PASSWORD`。
  4) 重启后端。

- 方式 B（离线生成）：
  - 使用 bcrypt 工具以成本因子 ≥ 12 生成哈希，直接写入 `ADMIN_PASSWORD_HASH`，重启后端。

注意：轮换后，已建立的会话在到期前仍然有效；新登录将使用新哈希进行校验。

### 运维与安全建议

- 为 `SESSION_SECRET` 设置稳定且足够随机的值。若缺失或每次启动生成临时密钥，会导致重启后所有会话失效。
- 生产环境使用持久化的 session 存储（如 Redis）替代默认内存存储，以避免重启丢失会话。
- 切勿将 `.env` 提交到版本控制。使用环境注入或密钥管理服务（KMS/Secrets Manager）。
- 仅保留 `ADMIN_PASSWORD_HASH`，删除明文 `ADMIN_PASSWORD`，减少凭证暴露面。
- 通过 HTTPS 提供服务，确保 Cookie 的 `secure` 标志生效。

### 常见问题（FAQ）

- 需要每次重启都修改 `.env` 吗？
  - 不需要。只有在首次设置或更换密码时需要更新。一旦 `ADMIN_PASSWORD_HASH` 固定在 `.env` 中，后续重启不会改变。

- 为什么我每次重启都看到新的哈希被打印？
  - 说明仍在通过明文 `ADMIN_PASSWORD` 启动。请把日志中的哈希复制到 `ADMIN_PASSWORD_HASH` 并删除明文。

- 同时设置了 `ADMIN_PASSWORD` 和 `ADMIN_PASSWORD_HASH` 会怎样？
  - 系统优先使用 `ADMIN_PASSWORD_HASH`，忽略明文。生产推荐仅保留哈希。

- 修改 `.env` 后为什么没有生效？
  - 需要重启后端进程。凭证在启动时读取一次并缓存到内存，运行中不会热更新。

## 后端流程

1. **会话中间件（`server/middleware/session.js`）**
   - 配置 `express-session`：
     - Cookie名称 `sid`
     - 12小时最大有效期
     - `httpOnly=true`
     - 当 `NODE_ENV=production` 时，`secure=true`
     - `sameSite=lax`
   - 加载或生成 `SESSION_SECRET`。

2. **凭证初始化（`server/config/authCredentials.js`）**
   - 读取 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH` 和 `ADMIN_PASSWORD`。
   - 如果两个密码变量都不存在，进程会显示明确错误并退出。
   - 如果仅提供 `ADMIN_PASSWORD`，会使用bcrypt对其进行哈希处理并记录指导信息以持久化哈希值。

3. **认证路由（`server/routes/auth.js`）**
   - `POST /api/auth/login` 使用 `bcrypt.compare` 验证用户名和密码，并将 `{ username, role: 'admin' }` 存储在 `req.session.user` 中。
   - `POST /api/auth/logout` 销毁会话并清除Cookie。
   - `GET /api/auth/me` 返回当前会话用户或在未认证时返回 `401`。

4. **路由保护（`server/middleware/requireLogin.js`）**
   - 所有挂载在 `/api` 和 `/api/protected` 下的路由都会应用此中间件。任何没有 `req.session.user` 的请求都会收到 `401 认证要求`。
   - 公共端点（例如 `/api/auth/login`、静态资源）在保护中间件之前挂载。

5. **数据库和调度器启动**
   - 不受认证重构影响；诸如汇率轮询等任务在会话中间件注册后立即运行，因此它们在经过认证的API模型下操作，无需特殊处理。

## 前端流程

1. 在应用挂载时，`useAuthStore.fetchMe()` 调用 `GET /api/auth/me` 获取凭证（`fetch` 使用 `credentials: 'include'`）。
2. `App.tsx` 等待认证存储完成初始化后再渲染受保护的路由。在此之前会显示加载动画。如果没有用户，会重定向到 `/login`。
3. 登录页面将凭证发送到 `/api/auth/login`。成功后会重新获取 `/api/auth/me`，存储用户信息，并导航到仪表盘。
4. 登出触发 `POST /api/auth/logout` 并清除本地状态；用户在下一次路由变更时被返回到 `/login`。

## Cookie行为与安全性

- Cookie限定于后端的来源（`/api`）。前端代码不会直接操作它们。
- 在通过HTTPS部署的生产环境中，`secure: true` 确保Cookie仅通过TLS传输。
- 会话生命周期限制为12小时。如果浏览器清除会话Cookie，则关闭浏览器会提前结束会话。
- 因为默认的会话存储是基于内存的，服务器重启时会话会丢失。需要持久化的部署应通过 `express-session` 配置插入存储（例如Redis）。

## 故障模式与排查

- **每个请求都返回401**：确保设置了 `SESSION_SECRET`、`ADMIN_USERNAME` 和 `ADMIN_PASSWORD_HASH` 或 `ADMIN_PASSWORD`；编辑 `.env` 后重启服务器。
- **重启后意外登出**：发生在未明确配置 `SESSION_SECRET` 的情况下。设置固定密钥以维护会话连续性。
- **更改密码后无法登录**：确认新bcrypt哈希替换了旧哈希，然后重启服务器。如果会话仍使用过期凭证，请清除浏览器Cookie。
- **前端卡在加载动画**：表明 `/api/auth/me` 请求失败。检查浏览器网络标签中的401响应以及后端日志中的配置错误。
