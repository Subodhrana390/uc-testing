"use server";

export async function sendInvoiceEmail(formData: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  pdfBase64: string;
}) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error("BREVO_API_KEY is not configured");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || "UC ENTERPRISES",
          email: process.env.BREVO_SENDER_EMAIL || "ucenterprises1@gmail.com",
        },
        to: [
          {
            email: formData.customerEmail,
            name: formData.customerName,
          },
        ],
        subject: `Invoice for Order ${formData.orderId} - UC ENTERPRISES`,
        htmlContent: `
          <html>
            <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #000;">Invoice - UC ENTERPRISES</h2>
              <p>Dear ${formData.customerName},</p>
              <p>Thank you for your order <strong>${formData.orderId}</strong>. Please find your invoice attached to this email.</p>
              <p>If you have any questions, feel free to reply to this email.</p>
              <br/>
              <p>Best Regards,<br/><strong>UC ENTERPRISES Team</strong></p>
            </body>
          </html>
        `,
        attachment: [
          {
            content: formData.pdfBase64,
            name: `Invoice_${formData.orderId}.pdf`,
          },
        ],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to send invoice email via Brevo API");
    }

    return { success: true, message: "Invoice sent successfully!" };
  } catch (error: any) {
    console.error("Brevo API Error:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred while sending the invoice.",
    };
  }
}
