const NotificationService = require('../services/notificationService');
const TelegramService = require('../services/telegramService');
const responseHelper = require('../utils/responseHelper');
const {
    validateNotificationSetting,
    validateChannelConfig,
    validateSendNotification,
    createValidator
} = require('../utils/validator');

class NotificationController {
    constructor() {
        this.notificationService = new NotificationService();
        this.telegramService = new TelegramService();
    }

    /**
     * 获取通知设置
     */
    getSettings = (req, res) => {
        try {
            const settings = this.notificationService.getNotificationSettings(req.params.type);
            
            if (!settings) {
                return responseHelper.notFound(res, 'Notification settings not found');
            }

            responseHelper.success(res, settings);
        } catch (error) {
            console.error('Error getting notification settings:', error);
            responseHelper.error(res, 'Failed to get notification settings', 500);
        }
    };

    /**
     * 获取所有通知设置
     */
    getAllSettings = (req, res) => {
        try {
            const db = this.notificationService.db;

            const query = `
                SELECT * FROM notification_settings
                ORDER BY notification_type
            `;
            const settings = db.prepare(query).all();

            // Parse JSON fields
            const parsedSettings = settings.map(setting => ({
                ...setting,
                notification_channels: JSON.parse(setting.notification_channels || '["telegram"]')
            }));

            responseHelper.success(res, parsedSettings);
        } catch (error) {
            console.error('Error getting all notification settings:', error);
            responseHelper.error(res, 'Failed to get notification settings', 500);
        }
    };

    /**
     * 更新通知设置
     */
    updateSetting = (req, res) => {
        try {
            const settingId = parseInt(req.params.id);
            const updateData = req.body;

            // 验证输入数据
            const validator = createValidator();
            validator
                .boolean(updateData.is_enabled, 'is_enabled')
                .integer(updateData.advance_days, 'advance_days')
                .range(updateData.advance_days, 'advance_days', 0, 365)
                .array(updateData.notification_channels, 'notification_channels')
                .custom(updateData.notification_channels, 'notification_channels',
                    (channels) => !channels || channels.every(channel => ['telegram', 'email', 'webhook'].includes(channel)),
                    'notification_channels must contain only valid channel types: telegram, email, webhook'
                )
                .boolean(updateData.repeat_notification, 'repeat_notification');

            if (validator.hasErrors()) {
                return responseHelper.badRequest(res, validator.getErrors());
            }

            const { is_enabled, advance_days, notification_channels, repeat_notification } = updateData;

            // Normalize boolean values from SQLite integers to actual booleans
            const normalizeBoolean = (value) => {
                if (typeof value === 'boolean') return value;
                if (value === 1 || value === '1' || value === 'true') return true;
                if (value === 0 || value === '0' || value === 'false') return false;
                return value;
            };

            // Normalize the boolean values
            const normalizedIsEnabled = normalizeBoolean(is_enabled);
            const normalizedRepeatNotification = normalizeBoolean(repeat_notification);

            const db = this.notificationService.db;

            // First get the current setting to check notification type
            const currentSetting = db.prepare('SELECT notification_type FROM notification_settings WHERE id = ?').get(settingId);

            if (!currentSetting) {
                return responseHelper.notFound(res, 'Notification setting not found');
            }

            // For expiration_warning, always keep advance_days as 0 (fixed timing)
            const finalAdvanceDays = currentSetting.notification_type === 'expiration_warning' ? 0 : advance_days;

            const query = `
                UPDATE notification_settings
                SET is_enabled = ?, advance_days = ?, notification_channels = ?, repeat_notification = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            const result = db.prepare(query).run(
                normalizedIsEnabled ? 1 : 0, // Convert normalized boolean to integer for SQLite
                finalAdvanceDays,
                JSON.stringify(notification_channels || ['telegram']),
                normalizedRepeatNotification ? 1 : 0, // Convert normalized boolean to integer for SQLite
                settingId
            );

            if (result.changes === 0) {
                return responseHelper.notFound(res, 'Notification setting not found');
            }

            responseHelper.success(res, { message: 'Notification setting updated successfully' });
        } catch (error) {
            console.error('Error updating notification setting:', error);
            responseHelper.error(res, 'Failed to update notification setting', 500);
        }
    };

    /**
     * 配置通知渠道
     */
    configureChannel = async (req, res) => {
        try {
            const channelData = req.body;

            // 验证输入数据
            const validator = validateChannelConfig(channelData);
            if (validator.hasErrors()) {
                return responseHelper.badRequest(res, validator.getErrors());
            }

            const { channel_type, config } = channelData;
            const result = await this.notificationService.configureChannel(channel_type, config);

            if (result.success) {
                responseHelper.success(res, result);
            } else {
                responseHelper.error(res, result.error || 'Failed to configure channel', 400);
            }
        } catch (error) {
            console.error('Error configuring channel:', error);
            responseHelper.error(res, 'Failed to configure channel', 500);
        }
    };

    /**
     * 获取渠道配置
     */
    getChannelConfig = (req, res) => {
        try {
            const channelType = req.params.channelType;

            const config = this.notificationService.getChannelConfig(channelType);

            if (!config) {
                return responseHelper.notFound(res, 'Channel configuration');
            }

            responseHelper.success(res, config);
        } catch (error) {
            console.error('Error getting channel config:', error);
            responseHelper.error(res, 'Failed to get channel configuration', 500);
        }
    };

    /**
     * 测试通知
     */
    testNotification = async (req, res) => {
        try {
            const { channel_type } = req.body;

            // 验证输入数据
            const validator = createValidator();
            validator
                .required(channel_type, 'channel_type')
                .string(channel_type, 'channel_type')
                .enum(channel_type, 'channel_type', ['telegram', 'email', 'webhook']);

            if (validator.hasErrors()) {
                return responseHelper.badRequest(res, validator.getErrors());
            }

            const result = await this.notificationService.testNotification(channel_type);

            if (result.success) {
                responseHelper.success(res, result);
            } else {
                responseHelper.error(res, result.error || 'Failed to send test notification', 400);
            }
        } catch (error) {
            console.error('Error testing notification:', error);
            responseHelper.error(res, 'Failed to test notification', 500);
        }
    };

    /**
     * 发送通知
     */
    sendNotification = async (req, res) => {
        try {
            const notificationData = req.body;

            // 验证输入数据
            const validator = validateSendNotification(notificationData);
            if (validator.hasErrors()) {
                return responseHelper.badRequest(res, validator.getErrors());
            }

            const { subscription_id, notification_type, channels } = notificationData;

            const result = await this.notificationService.sendNotification({
                subscriptionId: subscription_id,
                notificationType: notification_type,
                channels
            });

            if (result.success) {
                responseHelper.success(res, result);
            } else {
                responseHelper.error(res, result.error || 'Failed to send notification', 400);
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            responseHelper.error(res, 'Failed to send notification', 500);
        }
    };

    /**
     * 获取通知历史
     */
    getNotificationHistory = (req, res) => {
        try {
            const { page = 1, limit = 20, status, type } = req.query;

            const result = this.notificationService.getNotificationHistory({
                page: parseInt(page),
                limit: parseInt(limit),
                status,
                type
            });

            responseHelper.success(res, {
                data: result.data,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages
                }
            });
        } catch (error) {
            console.error('Error getting notification history:', error);
            responseHelper.error(res, 'Failed to get notification history', 500);
        }
    };



    /**
     * 获取通知统计
     */
    getNotificationStats = (req, res) => {
        try {
            const db = this.notificationService.db;

            const stats = {
                total: 0,
                sent: 0,
                failed: 0,
                pending: 0,
                retrying: 0,
                byType: {},
                byChannel: {}
            };

            // 总体统计
            const totalQuery = `
                SELECT status, COUNT(*) as count
                FROM notification_history
                GROUP BY status
            `;
            const totalStats = db.prepare(totalQuery).all();
            
            totalStats.forEach(stat => {
                stats.total += stat.count;
                stats[stat.status] = stat.count;
            });

            // 按类型统计
            const typeQuery = `
                SELECT notification_type, status, COUNT(*) as count
                FROM notification_history
                GROUP BY notification_type, status
            `;
            const typeStats = db.prepare(typeQuery).all();

            typeStats.forEach(stat => {
                if (!stats.byType[stat.notification_type]) {
                    stats.byType[stat.notification_type] = { total: 0 };
                }
                stats.byType[stat.notification_type].total += stat.count;
                stats.byType[stat.notification_type][stat.status] = stat.count;
            });

            // 按渠道统计
            const channelQuery = `
                SELECT channel_type, status, COUNT(*) as count
                FROM notification_history
                GROUP BY channel_type, status
            `;
            const channelStats = db.prepare(channelQuery).all();
            
            channelStats.forEach(stat => {
                if (!stats.byChannel[stat.channel_type]) {
                    stats.byChannel[stat.channel_type] = { total: 0 };
                }
                stats.byChannel[stat.channel_type].total += stat.count;
                stats.byChannel[stat.channel_type][stat.status] = stat.count;
            });

            responseHelper.success(res, stats);
        } catch (error) {
            console.error('Error getting notification stats:', error);
            responseHelper.error(res, 'Failed to get notification statistics', 500);
        }
    };

    /**
     * 验证Telegram Chat ID
     */
    validateChatId = async (req, res) => {
        try {
            const { chat_id } = req.body;

            // 验证输入数据
            const validator = createValidator();
            validator
                .required(chat_id, 'chat_id')
                .string(chat_id, 'chat_id')
                .custom(chat_id, 'chat_id',
                    (chatId) => /^-?\d+$/.test(chatId),
                    'Chat ID must be a valid number string'
                );

            if (validator.hasErrors()) {
                return responseHelper.badRequest(res, validator.getErrors());
            }

            const result = await this.telegramService.validateChatId(chat_id);

            if (result.success) {
                responseHelper.success(res, result);
            } else {
                responseHelper.error(res, result.error || 'Invalid Chat ID', 400);
            }
        } catch (error) {
            console.error('Error validating Chat ID:', error);
            responseHelper.error(res, 'Failed to validate Chat ID', 500);
        }
    };

    /**
     * 获取Telegram Bot信息
     */
    getBotInfo = async (req, res) => {
        try {
            const result = await this.telegramService.getBotInfo();
            
            if (result.success) {
                responseHelper.success(res, result);
            } else {
                responseHelper.error(res, result.error || 'Failed to get bot info', 400);
            }
        } catch (error) {
            console.error('Error getting bot info:', error);
            responseHelper.error(res, 'Failed to get bot info', 500);
        }
    };

    /**
     * 获取Telegram配置状态
     */
    getTelegramConfigStatus = (req, res) => {
        try {
            const status = this.telegramService.getConfigStatus();
            responseHelper.success(res, status);
        } catch (error) {
            console.error('Error getting Telegram config status:', error);
            responseHelper.error(res, 'Failed to get Telegram config status', 500);
        }
    };

    /**
     * 清理资源
     */
    cleanup = () => {
        if (this.notificationService) {
            this.notificationService.close();
        }
    };
}

module.exports = NotificationController;