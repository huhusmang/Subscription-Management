# 部署指南

本文档介绍如何使用已发布在 GitHub 容器注册表（GHCR）的 Docker 镜像结合 Docker Compose 运行本项目。

## 从 GHCR 拉取镜像

```bash
# 拉取最新标签
docker pull ghcr.io/huhusmang/subscription-management:latest

# 拉取指定标签（示例）
docker pull ghcr.io/huhusmang/subscription-management:main
docker pull ghcr.io/huhusmang/subscription-management:sha-<short_sha>
```

镜像包页面会展示所有可用版本。

## Docker Compose

仓库内置了可直接使用的 `docker-compose.yml`，默认拉取已发布镜像。

```yaml
version: '3.8'

services:
  subscription-manager:
    image: ghcr.io/huhusmang/subscription-management:${IMAGE_TAG:-latest}
    container_name: subscription-manager
    env_file:
      - .env
    ports:
      - "${PORT:-3001}:${PORT:-3001}"
    volumes:
      - subscription-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "const http=require('http');http.get('http://localhost:${PORT:-3001}/api/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1));"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  subscription-data:
    driver: local
```

启动：

```bash
docker compose up -d
```

如需本地构建而非拉取：注释掉 `image:` 行，并启用服务内的 `build:` 段。

## 环境变量

在项目根目录创建 `.env` 文件。完整清单参见根目录 README 的“环境变量”一节。常用变量示例：

```bash
PORT=3001
DATABASE_PATH=/app/data/database.sqlite
SESSION_SECRET=your_random_session_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# 可选：指定 Compose 使用的镜像标签
# IMAGE_TAG=main
```

## 数据持久化

- 应用状态位于容器内路径 `/app/data`。
- Compose 文件使用名为 `subscription-data` 的卷持久化 SQLite 数据库及相关文件。

## 健康检查

- 服务在端口 `PORT`（默认 3001）暴露 `/api/health` 健康检查端点。


