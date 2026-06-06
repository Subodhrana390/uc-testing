export const sendInvoiceEmail = async (
  email: string,
  customerName: string,
  orderId: string,
  pdfBase64: string
) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not defined in environment variables");
  }

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL
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
          <p><strong>${process.env.BREVO_SENDER_NAME}</strong></p>
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
