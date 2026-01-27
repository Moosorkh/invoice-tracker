import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@yourdomain.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://invoice-tracker.up.railway.app";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using Resend
 */
async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[EMAIL] No RESEND_API_KEY set. Would have sent to ${to}: ${subject}`);
    console.log(`[EMAIL PREVIEW]\n${html}\n`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send to ${to}:`, error);
    throw new Error("Failed to send email");
  }
}

/**
 * Send magic link email for portal access
 */
export async function sendMagicLinkEmail(
  email: string,
  tenantSlug: string,
  token: string
): Promise<void> {
  const magicLink = `${FRONTEND_URL}/t/${tenantSlug}/portal/auth/verify?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Login Link</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 20px 0;">
          <h2 style="color: #1976d2; margin-top: 0;">Your Portal Login Link</h2>
          <p>Click the button below to securely log in to your portal:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #1976d2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Access Portal</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 15 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this login link, you can safely ignore this email.</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message, please do not reply.</p>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "Your Portal Login Link",
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  tenantSlug: string,
  token: string
): Promise<void> {
  const resetLink = `${FRONTEND_URL}/portal/${tenantSlug}/set-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 20px 0;">
          <h2 style="color: #1976d2; margin-top: 0;">Reset Your Password</h2>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #1976d2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message, please do not reply.</p>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "Reset Your Portal Password",
    html,
  });
}

/**
 * Send portal invite email with password setup link
 */
export async function sendPortalInviteEmail(
  email: string,
  tenantSlug: string,
  token: string,
  clientName: string
): Promise<void> {
  const setupLink = `${FRONTEND_URL}/portal/${tenantSlug}/set-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Your Portal</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 20px 0;">
          <h2 style="color: #1976d2; margin-top: 0;">Welcome to Your Portal</h2>
          <p>You've been invited to access your portal account for <strong>${clientName}</strong>.</p>
          <p>To get started, click the button below to set your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupLink}" style="background-color: #1976d2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Set Password & Activate Account</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 7 days.</p>
          <p style="color: #666; font-size: 14px;">Once you set your password, you'll be able to log in to view your account information, documents, and more.</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message, please do not reply.</p>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "Your Portal Account is Ready",
    html,
  });
}
