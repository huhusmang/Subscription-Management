const BaseRepository = require('../utils/BaseRepository');
const { calculateLastBillingDate, calculateNextBillingDate, calculateNextBillingDateFromStart, getTodayString } = require('../utils/dateUtils');
const MonthlyCategorySummaryService = require('./monthlyCategorySummaryService');
const NotificationService = require('./notificationService');
const logger = require('../utils/logger');
const { NotFoundError } = require('../middleware/errorHandler');

class SubscriptionService extends BaseRepository {
    constructor(db) {
        super(db, 'subscriptions');
        this.monthlyCategorySummaryService = new MonthlyCategorySummaryService(db.name);
        this.notificationService = new NotificationService(db);
    }

    /**
     * 获取所有订阅（包含关联的 category 和 payment method 数据）
     */
    async getAllSubscriptions() {
        const query = `
            SELECT
                s.*,
                c.id as category_join_id,
                c.value as category_join_value,
                c.label as category_join_label,
                pm.id as payment_method_join_id,
                pm.value as payment_method_join_value,
                pm.label as payment_method_join_label
            FROM subscriptions s
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
            ORDER BY s.name ASC
        `;

        const stmt = this.db.prepare(query);
        const results = stmt.all();

        // 转换数据格式，将关联数据嵌套为对象
        return results.map(row => ({
            id: row.id,
            name: row.name,
            plan: row.plan,
            billing_cycle: row.billing_cycle,
            next_billing_date: row.next_billing_date,
            last_billing_date: row.last_billing_date,
            amount: row.amount,
            currency: row.currency,
            payment_method_id: row.payment_method_id,
            start_date: row.start_date,
            status: row.status,
            category_id: row.category_id,
            renewal_type: row.renewal_type,
            notes: row.notes,
            website: row.website,
            created_at: row.created_at,
            updated_at: row.updated_at,
            // 嵌套的关联对象
            category: row.category_join_id ? {
                id: row.category_join_id,
                value: row.category_join_value,
                label: row.category_join_label
            } : null,
            paymentMethod: row.payment_method_join_id ? {
                id: row.payment_method_join_id,
                value: row.payment_method_join_value,
                label: row.payment_method_join_label
            } : null
        }));
    }

    /**
     * 根据ID获取订阅（包含关联的 category 和 payment method 数据）
     */
    async getSubscriptionById(id) {
        const query = `
            SELECT
                s.*,
                c.id as category_join_id,
                c.value as category_join_value,
                c.label as category_join_label,
                pm.id as payment_method_join_id,
                pm.value as payment_method_join_value,
                pm.label as payment_method_join_label
            FROM subscriptions s
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
            WHERE s.id = ?
        `;

        const stmt = this.db.prepare(query);
        const row = stmt.get(id);

        if (!row) {
            return null;
        }

        // 转换数据格式，将关联数据嵌套为对象
        return {
            id: row.id,
            name: row.name,
            plan: row.plan,
            billing_cycle: row.billing_cycle,
            next_billing_date: row.next_billing_date,
            last_billing_date: row.last_billing_date,
            amount: row.amount,
            currency: row.currency,
            payment_method_id: row.payment_method_id,
            start_date: row.start_date,
            status: row.status,
            category_id: row.category_id,
            renewal_type: row.renewal_type,
            notes: row.notes,
            website: row.website,
            created_at: row.created_at,
            updated_at: row.updated_at,
            // 嵌套的关联对象
            category: row.category_join_id ? {
                id: row.category_join_id,
                value: row.category_join_value,
                label: row.category_join_label
            } : null,
            paymentMethod: row.payment_method_join_id ? {
                id: row.payment_method_join_id,
                value: row.payment_method_join_value,
                label: row.payment_method_join_label
            } : null
        };
    }

    /**
     * 创建新订阅
     */
    async createSubscription(subscriptionData) {
        const {
            name,
            plan,
            billing_cycle,
            next_billing_date,
            amount,
            currency,
            payment_method_id,
            start_date,
            status = 'active',
            category_id,
            renewal_type = 'manual',
            notes,
            website
        } = subscriptionData;

        // 计算 last_billing_date
        const last_billing_date = calculateLastBillingDate(
            next_billing_date, 
            start_date, 
            billing_cycle
        );

        const result = this.create({
            name,
            plan,
            billing_cycle,
            next_billing_date,
            last_billing_date,
            amount,
            currency,
            payment_method_id,
            start_date,
            status,
            category_id,
            renewal_type,
            notes,
            website
        });

        // 自动生成支付历史记录
        if (result.lastInsertRowid) {
            try {
                await this.generatePaymentHistory(result.lastInsertRowid, subscriptionData);
                logger.info(`Payment history generated for subscription ${result.lastInsertRowid}`);
            } catch (error) {
                logger.error(`Failed to generate payment history for subscription ${result.lastInsertRowid}:`, error.message);
            }
        }

        return result;
    }

    /**
     * 批量创建订阅
     */
    async bulkCreateSubscriptions(subscriptionsData) {
        // Prepare subscription data for bulk insert
        const subscriptionRecords = subscriptionsData.map(subscriptionData => {
            const {
                name,
                plan,
                billing_cycle,
                next_billing_date,
                amount,
                currency,
                payment_method_id,
                start_date,
                status = 'active',
                category_id,
                renewal_type = 'manual',
                notes,
                website
            } = subscriptionData;

            // Calculate last_billing_date
            const last_billing_date = calculateLastBillingDate(
                next_billing_date, 
                start_date, 
                billing_cycle
            );

            return {
                name,
                plan,
                billing_cycle,
                next_billing_date,
                last_billing_date,
                amount,
                currency,
                payment_method_id,
                start_date,
                status,
                category_id,
                renewal_type,
                notes,
                website
            };
        });

        // Use synchronous bulk insert
        const results = this.createMany(subscriptionRecords);
        
        // Generate payment history for each created subscription (async, outside transaction)
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const subscriptionData = subscriptionsData[i];
            
            if (result.lastInsertRowid) {
                try {
                    await this.generatePaymentHistory(result.lastInsertRowid, subscriptionData);
                    logger.info(`Payment history generated for subscription ${result.lastInsertRowid}`);
                } catch (error) {
                    logger.error(`Failed to generate payment history for subscription ${result.lastInsertRowid}:`, error.message);
                }
            }
        }

        return results;
    }

    /**
     * 更新订阅
     */
    async updateSubscription(id, updateData) {
        // 检查订阅是否存在
        const existingSubscription = this.findById(id);
        if (!existingSubscription) {
            throw new NotFoundError('Subscription');
        }

        // 如果更新了计费周期或日期，重新计算计费日期
        if (updateData.billing_cycle || updateData.next_billing_date || updateData.start_date) {
            const billing_cycle = updateData.billing_cycle || existingSubscription.billing_cycle;
            const start_date = updateData.start_date || existingSubscription.start_date;

            // 确定 next_billing_date：若客户端明确提供，则以客户端为准；
            // 否则当计费周期或开始日期变更时，从 start_date + billing_cycle 重新计算。
            let next_billing_date;
            if (updateData.next_billing_date) {
                next_billing_date = updateData.next_billing_date;
            } else if (updateData.start_date || updateData.billing_cycle) {
                const currentDate = getTodayString();
                next_billing_date = calculateNextBillingDateFromStart(
                    start_date,
                    currentDate,
                    billing_cycle
                );
                updateData.next_billing_date = next_billing_date;
            } else {
                next_billing_date = existingSubscription.next_billing_date;
            }

            // 重新计算 last_billing_date（基于最终的 next_billing_date 与 start_date）
            updateData.last_billing_date = calculateLastBillingDate(
                next_billing_date,
                start_date,
                billing_cycle
            );
        }

        const result = this.update(id, updateData);

        // 如果更新了关键字段，重新生成支付历史
        const keyFields = ['amount', 'billing_cycle', 'start_date', 'status'];
        const hasKeyFieldUpdate = keyFields.some(field => updateData.hasOwnProperty(field));
        
        if (hasKeyFieldUpdate) {
            try {
                await this.regeneratePaymentHistory(id);
                logger.info(`Payment history regenerated for subscription ${id}`);
            } catch (error) {
                logger.error(`Failed to regenerate payment history for subscription ${id}:`, error.message);
            }
        }

        // 发送订阅变更通知（异步触发，不阻塞请求）
        this.notificationService
            .sendNotification({
                subscriptionId: id,
                notificationType: 'subscription_change'
            })
            .then(() => {
                logger.info(`Subscription change notification dispatched for subscription ${id}`);
            })
            .catch((error) => {
                logger.error(
                    `Failed to send subscription change notification for subscription ${id}:`,
                    error.message
                );
            });

        return result;
    }

    /**
     * 删除订阅
     */
    async deleteSubscription(id) {
        // 检查订阅是否存在
        const existingSubscription = this.findById(id);
        if (!existingSubscription) {
            throw new NotFoundError('Subscription');
        }

        // 在删除前获取相关的支付历史记录的年月信息
        const paymentMonthsQuery = `
            SELECT DISTINCT 
                strftime('%Y', payment_date) as year,
                strftime('%m', payment_date) as month
            FROM payment_history
            WHERE subscription_id = ?
            AND status = 'succeeded'
        `;
        const paymentMonths = this.db.prepare(paymentMonthsQuery).all(id);

        // 删除订阅（级联删除会自动处理相关的 payment_history 和 monthly_expenses）
        const result = this.delete(id);

        // 重新计算受影响月份的月度分类汇总
        if (paymentMonths.length > 0) {
            logger.info(`Recalculating monthly category summaries for ${paymentMonths.length} months after subscription deletion`);
            paymentMonths.forEach(({ year, month }) => {
                try {
                    this.monthlyCategorySummaryService.updateMonthlyCategorySummary(
                        parseInt(year), 
                        parseInt(month)
                    );
                } catch (error) {
                    logger.error(`Failed to update monthly category summary for ${year}-${month}:`, error.message);
                }
            });
        }

        logger.info(`Subscription deleted: ${existingSubscription.name} (ID: ${id}), related data cleaned up automatically`);
        return result;
    }

    /**
     * 获取订阅统计信息
     */
    async getSubscriptionStats() {
        const totalQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'trial' THEN 1 END) as trial,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as total_active_amount,
                AVG(CASE WHEN status = 'active' THEN amount ELSE NULL END) as avg_active_amount
            FROM subscriptions
        `;

        const categoryQuery = `
            SELECT 
                category,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as total_amount
            FROM subscriptions
            GROUP BY category
            ORDER BY count DESC
        `;

        const billingCycleQuery = `
            SELECT 
                billing_cycle,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as total_amount
            FROM subscriptions
            GROUP BY billing_cycle
            ORDER BY count DESC
        `;

        const totalStats = this.db.prepare(totalQuery).get();
        const categoryStats = this.db.prepare(categoryQuery).all();
        const billingCycleStats = this.db.prepare(billingCycleQuery).all();

        return {
            total: totalStats,
            byCategory: categoryStats,
            byBillingCycle: billingCycleStats
        };
    }

    /**
     * 获取即将到期的订阅
     */
    async getUpcomingRenewals(days = 7) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        const futureDateString = futureDate.toISOString().split('T')[0];

        const query = `
            SELECT * FROM subscriptions
            WHERE status = 'active' 
            AND next_billing_date <= ?
            AND next_billing_date >= ?
            ORDER BY next_billing_date ASC
        `;

        const stmt = this.db.prepare(query);
        return stmt.all(futureDateString, getTodayString());
    }

    /**
     * 获取过期的订阅
     */
    async getExpiredSubscriptions() {
        const query = `
            SELECT * FROM subscriptions
            WHERE status = 'active' 
            AND next_billing_date < ?
            ORDER BY next_billing_date ASC
        `;

        const stmt = this.db.prepare(query);
        return stmt.all(getTodayString());
    }

    /**
     * 按类别获取订阅
     */
    async getSubscriptionsByCategory(category) {
        return this.findAll({ 
            filters: { category },
            orderBy: 'name ASC'
        });
    }

    /**
     * 按状态获取订阅
     */
    async getSubscriptionsByStatus(status) {
        return this.findAll({ 
            filters: { status },
            orderBy: 'name ASC'
        });
    }

    /**
     * 搜索订阅
     */
    async searchSubscriptions(query) {
        const searchQuery = `
            SELECT * FROM subscriptions
            WHERE name LIKE ? OR plan LIKE ? OR notes LIKE ?
            ORDER BY name ASC
        `;

        const searchTerm = `%${query}%`;
        const stmt = this.db.prepare(searchQuery);
        return stmt.all(searchTerm, searchTerm, searchTerm);
    }

    /**
     * 获取订阅的支付历史
     */
    async getSubscriptionPaymentHistory(subscriptionId) {
        const query = `
            SELECT * FROM payment_history
            WHERE subscription_id = ?
            ORDER BY payment_date DESC
        `;

        const stmt = this.db.prepare(query);
        return stmt.all(subscriptionId);
    }

    /**
     * 重置所有订阅数据
     */
    async resetAllSubscriptions() {
        return this.transaction(() => {
            // 删除所有订阅（级联删除会处理相关数据）
            const subscriptionResult = this.db.prepare('DELETE FROM subscriptions').run();

            // 显式清理月度分类汇总表
            const monthlyCategorySummaryResult = this.db.prepare('DELETE FROM monthly_category_summary').run();

            logger.info(`Reset completed: ${subscriptionResult.changes} subscriptions, ${monthlyCategorySummaryResult.changes} monthly category summaries deleted`);

            return {
                subscriptions: subscriptionResult.changes,
                monthlyCategorySummary: monthlyCategorySummaryResult.changes,
                message: 'All subscription data has been reset successfully'
            };
        });
    }

    /**
     * 生成支付历史记录
     */
    async generatePaymentHistory(subscriptionId) {
        logger.info(`Generating payment history for subscription ${subscriptionId}`);

        try {
            // 获取完整的订阅信息
            const fullSubscription = this.findById(subscriptionId);
            if (!fullSubscription) {
                throw new Error(`Subscription ${subscriptionId} not found`);
            }

            // 生成从开始日期到现在的支付记录
            const payments = this._generateHistoricalPayments(fullSubscription);

            // 插入支付记录
            const insertPayment = this.db.prepare(`
                INSERT INTO payment_history (
                    subscription_id, payment_date, amount_paid, currency,
                    billing_period_start, billing_period_end, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const payment of payments) {
                insertPayment.run(
                    subscriptionId,
                    payment.payment_date,
                    fullSubscription.amount,
                    fullSubscription.currency,
                    payment.billing_period_start,
                    payment.billing_period_end,
                    'succeeded',
                    'Auto-generated from subscription data'
                );
            }

            logger.info(`Generated ${payments.length} payment history records for subscription ${subscriptionId}`);

            // 触发月度分类汇总重新计算
            if (this.monthlyCategorySummaryService && payments.length > 0) {
                // 获取最新插入的支付记录ID并处理
                const lastPaymentId = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
                for (let i = 0; i < payments.length; i++) {
                    const paymentId = lastPaymentId - payments.length + 1 + i;
                    this.monthlyCategorySummaryService.processNewPayment(paymentId);
                }
            }
        } catch (error) {
            logger.error(`Failed to generate payment history for subscription ${subscriptionId}:`, error.message);
            throw error;
        }
    }

    /**
     * 重新生成支付历史记录
     */
    async regeneratePaymentHistory(subscriptionId) {
        logger.info(`Regenerating payment history for subscription ${subscriptionId}`);

        try {
            // 获取订阅信息
            const subscription = this.findById(subscriptionId);
            if (!subscription) {
                throw new Error(`Subscription ${subscriptionId} not found`);
            }

            // 删除现有的支付历史记录
            const deleteStmt = this.db.prepare('DELETE FROM payment_history WHERE subscription_id = ?');
            const deleteResult = deleteStmt.run(subscriptionId);
            logger.info(`Deleted ${deleteResult.changes} existing payment records for subscription ${subscriptionId}`);

            // 重新生成支付历史
            await this.generatePaymentHistory(subscriptionId, subscription);
        } catch (error) {
            logger.error(`Failed to regenerate payment history for subscription ${subscriptionId}:`, error.message);
            throw error;
        }
    }

    /**
     * 生成历史支付记录的辅助方法
     * @private
     */
    _generateHistoricalPayments(subscription) {
        const payments = [];
        const startDate = new Date(subscription.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 从开始日期到最后计费日期或今天生成支付记录
        let currentDate = new Date(startDate);
        const endDate = subscription.last_billing_date ?
            new Date(subscription.last_billing_date) : today;

        while (currentDate <= endDate) {
            const billingPeriodEnd = this._calculateNextBillingDate(currentDate, subscription.billing_cycle);

            payments.push({
                payment_date: currentDate.toISOString().split('T')[0],
                billing_period_start: currentDate.toISOString().split('T')[0],
                billing_period_end: billingPeriodEnd.toISOString().split('T')[0]
            });

            // 移动到下一个计费周期
            currentDate = new Date(billingPeriodEnd);
        }

        return payments;
    }

    /**
     * 计算下一个计费日期的辅助方法
     * @private
     */
    _calculateNextBillingDate(currentDate, billingCycle) {
        const nextDate = new Date(currentDate);

        switch (billingCycle) {
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case 'semiannual':
                nextDate.setMonth(nextDate.getMonth() + 6);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            default:
                throw new Error(`Unsupported billing cycle: ${billingCycle}`);
        }

        return nextDate;
    }

    /**
     * 关闭资源
     */
    close() {
        if (this.monthlyCategorySummaryService) {
            this.monthlyCategorySummaryService.close();
        }
        if (this.notificationService) {
            this.notificationService.close();
        }
    }
}

module.exports = SubscriptionService;
