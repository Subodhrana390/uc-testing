import 'server-only'
import { env } from '@/env'
import { getDisplayOrderId } from './order'

export const sendInvoiceEmail = async (
  email: string,
  customerName: string,
  orderId: string,
  pdfBase64: string,
  orderDate?: string
) => {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not defined in environment variables");
  }

  const displayOrderId = orderDate
    ? getDisplayOrderId(orderId, orderDate)
    : orderId.slice(0, 8).toUpperCase();

  const payload = {
    sender: {
      name: env.BREVO_SENDER_NAME,
      email: env.BREVO_SENDER_EMAIL
    },
    to: [
      {
        email: email,
        name: customerName
      }
    ],
    subject: `Invoice for Order #${displayOrderId} - UC Enterprises`,
    htmlContent: `
      <html>
        <head></head>
        <body>
          <p>Dear ${customerName},</p>
          <p>Thank you for shopping with UC Enterprises! Your order <strong>#${displayOrderId}</strong> has been delivered successfully.</p>
          <p>Please find attached the tax invoice for your purchase.</p>
          <p>If you have any questions, feel free to contact our support team.</p>
          <br/>
          <p>Best regards,</p>
          <p><strong>${env.BREVO_SENDER_NAME}</strong></p>
        </body>
      </html>
    `,
    attachment: [
      {
        content: pdfBase64,
        name: `Invoice_${displayOrderId}.pdf`
      }
    ]
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Brevo API Error: ${JSON.stringify(error)}`);
  }

  return await response.json();
};

export interface OrderEmailData {
  orderId: string;
  orderDate?: string;
  customerName: string;
  customerEmail: string;
  shippingAddress?: string;
  totalAmount: string | number;
  items?: Array<any>; // Allow flexibility for item structure
  trackingId?: string;
  carrier?: string;
}

const generateOrderItemsHtml = (data: OrderEmailData) => {
  let html = `
    <h3 style="color: #333; margin-top: 20px;">Order Details</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f3f4f6; text-align: left;">
          <th style="padding: 10px; border: 1px solid #e5e7eb;">Item</th>
          <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">Qty</th>
          <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (data.items && data.items.length > 0) {
    data.items.forEach(item => {
      const itemName = item.name || item.products?.name || "Product";
      const itemPrice = item.price || item.unit_price || 0;
      const itemQty = item.quantity || 1;
      
      html += `
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${itemName}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${itemQty}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">₹${parseFloat(itemPrice).toFixed(2)}</td>
        </tr>
      `;
    });
  } else {
    html += `<tr><td colspan="3" style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">Items not specified</td></tr>`;
  }

  html += `
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">Total Amount</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #f97316;">₹${parseFloat(data.totalAmount as string).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  `;

  html += `<h3 style="color: #333;">Customer Information</h3>
    <p><strong>Name:</strong> ${data.customerName}</p>
  `;

  if (data.shippingAddress) {
    html += `<p><strong>Shipping Address:</strong><br/>${data.shippingAddress}</p>`;
  }

  if (data.trackingId || data.carrier) {
    html += `
      <h3 style="color: #333; margin-top: 20px;">Tracking Information</h3>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px;">
        ${data.carrier ? `<p style="margin: 0 0 5px 0;"><strong>Carrier:</strong> ${data.carrier}</p>` : ''}
        ${data.trackingId ? `<p style="margin: 0;"><strong>Tracking ID:</strong> <span style="font-family: monospace; font-size: 1.1em;">${data.trackingId}</span></p>` : ''}
      </div>
    `;
  }

  return html;
};

const generateStatusTimelineHtml = (currentStatus: string) => {
  const statusFlow = ["PLACED", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
  const currentIdx = statusFlow.indexOf((currentStatus || "").toUpperCase());
  
  if (currentIdx === -1) {
    return '';
  }

  let html = `<table style="width: 100%; text-align: center; margin: 25px 0; font-size: 12px; font-family: sans-serif; border-collapse: collapse;"><tr>`;
  
  statusFlow.forEach((s, idx) => {
    const isCompleted = idx <= currentIdx;
    const isCurrent = idx === currentIdx;
    const color = isCurrent ? '#f97316' : (isCompleted ? '#10b981' : '#9ca3af');
    const fontWeight = isCurrent ? 'bold' : 'normal';
    
    html += `<td style="color: ${color}; font-weight: ${fontWeight}; padding: 5px; width: 15%;">${s}</td>`;
    
    if (idx < statusFlow.length - 1) {
      const arrowColor = isCompleted && idx < currentIdx ? '#10b981' : '#d1d5db';
      html += `<td style="color: ${arrowColor}; font-weight: bold; width: 5%; font-size: 16px;">&rarr;</td>`;
    }
  });

  html += `</tr></table>`;
  return html;
};

export const sendOrderConfirmationEmail = async (data: OrderEmailData) => {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY is not defined in environment variables");
    return;
  }

  const displayOrderId = data.orderDate ? getDisplayOrderId(data.orderId, data.orderDate) : data.orderId.slice(0, 8).toUpperCase();

  const payload = {
    sender: {
      name: env.BREVO_SENDER_NAME,
      email: env.BREVO_SENDER_EMAIL || "info@ucenterprises.com"
    },
    to: [
      {
        email: data.customerEmail,
        name: data.customerName
      }
    ],
    subject: `Order Confirmation - #${displayOrderId}`,
    htmlContent: `
      <html>
        <head></head>
        <body style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">Order Confirmation</h2>
          <p>Dear ${data.customerName},</p>
          <p>Thank you for your order! We have successfully received your order <strong>#${displayOrderId}</strong>.</p>
          
          ${generateStatusTimelineHtml('PLACED')}
          
          ${generateOrderItemsHtml(data)}
          
          <p style="margin-top: 20px;">We will notify you once your order is processed and shipped.</p>
          <br/>
          <p>Best regards,</p>
          <p><strong>${env.BREVO_SENDER_NAME}</strong></p>
        </body>
      </html>
    `
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Brevo Email Notification failed:", err);
    }
  } catch (err) {
    console.error("Error sending email notification:", err);
  }
};

export const sendStatusUpdateEmail = async (
  data: OrderEmailData,
  status: string,
  remarks?: string
) => {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY is not defined in environment variables");
    return;
  }

  const displayOrderId = data.orderDate ? getDisplayOrderId(data.orderId, data.orderDate) : data.orderId.slice(0, 8).toUpperCase();

  const payload = {
    sender: {
      name: env.BREVO_SENDER_NAME,
      email: env.BREVO_SENDER_EMAIL || "info@ucenterprises.com"
    },
    to: [
      {
        email: data.customerEmail,
        name: data.customerName
      }
    ],
    subject: `Order Status Updated: ${status} (#${displayOrderId})`,
    htmlContent: `
      <html>
        <head></head>
        <body style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">Order Update</h2>
          <p>Dear ${data.customerName},</p>
          <p>The status of your order <strong>#${displayOrderId}</strong> has been updated to:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 1.1em; font-weight: bold; display: inline-block; margin: 10px 0; border-left: 4px solid #f97316;">
            ${status}
          </div>
          ${remarks ? `<p><strong>Update notes:</strong> ${remarks}</p>` : ""}
          
          ${generateStatusTimelineHtml(status)}
          
          ${generateOrderItemsHtml(data)}
          
          <p style="margin-top: 20px;">You can view and track your order details on your dashboard.</p>
          <br/>
          <p>Best regards,</p>
          <p><strong>${env.BREVO_SENDER_NAME}</strong></p>
        </body>
      </html>
    `
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Brevo Email Notification failed:", err);
    }
  } catch (err) {
    console.error("Error sending email notification:", err);
  }
};

export const sendResetPasswordEmail = async (
  email: string,
  customerName: string,
  resetLink: string
) => {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not defined in environment variables");
  }

  const payload = {
    sender: {
      name: env.BREVO_SENDER_NAME,
      email: env.BREVO_SENDER_EMAIL || "info@ucenterprises.com"
    },
    to: [
      {
        email: email,
        name: customerName
      }
    ],
    subject: "Reset Your Password - UC Enterprises",
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f9fafb;
              color: #1f2937;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .container {
              max-width: 540px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
              border: 1px solid #e5e7eb;
            }
            .header {
              background-color: #18181b;
              padding: 32px;
              text-align: center;
            }
            .header img {
              height: 40px;
              margin-bottom: 12px;
            }
            .header h1 {
              color: #ffffff;
              font-size: 20px;
              font-weight: 800;
              margin: 0;
              letter-spacing: 0.05em;
              text-transform: uppercase;
            }
            .content {
              padding: 40px 32px;
            }
            .greeting {
              font-size: 18px;
              font-weight: bold;
              color: #111827;
              margin-top: 0;
              margin-bottom: 16px;
            }
            .text {
              font-size: 15px;
              line-height: 1.6;
              color: #4b5563;
              margin-bottom: 28px;
            }
            .cta-container {
              text-align: center;
              margin: 32px 0;
            }
            .btn {
              display: inline-block;
              background-color: #f97316;
              color: #ffffff !important;
              text-decoration: none;
              font-size: 14px;
              font-weight: 700;
              padding: 14px 32px;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
              transition: all 0.2s ease;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .btn:hover {
              background-color: #ea580c;
            }
            .warning {
              font-size: 13px;
              color: #9ca3af;
              line-height: 1.5;
              border-top: 1px solid #f3f4f6;
              padding-top: 20px;
              margin-top: 28px;
            }
            .link-fallback {
              word-break: break-all;
              font-size: 12px;
              color: #6b7280;
              background-color: #f3f4f6;
              padding: 12px;
              border-radius: 6px;
              margin-top: 10px;
            }
            .footer {
              background-color: #f9fafb;
              padding: 24px 32px;
              text-align: center;
              border-top: 1px solid #f3f4f6;
              font-size: 12px;
              color: #9ca3af;
            }
            .footer p {
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UC Enterprises</h1>
            </div>
            <div class="content">
              <p class="greeting">Hello ${customerName || 'there'},</p>
              <p class="text">We received a request to reset the password for your UC Enterprises account. Click the button below to choose a new, secure password. This link will expire in 24 hours.</p>
              <div class="cta-container">
                <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
              </div>
              <p class="text">If you did not request a password reset, you can safely ignore this email — your account remains secure.</p>
              <div class="warning">
                If the button above doesn't work, copy and paste this URL into your browser:
                <div class="link-fallback">${resetLink}</div>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} UC Enterprises. All rights reserved.</p>
              <p>This is an automated security email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Brevo API Error: ${JSON.stringify(error)}`);
  }

  return await response.json();
};
