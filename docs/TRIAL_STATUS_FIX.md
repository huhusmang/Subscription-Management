# Trial Status Support Fix - 试用状态支持修复

> **版本兼容性说明**: 如果您使用的是 2025年7月22日之前的版本，请参考本文档进行修复。

## 问题描述 | Problem Description

在早期版本中，系统的订阅状态验证只支持 `active`、`inactive`、`cancelled` 三种状态，不支持 `trial`（试用）状态。当用户尝试创建状态为 `trial` 的订阅时，会出现以下验证错误：

```json
{
    "success": false,
    "message": "Validation failed",
    "error": true,
    "errors": [
        {
            "field": "status",
            "message": "status must be one of: active, inactive, cancelled"
        }
    ]
}
```

## 解决方案 | Solution

从最新版本重新部署应用，系统会自动执行数据库迁移，添加对 `trial` 状态的支持。

## 修复步骤 | Fix Steps

### 1. 获取最新版本代码

```bash
# 拉取最新代码
git pull origin main
```

### 2. Docker 部署环境修复

```bash
# 停止当前容器
sudo docker compose down

# 强制重新构建镜像（不使用缓存）
sudo docker compose build --no-cache

# 重新启动容器
sudo docker compose up -d
```

### 3. 验证修复 (Verify Fix)

修复完成后，检查容器日志确认迁移成功：

```bash
sudo docker logs subscription-manager --tail 20
```

应该看到类似以下的迁移成功日志：

```
⏳ Running migration 2: add_trial_status_support
🔄 Adding trial status support to subscriptions table...
✅ Trial status support added successfully
✅ Migration 2 completed
🎉 All migrations completed successfully!
```

### 4. 测试API功能

修复后，使用包含 `"status":"trial"` 的订阅创建请求，应该不再出现验证错误。

## 支持的状态值 | Supported Status Values

修复后，系统支持以下订阅状态：

- `active` - 活跃状态
- `inactive` - 非活跃状态  
- `cancelled` - 已取消状态
- `trial` - 试用状态

## 注意事项 | Important Notes

1. **数据备份**: 建议在操作前备份 Docker volume 中的数据库文件
2. **自动迁移**: 最新版本会在启动时自动执行数据库迁移
3. **零停机时间**: 迁移过程保持数据完整性，现有数据不受影响
4. **向后兼容**: 支持所有原有状态值，新增 `trial` 状态

## 故障排除 | Troubleshooting

如果部署后仍出现验证错误，请：
1. 检查容器日志确认迁移成功
2. 确保使用的是最新构建的镜像
3. 验证容器重启完成

## 版本信息 | Version Information

- **修复版本**: v1.1.0+
- **影响版本**: 2025年7月22日之前的所有版本
- **修复日期**: 2025年1月22日

---

**Created by**: Auto-fix Documentation Generator  
**Last Updated**: 2025-01-22 