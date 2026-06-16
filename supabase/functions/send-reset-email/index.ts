// @ts-nocheck

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const { email, customerName, resetLink, apiKey, senderEmail, senderName } = await req.json();

    // Validate inputs
    if (!email || !resetLink) {
      return new Response(JSON.stringify({ error: "Missing email or resetLink" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Determine Brevo API key: payload or environment variable
    const finalApiKey = apiKey || Deno.env.get("BREVO_API_KEY");
    const finalSenderEmail = senderEmail || Deno.env.get("BREVO_SENDER_EMAIL") || "info@ucenterprises.com";
    const finalSenderName = senderName || Deno.env.get("BREVO_SENDER_NAME") || "UC Enterprises";

    if (!finalApiKey) {
      return new Response(JSON.stringify({ error: "Brevo API key is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Construct the payload for Brevo
    const payload = {
      sender: {
        name: finalSenderName,
        email: finalSenderEmail
      },
      to: [
        {
          email: email,
          name: customerName || "Customer"
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
                text-transform: uppercase;
                letter-spacing: 0.05em;
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
                <p class="greeting">Hello ${customerName || 'Customer'},</p>
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
        "api-key": finalApiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Brevo API Error: ${errorText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
      });
    }

    const resData = await response.json();
    return new Response(JSON.stringify({ success: true, data: resData }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
    });
  }
});
