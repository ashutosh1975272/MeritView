interface BriefSubmittedProps {
  disputeTitle: string;
  disputeLink: string;
}

export function briefSubmitted(props: BriefSubmittedProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brief Submitted</title>
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
  .logo { max-width: 150px; margin-bottom: 8px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><img class="logo" src="https://meritview.app/logo.png" alt="MeritView" /><h1>MeritView</h1></div>
  <div class="body">
    <p>Your brief has been submitted successfully for:</p>
    <p style="font-size:18px; font-weight:600; color:#1a1a2e;">${props.disputeTitle}</p>
    <p>What happens next:</p>
    <ol style="color:#333; line-height:1.8;">
      <li>We'll notify the other party to submit their brief</li>
      <li>Once all briefs are in, you'll be prompted to complete payment</li>
      <li>Our AI evaluators will analyze both positions</li>
    </ol>
    <p style="text-align:center"><a class="button" href="${props.disputeLink}">View Dispute</a></p>
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
