const transporter = require('../middleware/emailConfig');
const Logger = require('../utils/logger');

/**
 * Send email using preconfigured transporter
 * @param {string|string[]} to - Recipient(s)
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 * @param {string} text - Plain text body
 * @param {Array} attachments - Optional attachments
 *   Each item can be:
 *   { filename: 'file.pdf', content: <base64|Buffer> }
 *   { filename: 'file.pdf', path: '/path/to/file.pdf' }
 *   { filename: 'file.pdf', path: 'https://example.com/file.pdf' }
 */

async function sendEmail(to, subject, html, text, attachments) {
  Logger.api('Send email requested', {
    toCount: Array.isArray(to) ? to.length : 1,
    subject,
    attachmentCount: attachments?.length || 0
  });
  try {
    const mailOptions = {
      from: `"Sai Ram Tours & Travels" <Do-not-reply@gosrtt.com>`,
      to,
      subject,
      text,
      html,
      replyTo: 'contact.gosrtt@gmail.com',

    };

    // Handle attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => {
        if (att.content) {
          let content = att.content;

          // Convert base64 string → Buffer
          if (typeof content === 'string') {
            content = Buffer.from(content, 'base64');
          }
          return {
            filename: att.filename,
            content,
          };
        } else if (att.path) {
          // Accepts local file paths or remote URLs
          return {
            filename: att.filename,
            path: att.path,
          };
        } else {
          throw new Error('Invalid attachment format. Must include content or path.');
        }
      });
    }

    const info = await transporter.sendMail(mailOptions);
    Logger.info('Email sent successfully', {
      messageId: info.messageId,
      acceptedCount: info.accepted?.length || 0,
      rejectedCount: info.rejected?.length || 0
    });
    return info;
  } catch (error) {
    Logger.error('Email sending failed', {
      error: error.message,
      code: error.code
    });
    throw error;
  }
}

module.exports = { sendEmail };
