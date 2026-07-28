import { getEnv } from '../../../config/env';

export function paymentSuccessEmail(amount: number): string {
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL;

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
            <h1 style="color:#ffffff;font-size:24px;margin:16px 0 0 0;font-weight:600">Payment Successful</h1>
          </td>
        </tr>
        <tr><td style="padding:40px">
          <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px 0">Your payment has been processed successfully.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px">
            <tr><td style="padding:16px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#64748b;font-size:14px">Amount Paid</td>
                  <td style="text-align:right;color:#1e293b;font-size:18px;font-weight:600">$${amount.toFixed(2)} USD</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0">Your dispute is now being analyzed by our AI evaluators. We'll notify you when the opinion is ready, typically within a few minutes.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr><td style="background-color:#1e3a5f;border-radius:8px;padding:12px 32px">
              <a href="${appUrl}/dashboard/disputes" style="color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;display:inline-block">View My Disputes</a>
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
