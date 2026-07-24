interface PasswordResetProps {
  link: string;
}

export function passwordReset(props: PasswordResetProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset Your Password</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f7; }
  .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
  .body { padding: 40px; }
  .body p { color: #333; line-height: 1.6; margin: 0 0 16px; }
  .button { display: inline-block; padding: 14px 32px; background: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 24px 0; }
  .footer { padding: 24px 40px; background: #f4f4f7; text-align: center; }
  .footer p { color: #888; font-size: 12px; margin: 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>MeritView</h1></div>
  <div class="body">
    <p>We received a request to reset your password.</p>
    <p>Click the button below to set a new password:</p>
    <p style="text-align:center"><a class="button" href="${props.link}">Reset Password</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="font-size:12px; color:#888; word-break:break-all">${props.link}</p>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request a password reset, please ignore this email.</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} MeritView. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}
