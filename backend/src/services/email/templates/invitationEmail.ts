import { getEnv } from '../../../config/env';

const env = getEnv();
const APP_URL = getEnv().NEXT_PUBLIC_APP_URL;

export function invitationEmail(
  disputeTitle: string,
  inviterName: string,
  token: string,
  expiresAt: string
): string {
  const acceptUrl = `${APP_URL}/invitations/${token}/accept`;
  const declineUrl = `${APP_URL}/invitations/${token}/decline`;
  const expiryDate = new Date(expiresAt).toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { padding: 32px 32px 0; text-align: center; }
    .header h1 { font-size: 24px; color: #111827; margin: 0; }
    .content { padding: 24px 32px; }
    .content p { font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .button:hover { background: #1d4ed8; }
    .footer { padding: 24px 32px 32px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚖️ You're Invited to MeritView</h1>
    </div>
    <div class="content">
      <p><strong>${inviterName}</strong> has invited you to participate in a dispute analysis on MeritView.</p>
      <p><strong>Dispute:</strong> ${disputeTitle}</p>
      <p>MeritView provides AI-powered analysis to help resolve disputes fairly and efficiently. By accepting, you can submit your side of the story and receive an objective assessment.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${acceptUrl}" class="button">Accept Invitation</a>
      </div>
      <p style="text-align: center;">
        <a href="${declineUrl}" style="color: #6b7280; font-size: 14px;">Decline invitation</a>
      </p>
      <p style="font-size: 14px; color: #6b7280;">This invitation expires on ${expiryDate}.</p>
    </div>
    <div class="footer">
      <p>MeritView — Decision Support for Disputes</p>
      <p>This is an automated message. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export function invitationAcceptedEmail(disputeTitle: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .content { padding: 32px; text-align: center; }
    .content h1 { font-size: 24px; color: #111827; margin: 0 0 16px; }
    .content p { font-size: 16px; color: #374151; margin: 0 0 16px; }
    .footer { padding: 24px 32px 32px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>✅ Invitation Accepted</h1>
      <p>The counterparty has accepted your invitation for dispute: <strong>${disputeTitle}</strong>.</p>
      <p>Both parties can now submit their briefs for analysis.</p>
    </div>
    <div class="footer">
      <p>MeritView — Decision Support for Disputes</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export function invitationDeclinedEmail(disputeTitle: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .content { padding: 32px; text-align: center; }
    .content h1 { font-size: 24px; color: #111827; margin: 0 0 16px; }
    .content p { font-size: 16px; color: #374151; margin: 0 0 16px; }
    .footer { padding: 24px 32px 32px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>❌ Invitation Declined</h1>
      <p>The counterparty has declined the invitation for dispute: <strong>${disputeTitle}</strong>.</p>
    </div>
    <div class="footer">
      <p>MeritView — Decision Support for Disputes</p>
    </div>
  </div>
</body>
</html>`.trim();
}
