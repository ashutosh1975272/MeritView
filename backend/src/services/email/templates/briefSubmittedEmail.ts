import { getEnv } from '../../../config/env';

export function briefSubmittedEmail(disputeId: string): string {
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL;
  const disputeUrl = `${appUrl}/dashboard/disputes/${disputeId}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);padding:32px 40px;text-align:center">
            <img src="${appUrl}/logo.png" alt="MeritView" width="180" height="40" style="display:block;margin:0 auto" />
            <h1 style="color:#ffffff;font-size:24px;margin:16px 0 0 0;font-weight:600">Brief Submitted</h1>
          </td>
        </tr>
        <tr><td style="padding:40px">
          <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px 0">Your brief has been submitted and sealed successfully. The content is now encrypted and immutable.</p>
          <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px">
            <p style="color:#166534;font-size:14px;margin:0;font-weight:500">Your brief is encrypted and can no longer be edited. This ensures the integrity of the analysis process.</p>
          </div>
          <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0">The next step is to complete payment to start the AI analysis. Your dispute will be evaluated by multiple AI models.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr><td style="background-color:#1e3a5f;border-radius:8px;padding:12px 32px">
              <a href="${disputeUrl}" style="color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;display:inline-block">Proceed to Payment</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0">
          <p style="color:#64748b;font-size:13px;line-height:1.5;margin:0 0 8px 0">MeritView — AI Decision Support for Contract Disputes</p>
          <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0 0 4px 0">This is an automated message. Do not reply to this email.</p>
          <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0">
            <a href="${appUrl}/contact" style="color:#1e3a5f;text-decoration:none">Contact Support</a>
            &nbsp;&middot;&nbsp;
            <a href="${appUrl}/privacy" style="color:#1e3a5f;text-decoration:none">Privacy Policy</a>
            &nbsp;&middot;&nbsp;
            <a href="${appUrl}/unsubscribe" style="color:#94a3b8;text-decoration:none">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
