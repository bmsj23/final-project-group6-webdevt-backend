import nodemailer from 'nodemailer';
import config from '../config/config.js';

// create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

// verify email connection
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready');
    return true;
  } catch (error) {
    console.error('Email service error:', error.message);
    return false;
  }
};

// send email helper function
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
};

// email templates

// send report notification to admin
export const sendReportNotification = async (adminEmail, report) => {
  const subject = `New Report: ${report.reportType}`;
  const html = `
    <h2>New Report Received</h2>
    <p><strong>Report Type:</strong> ${report.reportType}</p>
    <p><strong>Reported By:</strong> ${report.reporter?.email || 'Unknown'}</p>
    <p><strong>Reason:</strong> ${report.reason}</p>
    <p><strong>Description:</strong> ${report.description || 'N/A'}</p>
    <p><strong>Created At:</strong> ${new Date(report.createdAt).toLocaleString()}</p>
    <br>
    <p>Please review this report in the admin dashboard.</p>
  `;

  await sendEmail({ to: adminEmail, subject, html });
};

// send report notification to reported user
export const sendReportedUserNotification = async (userEmail, reportType) => {
  const subject = `Your ${reportType} has been reported`;
  const html = `
    <h2>Report Notification</h2>
    <p>Hello,</p>
    <p>Your ${reportType} has been reported by another user. Our admin team will review this report shortly.</p>
    <p>If you believe this report is a mistake, please contact support.</p>
    <br>
    <p>Best regards,<br>AnimoMart Team</p>
  `;

  await sendEmail({ to: userEmail, subject, html });
};

// send order status update notification
export const sendOrderStatusEmail = async (buyerEmail, orderNumber, newStatus, buyerName) => {
  // custom messages based on status
  const statusMessages = {
    processing: 'Your order is being processed',
    ready: 'Your order is ready for pickup',
    shipped: 'Your order has been shipped',
    completed: 'Your order has been completed',
    cancelled: 'Your order has been cancelled',
  };

  const statusMessage = statusMessages[newStatus] || `Status updated to: ${newStatus}`;

  const subject = `Order #${orderNumber} - ${statusMessage}`;
  const html = `
    <h2>Order Status Update</h2>
    <p>Hello ${buyerName || ''},</p>
    <p><strong>${statusMessage}</strong></p>
    <p><strong>Order Number:</strong> ${orderNumber}</p>
    <br>
    <p>Thank you for using AnimoMart!</p>
  `;

  await sendEmail({ to: buyerEmail, subject, html });
};

// send new order notification to seller
export const sendNewOrderEmail = async (sellerEmail, orderNumber, sellerName) => {
  const subject = `New Order Received - Order #${orderNumber}`;
  const html = `
    <h2>New Order Notification</h2>
    <p>Hello ${sellerName || ''},</p>
    <p>You have received a new order!</p>
    <p><strong>Order Number:</strong> ${orderNumber}</p>
    <br>
    <p>Please confirm the order in your AnimoMart dashboard.</p>
  `;

  await sendEmail({ to: sellerEmail, subject, html });
};

// send review notification to seller
export const sendReviewNotification = async (sellerEmail, review, productTitle) => {
  const subject = `New Review for "${productTitle}"`;
  const html = `
    <h2>New Product Review</h2>
    <p>Hello,</p>
    <p>Your product "<strong>${productTitle}</strong>" has received a new review!</p>
    <p><strong>Rating:</strong> ${review.rating}/5 stars</p>
    <p><strong>Comment:</strong> ${review.comment || 'No comment provided'}</p>
    <br>
    <p>View it on your AnimoMart dashboard.</p>
  `;

  await sendEmail({ to: sellerEmail, subject, html });
};

// send low stock warning to seller
export const sendLowStockWarning = async (sellerEmail, product) => {
  const subject = `Low Stock Alert: ${product.title}`;
  const html = `
    <h2>Low Stock Warning</h2>
    <p>Hello,</p>
    <p>Your product "<strong>${product.title}</strong>" is running low on stock.</p>
    <p><strong>Current Stock:</strong> ${product.stock} units</p>
    <br>
    <p>Please update your inventory to avoid running out of stock.</p>
  `;

  await sendEmail({ to: sellerEmail, subject, html });
};

// send new message notification to recipient
export const sendNewMessageEmail = async (recipientEmail, senderName, messagePreview) => {
  const subject = `New Message from ${senderName}`;
  const html = `
    <h2>New Message Received</h2>
    <p>Hello,</p>
    <p>You have received a new message from <strong>${senderName}</strong> on AnimoMart.</p>
    <p><strong>Message Preview:</strong></p>
    <blockquote style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #2e7d32;">
      ${messagePreview.substring(0, 150)}${messagePreview.length > 150 ? '...' : ''}
    </blockquote>
    <br>
    <p>Log in to AnimoMart to view and reply to the message.</p>
    <br>
    <p>Best regards,<br>AnimoMart Team</p>
  `;

  await sendEmail({ to: recipientEmail, subject, html });
};

// send new review notification to seller
export const sendNewReviewEmail = async (sellerEmail, productName, rating, reviewText, buyerName) => {
  const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  const subject = `New ${rating}-Star Review for "${productName}"`;
  const html = `
    <h2>New Product Review</h2>
    <p>Hello,</p>
    <p>Your product "<strong>${productName}</strong>" has received a new review from ${buyerName}!</p>
    <br>
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
      <p><strong>Rating:</strong> ${stars} (${rating}/5)</p>
      <p><strong>Review:</strong></p>
      <blockquote style="margin: 10px 0; padding: 10px; background-color: white; border-left: 4px solid #2e7d32;">
        ${reviewText}
      </blockquote>
    </div>
    <br>
    <p>Log in to AnimoMart to respond to this review.</p>
    <br>
    <p>Best regards,<br>AnimoMart Team</p>
  `;

  await sendEmail({ to: sellerEmail, subject, html });
};

export default transporter;