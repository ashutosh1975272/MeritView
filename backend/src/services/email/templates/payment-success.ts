interface PaymentSuccessProps {
  disputeTitle: string;
  amount: number;
}

export function paymentSuccess(props: PaymentSuccessProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment Successful</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f7; }
  .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
  .body { padding: 40px; }
  .body p { color: #333; line-height: 1.6; margin: 0 0 16px; }
  .receipt { background: #f4f4f7; padding: 20px; border-radius: 8px; margin: 24px 0; }
  .receipt .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .receipt .label { color: #666; }
  .receipt .value { font-weight: 600; color: #1a1a2e; }
  .footer { padding: 24px 40px; background: #f4f4f7; text-align: center; }
  .footer p { color: #888; font-size: 12px; margin: 0; }
  .logo { max-width: 150px; margin-bottom: 8px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><img class="logo" src="https://meritview.app/logo.png" alt="MeritView" /><h1>MeritView</h1></div>
  <div class="body">
    <p>Payment received! Your AI analysis is now in progress.</p>
    <p style="font-size:18px; font-weight:600; color:#1a1a2e;">${props.disputeTitle}</p>
    <div class="receipt">
      <div class="row"><span class="label">Amount Paid</span><span class="value">$${props.amount.toFixed(2)} USD</span></div>
      <div class="row"><span class="label">Service</span><span class="value">AI Dispute Analysis</span></div>
      <div class="row"><span class="label">Status</span><span class="value">In Progress</span></div>
    </div>
    <p>We are now analyzing both positions using our multi-model AI evaluation system. You will receive the opinion within approximately 15-30 minutes.</p>
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
