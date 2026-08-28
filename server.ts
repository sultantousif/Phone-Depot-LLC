import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./src/firebase/config";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Lazy mail transport creation to avoid crashes on startup if envs missing
function getMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.office365.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "admin@hgwcwportal.com";
  const pass = process.env.SMTP_PASS;

  if (!pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 (STARTTLS)
    auth: {
      user,
      pass,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Resolve username/identifier to email for Firebase Authentication
app.get("/api/auth/resolve-identifier", async (req, res) => {
  try {
    const rawIdentifier = ((req.query.identifier as string) || "").trim();
    if (!rawIdentifier) {
      return res.status(400).json({ error: "Identifier query parameter is required" });
    }

    // Strip leading '@' if present and normalize to lowercase
    const cleanIdentifier = rawIdentifier.startsWith("@")
      ? rawIdentifier.slice(1).toLowerCase()
      : rawIdentifier.toLowerCase();

    // If the input is already an email format, return it directly
    if (cleanIdentifier.includes("@") && cleanIdentifier.includes(".")) {
      return res.json({ email: cleanIdentifier });
    }

    // 1. Search in Firestore members collection (case-insensitive)
    const membersSnap = await getDocs(collection(db, "members"));
    for (const docSnap of membersSnap.docs) {
      const data = docSnap.data();
      const username = (data.username || "").toLowerCase();
      const tempUsername = (data.tempUsername || "").toLowerCase();
      const customId = (data.customIdentifier || "").toLowerCase();
      const docEmail = (data.email || "").trim().toLowerCase();

      if (
        (username && username === cleanIdentifier) ||
        (tempUsername && tempUsername === cleanIdentifier) ||
        (customId && customId === cleanIdentifier) ||
        (docEmail && docEmail === cleanIdentifier)
      ) {
        if (data.email && data.email.trim()) {
          return res.json({ email: data.email.trim().toLowerCase() });
        }
      }
    }

    // 2. Search in Firestore admins collection (case-insensitive)
    const adminsSnap = await getDocs(collection(db, "admins"));
    for (const docSnap of adminsSnap.docs) {
      const data = docSnap.data();
      const username = (data.username || "").toLowerCase();
      const adminEmail = (data.email || "").trim().toLowerCase();

      if (
        (username && username === cleanIdentifier) ||
        (adminEmail && adminEmail === cleanIdentifier)
      ) {
        if (data.email && data.email.trim()) {
          return res.json({ email: data.email.trim().toLowerCase() });
        }
      }
    }

    return res.status(404).json({ error: "Member not found" });
  } catch (error: any) {
    console.error("Error resolving identifier:", error);
    return res.status(500).json({ error: "Failed to resolve identifier" });
  }
});

// Admin-only migration endpoint to create Firebase Auth accounts for existing members
app.post("/api/admin/migrate-members-to-auth", async (req, res) => {
  const caller = req.headers["x-admin-caller"] || req.body?.adminEmail || "Admin";
  console.log(`[Auth Migration] Triggered by: ${caller} at ${new Date().toISOString()}`);

  const summary = {
    created: 0,
    skipped: 0,
    failed: 0,
    details: [] as Array<{ email: string; status: string; reason?: string }>
  };

  try {
    const firebaseConfig = (await import("./firebase-applet-config.json", { assert: { type: "json" } })).default;
    const apiKey = firebaseConfig.apiKey;

    const membersSnap = await getDocs(collection(db, "members"));
    console.log(`[Auth Migration] Found ${membersSnap.docs.length} member records in Firestore.`);

    for (const docSnap of membersSnap.docs) {
      const member = docSnap.data();
      const email = (member.email || "").trim().toLowerCase();
      const rawPassword = member.password || member.passcode || member.tempPassword;

      if (!email) {
        console.log(`[Auth Migration] Skipping member ${member.username || docSnap.id} (no email address found)`);
        summary.skipped++;
        summary.details.push({
          email: member.username || docSnap.id,
          status: "skipped",
          reason: "No email address found on member record"
        });
        continue;
      }

      if (!rawPassword) {
        console.log(`[Auth Migration] Skipping member ${email} (no password/passcode found on member record)`);
        summary.skipped++;
        summary.details.push({
          email,
          status: "skipped",
          reason: "No password or passcode found on member record"
        });
        continue;
      }

      // Ensure password is at least 6 characters for Firebase Auth requirements
      const password = String(rawPassword).length >= 6 
        ? String(rawPassword) 
        : String(rawPassword).padEnd(6, "0");

      try {
        // Create user via Firebase Auth REST API (SignUp endpoint)
        const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
        const response = await fetch(signUpUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: false
          })
        });

        const data: any = await response.json();

        if (response.ok) {
          console.log(`[Auth Migration] Successfully created Firebase Auth account for: ${email}`);
          summary.created++;
          summary.details.push({ email, status: "created" });
        } else {
          const errorMsg = data?.error?.message || "Unknown error";
          if (errorMsg.includes("EMAIL_EXISTS")) {
            console.log(`[Auth Migration] Account already exists for: ${email} (skipping)`);
            summary.skipped++;
            summary.details.push({ email, status: "skipped", reason: "Account already exists" });
          } else {
            console.error(`[Auth Migration] Failed to create account for: ${email} - ${errorMsg}`);
            summary.failed++;
            summary.details.push({ email, status: "failed", reason: errorMsg });
          }
        }
      } catch (memberErr: any) {
        console.error(`[Auth Migration] Exception creating account for: ${email}`, memberErr);
        summary.failed++;
        summary.details.push({ email, status: "failed", reason: memberErr.message || String(memberErr) });
      }
    }

    console.log(`[Auth Migration] Migration summary:`, {
      created: summary.created,
      skipped: summary.skipped,
      failed: summary.failed
    });

    return res.json({
      created: summary.created,
      skipped: summary.skipped,
      failed: summary.failed,
      message: "Migration complete",
      details: summary.details
    });
  } catch (err: any) {
    console.error("[Auth Migration] Fatal error during migration:", err);
    return res.status(500).json({
      error: "Migration failed",
      message: err.message || String(err)
    });
  }
});

// SMTP Status / Check endpoint
app.get("/api/smtp-status", (_req, res) => {
  const configured = !!process.env.SMTP_PASS;
  res.json({
    configured,
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "admin@hgwcwportal.com",
    fromName: process.env.SMTP_FROM_NAME || "HG World Class Wholesale Portal",
    host: process.env.SMTP_HOST || "smtp.office365.com",
    port: process.env.SMTP_PORT || "587",
  });
});

// API route to dispatch member invitations via GoDaddy / Microsoft 365
app.post("/api/send-invitation", async (req, res) => {
  try {
    const { 
      to, 
      recipientName, 
      invitationLink, 
      senderName, 
      customMessage, 
      token, 
      businessName,
      username,
      password,
      creditAllocation,
      paymentCycleDays
    } = req.body;

    if (!to || !invitationLink) {
      return res.status(400).json({ 
        success: false, 
        message: "Recipient email and invitation link are required." 
      });
    }

    const transporter = getMailTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "admin@hgwcwportal.com";
    const fromName = process.env.SMTP_FROM_NAME || "HG World Class Wholesale Portal";

    const nameToDisplay = recipientName || "Valued Partner";
    const adminNameToDisplay = senderName || "HG World Class Administration";
    const orgName = businessName ? ` for ${businessName}` : "";
    const memberUsername = username || to.split('@')[0];
    const memberPassword = password || "Metro2026!";
    const creditDisplay = creditAllocation ? `$${Number(creditAllocation).toLocaleString()}` : "$10,000";
    const termsDisplay = paymentCycleDays ? `${paymentCycleDays} Days Net` : "14 Days Net";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wholesale Account Invitation - HG World Class</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: center; border-bottom: 2px solid #3b82f6;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                HG WORLD CLASS
              </h1>
              <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                Wholesale Product Distribution Portal
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
                Wholesale Partner Account Activation${orgName}
              </h2>
              
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
                Hello <strong>${nameToDisplay}</strong>,
              </p>
              
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                You have been authorized by <strong>${adminNameToDisplay}</strong> to access the <strong>HG World Class Wholesale Portal</strong>. Your account provides access to verified B2B catalog pricing, volume ordering, approved credit limits, and streamlined invoice management.
              </p>

              ${customMessage ? `
              <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px; font-size: 14px; color: #334155; font-style: italic;">
                "${customMessage}"
              </div>
              ` : ''}

              <!-- Authorized Credentials Box (Highlighted) -->
              <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;">
                <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">
                  ✓ Authorized Login Credentials
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #1e293b;">
                  <tr>
                    <td style="padding: 6px 0; width: 140px; color: #475569;"><strong>Portal Username:</strong></td>
                    <td style="padding: 6px 0;">
                      <code style="background-color: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 14px; font-weight: 700;">${memberUsername}</code>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #475569;"><strong>Initial Password:</strong></td>
                    <td style="padding: 6px 0;">
                      <code style="background-color: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 14px; font-weight: 700;">${memberPassword}</code>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #475569;"><strong>Authorized Email:</strong></td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${to}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #475569;"><strong>Credit Line:</strong></td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${creditDisplay} (${termsDisplay})</td>
                  </tr>
                </table>
              </div>

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                      Activate Account & Sign In &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
                Direct setup & activation link:
              </p>
              <p style="font-size: 12px; word-break: break-all; color: #2563eb; background-color: #f1f5f9; padding: 10px 14px; border-radius: 6px; margin: 0 0 24px 0;">
                ${invitationLink}
              </p>

              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

              <p style="font-size: 14px; color: #475569; margin: 0;">
                Best regards,<br />
                <strong>HG World Class Wholesale Team</strong><br />
                <span style="font-size: 12px; color: #94a3b8;">Distribution & Logistics Services</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                Official correspondence from <strong>HG World Class Portal</strong>
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Sent from ${fromEmail} &bull; Powered by Hassle Free Services
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const plainTextContent = `
Wholesale Partner Account Activation - HG World Class

Hello ${nameToDisplay},

You have been invited by ${adminNameToDisplay} to access the HG World Class Wholesale Portal${orgName}.

YOUR AUTHORIZED LOGIN CREDENTIALS:
------------------------------------------
• Portal Username: ${memberUsername}
• Initial Password: ${memberPassword}
• Authorized Email: ${to}
• Credit Line: ${creditDisplay} (${termsDisplay})
------------------------------------------

Activate your account and sign in by clicking the link below:
${invitationLink}

${customMessage ? `Note from Admin:\n"${customMessage}"\n\n` : ''}
Best regards,
HG World Class Wholesale Team
Sent from ${fromEmail}
    `.trim();

    if (!transporter) {
      // Return simulated success with configuration reminder if password not yet configured
      return res.status(200).json({
        success: true,
        dispatched: false,
        requiresConfig: true,
        from: fromEmail,
        to,
        message: "Email dispatcher is ready. To send live emails through Microsoft 365, please configure SMTP_PASS in environment settings.",
      });
    }

    // Send actual email via Microsoft 365
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `Official Invitation: HG World Class Wholesale Portal Account Activation`,
      text: plainTextContent,
      html: htmlContent,
    });

    return res.status(200).json({
      success: true,
      dispatched: true,
      messageId: info.messageId,
      to,
      from: fromEmail,
      message: `Invitation successfully emailed to ${to} from ${fromEmail}`,
    });

  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to send invitation email via SMTP server.",
      errorDetails: error?.code || error?.response || String(error),
    });
  }
});

// Vite middleware / static file serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HG World Class Wholesale Server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
