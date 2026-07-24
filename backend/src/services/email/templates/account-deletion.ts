interface AccountDeletionProps {
  displayName: string;
}

export function accountDeletion(props: AccountDeletionProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Account Deletion Confirmation</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f7; }
  .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
  .body { padding: 40px; }
  .body p { color: #333; line-height: 1.6; margin: 0 0 16px; }
  .footer { padding: 24px 40px; background: #f4f4f7; text-align: center; }
  .footer p { color: #888; font-size: 12px; margin: 0; }
  .logo { max-width: 150px; margin-bottom: 8px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><img class="logo" src="https://meritview.app/logo.png" alt="MeritView" /><h1>MeritView</h1></div>
  <div class="body">
    <p>Hello ${props.displayName},</p>
    <p>We're writing to confirm that your MeritView account has been deleted.</p>
    <p>All your personal data has been removed from our systems in accordance with our privacy policy.</p>
    <p>If you did not request this deletion or believe this was done in error, please contact our support team immediately.</p>
    <p>We're sorry to see you go. If you ever want to return, you're welcome to create a new account.</p>
  </div>
  <div class="footer">
    <p>MeritView &mdash; AI-Powered Dispute Resolution</p>
    <p>Contact: support@meritview.app</p>
    <p>&copy; ${new Date().getFullYear()} MeritView. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}
