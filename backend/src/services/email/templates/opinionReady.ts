interface OpinionReadyProps {
  disputeTitle: string;
  opinionLink: string;
}

export function opinionReady(props: OpinionReadyProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Opinion Ready</title>
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
    <p>Your AI-generated opinion is ready!</p>
    <p style="font-size:18px; font-weight:600; color:#1a1a2e;">${props.disputeTitle}</p>
    <p>Our multi-model analysis has completed. Your opinion report includes:</p>
    <ul style="color:#333; line-height:1.8;">
      <li>Executive summary of the dispute</li>
      <li>Analysis of both parties' positions</li>
      <li>Key issues identified by AI evaluators</li>
      <li>Comparative assessment</li>
      <li>Confidence indicators</li>
      <li>Suggested considerations</li>
    </ul>
    <p style="text-align:center"><a class="button" href="${props.opinionLink}">View Opinion</a></p>
    <p><strong>Important:</strong> This is AI-generated analysis, not legal advice. Consult a qualified attorney for legal advice specific to your situation.</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} MeritView. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}
