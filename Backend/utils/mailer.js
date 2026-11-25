import nodemailer from "nodemailer";

// Sends email through the Gmail API over HTTPS (port 443).
//
// Why not plain Gmail SMTP: Render's free plan blocks outgoing SMTP ports
// (25/465/587), so SMTP just hangs there. The Gmail API uses the same Gmail
// account and the same OAuth credentials (EMAIL_USER, CLIENT_ID,
// CLIENT_SECRET, REFRESH_TOKEN) and works on any host.
// Needs the "Gmail API" enabled in the Google Cloud project.

// fail fast instead of leaving the request hanging. Two steps (token + send),
// kept well under Netlify's ~26 second proxy limit.
const TIMEOUT_MS = 10000;

const withTimeout = () => AbortSignal.timeout(TIMEOUT_MS);

// swap the long-lived refresh token for a short-lived access token
const getAccessToken = async () => {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: process.env.REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    signal: withTimeout(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    // "invalid_grant" = the refresh token expired or was revoked - make a new one
    throw new Error(`Gmail token request failed (${res.status}): ${data.error || "unknown"} ${data.error_description || ""}`);
  }
  return data.access_token;
};

// nodemailer only builds the email here (headers, HTML, encoding) - it doesn't send it
const buildRawEmail = async (mailOptions) => {
  const builder = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const { message } = await builder.sendMail(mailOptions);
  return message.toString("base64url");
};

const sendMail = async (mailOptions) => {
  const [accessToken, raw] = await Promise.all([getAccessToken(), buildRawEmail(mailOptions)]);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
    signal: withTimeout(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gmail send failed (${res.status}): ${detail.slice(0, 300)}`);
  }
};

// Send the 6 digit OTP to the user during registration.
export const sendOtpEmail = async (to, otp) => {
  await sendMail({
    from: `"Job Forest" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your email - Job Forest",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #6B3AC2; margin-bottom: 4px;">Job Forest</h2>
        <p style="color: #555;">Use the code below to verify your email address.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111; text-align: center; padding: 16px 0;">
          ${otp}
        </div>
        <p style="color: #888; font-size: 13px;">This code will expire in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
};
