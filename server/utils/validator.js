const { ValidationError } = require('../middleware/errorHandler');
const { isSupportedCurrency } = require('../config/currencies');

/**
 * 数据验证工具类
 */
class Validator {
    constructor() {
        this.errors = [];
    }

    /**
     * 重置错误列表
     */
    reset() {
        this.errors = [];
        return this;
    }

    /**
     * 添加错误
     * @param {string} field - 字段名
     * @param {string} message - 错误消息
     */
    addError(field, message) {
        this.errors.push({ field, message });
        return this;
    }

    /**
     * 检查是否有错误
     * @returns {boolean}
     */
    hasErrors() {
        return this.errors.length > 0;
    }

    /**
     * 获取错误列表
     * @returns {Array}
     */
    getErrors() {
        return this.errors;
    }

    /**
     * 抛出验证错误
     */
    throwIfErrors() {
        if (this.hasErrors()) {
            const errorMessage = this.errors.map(err => `${err.field}: ${err.message}`).join(', ');
            throw new ValidationError(errorMessage);
        }
    }

    /**
     * 验证必填字段
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    required(value, field) {
        if (value === undefined || value === null || value === '') {
            this.addError(field, `${field} is required`);
        }
        return this;
    }

    /**
     * 验证字符串类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    string(value, field) {
        if (value !== undefined && value !== null && typeof value !== 'string') {
            this.addError(field, `${field} must be a string`);
        }
        return this;
    }

    /**
     * 验证数字类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    number(value, field) {
        if (value !== undefined && value !== null && (typeof value !== 'number' || isNaN(value))) {
            this.addError(field, `${field} must be a number`);
        }
        return this;
    }

    /**
     * 验证整数类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    integer(value, field) {
        if (value !== undefined && value !== null && (!Number.isInteger(Number(value)))) {
            this.addError(field, `${field} must be an integer`);
        }
        return this;
    }

    /**
     * 验证布尔类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    boolean(value, field) {
        if (value !== undefined && value !== null && typeof value !== 'boolean') {
            this.addError(field, `${field} must be a boolean`);
        }
        return this;
    }

    /**
     * 验证邮箱格式
     * @param {string} value - 值
     * @param {string} field - 字段名
     */
    email(value, field) {
        if (value && typeof value === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.addError(field, `${field} must be a valid email address`);
            }
        }
        return this;
    }

    /**
     * 验证URL格式
     * @param {string} value - 值
     * @param {string} field - 字段名
     */
    url(value, field) {
        if (value && typeof value === 'string') {
            try {
                new URL(value);
            } catch {
                this.addError(field, `${field} must be a valid URL`);
            }
        }
        return this;
    }

    /**
     * 验证日期格式
     * @param {string} value - 值
     * @param {string} field - 字段名
     */
    date(value, field) {
        if (value && typeof value === 'string') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                this.addError(field, `${field} must be a valid date`);
            }
        }
        return this;
    }

    /**
     * 验证字符串长度
     * @param {string} value - 值
     * @param {string} field - 字段名
     * @param {number} min - 最小长度
     * @param {number} max - 最大长度
     */
    length(value, field, min = 0, max = Infinity) {
        if (value && typeof value === 'string') {
            if (value.length < min) {
                this.addError(field, `${field} must be at least ${min} characters long`);
            }
            if (value.length > max) {
                this.addError(field, `${field} must be no more than ${max} characters long`);
            }
        }
        return this;
    }

    /**
     * 验证数值范围
     * @param {number} value - 值
     * @param {string} field - 字段名
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     */
    range(value, field, min = -Infinity, max = Infinity) {
        if (value !== undefined && value !== null) {
            const num = Number(value);
            if (!isNaN(num)) {
                if (num < min) {
                    this.addError(field, `${field} must be at least ${min}`);
                }
                if (num > max) {
                    this.addError(field, `${field} must be no more than ${max}`);
                }
            }
        }
        return this;
    }

    /**
     * 验证枚举值
     * @param {*} value - 值
     * @param {string} field - 字段名
     * @param {Array} allowedValues - 允许的值列表
     */
    enum(value, field, allowedValues) {
        if (value !== undefined && value !== null && !allowedValues.includes(value)) {
            this.addError(field, `${field} must be one of: ${allowedValues.join(', ')}`);
        }
        return this;
    }

    /**
     * 验证数组类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    array(value, field) {
        if (value !== undefined && value !== null && !Array.isArray(value)) {
            this.addError(field, `${field} must be an array`);
        }
        return this;
    }

    /**
     * 验证对象类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    object(value, field) {
        if (value !== undefined && value !== null && (typeof value !== 'object' || Array.isArray(value))) {
            this.addError(field, `${field} must be an object`);
        }
        return this;
    }

    /**
     * 自定义验证函数
     * @param {*} value - 值
     * @param {string} field - 字段名
     * @param {Function} validatorFn - 验证函数，返回 true 表示验证通过
     * @param {string} message - 错误消息
     */
    custom(value, field, validatorFn, message) {
        if (value !== undefined && value !== null && !validatorFn(value)) {
            this.addError(field, message || `${field} is invalid`);
        }
        return this;
    }

    /**
     * 验证外键是否存在
     * @param {number} value - 外键值
     * @param {string} field - 字段名
     * @param {Function} existsCheckFn - 检查函数，返回 true 表示外键存在
     * @param {string} entityName - 实体名称（用于错误消息）
     */
    foreignKey(value, field, existsCheckFn, entityName) {
        if (value !== undefined && value !== null) {
            if (!existsCheckFn(value)) {
                this.addError(field, `${entityName} with id ${value} does not exist`);
            }
        }
        return this;
    }
}

/**
 * 创建新的验证器实例
 * @returns {Validator}
 */
function createValidator() {
    return new Validator();
}

/**
 * 验证订阅数据
 * @param {Object} data - 订阅数据
 * @returns {Validator}
 */
function validateSubscription(data) {
    const validator = createValidator();

    validator
        .required(data.name, 'name')
        .string(data.name, 'name')
        .length(data.name, 'name', 1, 255)

        .required(data.plan, 'plan')
        .string(data.plan, 'plan')
        .length(data.plan, 'plan', 1, 255)

        .required(data.billing_cycle, 'billing_cycle')
        .enum(data.billing_cycle, 'billing_cycle', ['monthly', 'yearly', 'quarterly', 'semiannual'])

        .required(data.amount, 'amount')
        .number(data.amount, 'amount')
        .range(data.amount, 'amount', 0)

        .required(data.currency, 'currency')
        .string(data.currency, 'currency')
        .length(data.currency, 'currency', 3, 3)
        .custom(data.currency, 'currency',
            (value) => isSupportedCurrency(value),
            'Currency is not supported'
        )

        .required(data.payment_method_id, 'payment_method_id')
        .integer(data.payment_method_id, 'payment_method_id')
        .range(data.payment_method_id, 'payment_method_id', 1)

        .date(data.next_billing_date, 'next_billing_date')
        .date(data.start_date, 'start_date')

        .enum(data.status, 'status', ['active', 'trial', 'cancelled'])
        .enum(data.renewal_type, 'renewal_type', ['auto', 'manual'])

        .required(data.category_id, 'category_id')
        .integer(data.category_id, 'category_id')
        .range(data.category_id, 'category_id', 1)

        .string(data.notes, 'notes')
        .url(data.website, 'website');

    return validator;
}

/**
 * 验证订阅数据（包含外键验证）
 * @param {Object} data - 订阅数据
 * @param {Object} db - 数据库连接
 * @returns {Validator}
 */
function validateSubscriptionWithForeignKeys(data, db) {
    const validator = validateSubscription(data);

    // 验证 category_id 外键
    if (data.category_id !== undefined && data.category_id !== null) {
        const categoryExists = db.prepare('SELECT COUNT(*) as count FROM categories WHERE id = ?').get(data.category_id);
        validator.custom(data.category_id, 'category_id',
            () => categoryExists.count > 0,
            `Category with id ${data.category_id} does not exist`);
    }

    // 验证 payment_method_id 外键
    if (data.payment_method_id !== undefined && data.payment_method_id !== null) {
        const paymentMethodExists = db.prepare('SELECT COUNT(*) as count FROM payment_methods WHERE id = ?').get(data.payment_method_id);
        validator.custom(data.payment_method_id, 'payment_method_id',
            () => paymentMethodExists.count > 0,
            `Payment method with id ${data.payment_method_id} does not exist`);
    }

    return validator;
}

/**
 * 验证通知设置数据
 * @param {Object} data - 通知设置数据
 * @returns {Validator}
 */
function validateNotificationSetting(data) {
    const validator = createValidator();

    validator
        .required(data.notification_type, 'notification_type')
        .string(data.notification_type, 'notification_type')
        .enum(data.notification_type, 'notification_type', [
            'renewal_reminder',
            'expiration_warning',
            'payment_failed',
            'trial_ending'
        ])

        .boolean(data.is_enabled, 'is_enabled')

        .integer(data.advance_days, 'advance_days')
        .range(data.advance_days, 'advance_days', 0, 365)

        .array(data.notification_channels, 'notification_channels')
        .custom(data.notification_channels, 'notification_channels',
            (channels) => channels && channels.every(channel => ['telegram', 'email', 'webhook'].includes(channel)),
            'notification_channels must contain only valid channel types: telegram, email, webhook'
        )

        .boolean(data.repeat_notification, 'repeat_notification');

    return validator;
}

/**
 * 验证通知渠道配置数据
 * @param {Object} data - 渠道配置数据
 * @returns {Validator}
 */
function validateChannelConfig(data) {
    const validator = createValidator();

    validator
        .required(data.channel_type, 'channel_type')
        .string(data.channel_type, 'channel_type')
        .enum(data.channel_type, 'channel_type', ['telegram', 'email', 'webhook'])

        .required(data.config, 'config')
        .object(data.config, 'config');

    // 根据渠道类型验证具体配置
    if (data.channel_type === 'telegram' && data.config) {
        validator
            .required(data.config.chat_id, 'config.chat_id')
            .string(data.config.chat_id, 'config.chat_id')
            .custom(data.config.chat_id, 'config.chat_id',
                (chatId) => /^-?\d+$/.test(chatId),
                'Telegram chat_id must be a valid number string'
            );
    } else if (data.channel_type === 'email' && data.config) {
        const emailAddress = data.config.email || data.config.address;
        validator
            .required(emailAddress, 'config.email')
            .email(emailAddress, 'config.email');
    } else if (data.channel_type === 'webhook' && data.config) {
        validator
            .required(data.config.url, 'config.url')
            .url(data.config.url, 'config.url');
    }

    return validator;
}

/**
 * 验证发送通知请求数据
 * @param {Object} data - 发送通知请求数据
 * @returns {Validator}
 */
function validateSendNotification(data) {
    const validator = createValidator();

    validator
        .required(data.subscription_id, 'subscription_id')
        .integer(data.subscription_id, 'subscription_id')
        .range(data.subscription_id, 'subscription_id', 1)

        .required(data.notification_type, 'notification_type')
        .string(data.notification_type, 'notification_type')
        .enum(data.notification_type, 'notification_type', [
            'renewal_reminder',
            'expiration_warning',
            'payment_failed',
            'trial_ending'
        ])

        .array(data.channels, 'channels')
        .custom(data.channels, 'channels',
            (channels) => !channels || channels.every(channel => ['telegram', 'email', 'webhook'].includes(channel)),
            'channels must contain only valid channel types: telegram, email, webhook'
        );

    return validator;
}

module.exports = {
    Validator,
    createValidator,
    validateSubscription,
    validateSubscriptionWithForeignKeys,
    validateNotificationSetting,
    validateChannelConfig,
    validateSendNotification
};
