import 'server-only'
import { env } from '@/env'

export const sendInvoiceEmail = async (
  email: string,
  customerName: string,
  orderId: string,
  pdfBase64: string
) => {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not defined in environment variables");
  }

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
    subject: `Invoice for Order #${orderId.slice(0, 8).toUpperCase()} - UC Enterprises`,
    htmlContent: `
      <html>
        <head></head>
        <body>
          <p>Dear ${customerName},</p>
          <p>Thank you for shopping with UC Enterprises! Your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been delivered successfully.</p>
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
        name: `Invoice_${orderId.slice(0, 8).toUpperCase()}.pdf`
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

export const sendStatusUpdateEmail = async (
  email: string,
  customerName: string,
  orderId: string,
  status: string,
  remarks?: string
) => {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY is not defined in environment variables");
    return;
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
    subject: `Order Status Updated: ${status} (#${orderId.slice(0, 8).toUpperCase()})`,
    htmlContent: `
      <html>
        <head></head>
        <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #f97316;">Order Update</h2>
          <p>Dear ${customerName},</p>
          <p>The status of your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been updated to:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 1.1em; font-weight: bold; display: inline-block; margin: 10px 0;">
            ${status}
          </div>
          ${remarks ? `<p><strong>Update notes:</strong> ${remarks}</p>` : ""}
          <p>You can view and track your order details on your dashboard.</p>
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
