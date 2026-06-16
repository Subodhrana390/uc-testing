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

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  try {
    console.log(`[send-reset-email] Received new request method: ${req.method}`);
    
    // 1. Validate Authorization Header & Service Role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("[send-reset-email] Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: corsHeaders });
    }

    try {
      const token = authHeader.replace('Bearer ', '');
      const payloadB64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadB64));
      
      // Ensure only the service_role can execute this backend function
      if (payload.role !== 'service_role') {
        console.error(`[send-reset-email] Unauthorized: Expected service_role, got ${payload.role}`);
        return new Response(JSON.stringify({ error: "Unauthorized: Function must be called with service_role key" }), { status: 403, headers: corsHeaders });
      }
    } catch (e) {
      console.error("[send-reset-email] Invalid JWT format", e);
      return new Response(JSON.stringify({ error: "Invalid JWT format" }), { status: 401, headers: corsHeaders });
    }

    // 2. Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[send-reset-email] Failed to parse request JSON body");
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
    }

    const { email, customerName, resetLink, apiKey, senderEmail, senderName } = body;

    if (!email || !resetLink) {
      console.error("[send-reset-email] Validation failed: Missing email or resetLink");
      return new Response(JSON.stringify({ error: "Missing email or resetLink" }), { status: 400, headers: corsHeaders });
    }

    // 3. Configure Brevo Settings
    const finalApiKey = apiKey || Deno.env.get("BREVO_API_KEY");
    const finalSenderEmail = senderEmail || Deno.env.get("BREVO_SENDER_EMAIL") || "info@ucenterprises.com";
    const finalSenderName = senderName || Deno.env.get("BREVO_SENDER_NAME") || "UC Enterprises";

    if (!finalApiKey) {
      console.error("[send-reset-email] Server Configuration Error: Missing Brevo API key");
      return new Response(JSON.stringify({ error: "Brevo API key is not configured" }), { status: 500, headers: corsHeaders });
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
                background-color: #dc2626; /* Updated to red brand color */
                color: #ffffff !important;
                text-decoration: none;
                font-size: 14px;
                font-weight: 700;
                padding: 14px 32px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
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
    
    console.log(`[send-reset-email] Dispatching email to Brevo for ${email}...`);

    // 4. Call Brevo API
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
      console.error(`[send-reset-email] Brevo API Error [HTTP ${response.status}]: ${errorText}`);
      // Bubble as 502 Bad Gateway to separate upstream provider errors from our own edge function errors
      return new Response(JSON.stringify({ error: "Email provider error", details: errorText }), { status: 502, headers: corsHeaders });
    }

    const resData = await response.json();
    console.log(`[send-reset-email] Email successfully sent to ${email}. MessageId: ${resData.messageId}`);
    return new Response(JSON.stringify({ success: true, data: resData }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("[send-reset-email] Unexpected internal error:", err.message);
    return new Response(JSON.stringify({ error: "Internal server error", details: err.message }), { status: 500, headers: corsHeaders });
  }
});
