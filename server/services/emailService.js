const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Email notification service wrapper.
 * Handles SMTP configuration, sending transactional emails and health checks.
 */
class EmailService {
  constructor(options = null) {
    this.config = options || config.getEmailConfig();
    this.transporter = null;

    if (this.config.enabled) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.authUser
          ? {
              user: this.config.authUser,
              pass: this.config.authPass
            }
          : undefined,
        tls: this.config.tlsOptions
      });
    }
  }

  isConfigured() {
    return Boolean(this.transporter);
  }

  getDefaultFrom() {
    return this.config.from;
  }

  /**
   * Send an email using configured transporter.
   * @param {Object} mail - Mail payload
   * @param {string} mail.to - Recipient email address
   * @param {string} mail.subject - Subject line
   * @param {string} mail.html - HTML content
   * @param {string} [mail.text] - Plain text fallback
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
   */
  async sendMail({ to, subject, html, text }) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.getDefaultFrom(),
        to,
        subject,
        html,
        text
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a canned test message to verify configuration.
   * @param {string} to - Recipient email address
   */
  async sendTestMail(to) {
    const now = new Date().toLocaleString(this.config.locale || 'zh-CN');
    const subject = '订阅管理系统测试邮件 / Subscription Manager Test';
    const html = `
      <h2>订阅管理系统测试邮件</h2>
      <p>这是一封来自订阅管理系统的测试邮件。如果您收到此邮件，说明邮件通知渠道配置正确。</p>
      <hr/>
      <p><strong>Send time:</strong> ${now}</p>
      <p>感谢您的使用！</p>
    `;
    const text = `订阅管理系统测试邮件\n\n这是一封来自订阅管理系统的测试邮件。如果您收到此邮件，说明邮件通知渠道配置正确。\n\nSend time: ${now}`;

    return this.sendMail({ to, subject, html, text });
  }
}

module.exports = EmailService;
