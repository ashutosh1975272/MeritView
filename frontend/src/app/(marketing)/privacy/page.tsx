export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: July 2026</p>
      <div className="prose prose-gray max-w-none space-y-6">
        <h2>1. Scope and Applicability</h2>
        <p>This Privacy Policy describes how MeritView collects, uses, stores, and protects your personal information when you use our platform. It applies to all users, including visitors, registered users, and parties to disputes. By using MeritView, you consent to the practices described in this policy.</p>

        <h2>2. Information We Collect</h2>
        <p><strong>Account Information:</strong> When you register, we collect your email address, display name, password hash, and optional profile information such as timezone and locale. OAuth credentials if you sign in via third-party providers.</p>
        <p><strong>Dispute Information:</strong> Brief content, case descriptions, supporting documents, party details, and all communications related to disputes submitted through our platform.</p>
        <p><strong>Payment Information:</strong> Payment processing is handled by Stripe. We do not store full credit card numbers. We store transaction IDs, amounts, and payment status for record-keeping.</p>
        <p><strong>Usage Data:</strong> Page views, feature interactions, session duration, and referral information. We collect IP addresses for security and rate limiting purposes.</p>
        <p><strong>Communication Data:</strong> Email correspondence with our support team, marketing preferences, and opt-in consents.</p>

        <h2>3. Legal Basis for Processing</h2>
        <p>We process your personal information based on: (a) contractual necessity — to provide the Service you requested; (b) legitimate interests — to improve our Service, maintain security, and prevent fraud; (c) consent — for marketing communications where you have opted in; (d) legal obligations — to comply with applicable laws and regulations.</p>

        <h2>4. How We Use Your Information</h2>
        <p>We use your information to: (a) provide, maintain, and improve the Service; (b) process dispute analysis and generate opinions; (c) process payments and manage billing; (d) send service-related communications (e.g., opinion ready, payment confirmations); (e) send marketing communications only with your explicit opt-in consent; (f) detect and prevent fraud, abuse, and security incidents; (g) comply with legal obligations; (h) generate anonymized aggregate analytics for service improvement.</p>
        <p><strong>Brief content is used exclusively for evaluation purposes and is never used for AI model training or any purpose beyond providing the Service to you.</strong></p>

        <h2>5. Data Storage and Security</h2>
        <p>All brief content is encrypted at rest using AES-256-GCM encryption before being stored in our database. Encryption keys are managed separately and rotated regularly. Database connections are encrypted using TLS 1.3. In-transit data is protected by HTTPS/TLS. Access controls enforce strict least-privilege principles. We conduct regular security audits, penetration testing, and vulnerability assessments. Our infrastructure is hosted on AWS with SOC 2 compliant data centers.</p>

        <h2>6. Data Sharing and Third-Party Processors</h2>
        <p>We share your brief content with our AI evaluation providers (Groq, Google Gemini) solely for the purpose of evaluating your dispute. These providers have contractual guarantees prohibiting use of your data for training AI models, improving their services, or any purpose beyond processing your specific evaluation request. We do not sell your personal information to third parties. We do not share your personal information with third parties for their marketing purposes. We may share anonymized, aggregated data that cannot reasonably identify you for analytics and reporting.</p>
        <p><strong>Third-Party Processors:</strong> Our service uses: Stripe (payment processing), Groq (AI evaluation), Google Cloud/Gemini (AI evaluation), AWS (cloud infrastructure), Sentry (error monitoring, opt-in). Each processor is contractually bound to process data only as instructed by us and to maintain appropriate security measures.</p>

        <h2>7. Data Retention</h2>
        <p><strong>Account Data:</strong> Retained until you delete your account, plus 30 days for final processing. After deletion, personal data is anonymized and retained only for legal compliance (e.g., transaction records for tax purposes).</p>
        <p><strong>Brief Content:</strong> Retained for the duration of the dispute plus 90 days after completion or withdrawal, after which it is permanently and irreversibly deleted. Brief content in active disputes is retained until the dispute is completed, withdrawn, or deleted.</p>
        <p><strong>Payment Records:</strong> Retained for 7 years as required by tax and financial regulations. Payment records do not contain full payment card data.</p>
        <p><strong>Usage Logs:</strong> Retained for 90 days for security analysis, then aggregated and anonymized.</p>
        <p><strong>Communication Records:</strong> Support correspondence retained for 2 years after resolution.</p>

        <h2>8. Your Rights and Choices</h2>
        <p>You have the right to: (a) <strong>Access</strong> — request a copy of your personal data we hold; (b) <strong>Correct</strong> — update inaccurate or incomplete information through account settings; (c) <strong>Delete</strong> — request deletion of your account and associated data, subject to legal retention requirements; (d) <strong>Portability</strong> — request export of your data in a machine-readable format; (e) <strong>Restrict</strong> — request restriction of processing in certain circumstances; (f) <strong>Object</strong> — object to processing based on legitimate interests; (g) <strong>Withdraw Consent</strong> — withdraw marketing consent at any time without affecting service availability.</p>
        <p>To exercise these rights, contact privacy@meritview.ai or use account settings where available. We will respond within 30 days. If you are in the EEA or UK, you have the right to lodge a complaint with your local data protection authority.</p>

        <h2>9. Cookies and Tracking</h2>
        <p>We use essential cookies for authentication, session management, and security. These cookies are strictly necessary for the Service to function. We do not use tracking cookies, advertising cookies, third-party analytics cookies, or any form of cross-site tracking. Session cookies expire when you log out. Persistent authentication cookies expire after 7 days. You can configure your browser to reject cookies, but this may affect service functionality.</p>

        <h2>10. Children's Privacy</h2>
        <p>The Service is not directed at individuals under 18. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal data, we will delete it immediately. If you believe a minor has provided us with personal data, contact us at privacy@meritview.ai.</p>

        <h2>11. International Data Transfers</h2>
        <p>Your data may be processed in the United States and other jurisdictions where our service providers operate. For users in the European Economic Area (EEA), United Kingdom, or other jurisdictions with data transfer restrictions, we ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the European Commission. Our AI providers are contractually bound to process data only in regions specified in our Data Processing Agreement.</p>

        <h2>12. Data Breach Notification</h2>
        <p>In the event of a data breach that affects your personal information, we will notify you within 72 hours of becoming aware of the breach. Notification will include the nature of the breach, categories of data affected, steps taken to address it, and recommendations for affected users. We will also notify relevant regulatory authorities as required by law.</p>

        <h2>13. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Material changes will be communicated via email (if you have an account) or through a notice on our website. The effective date at the top of this policy will be updated. Continued use after changes go into effect constitutes acceptance of the updated policy.</p>

        <h2>14. Contact and Data Controller</h2>
        <p>MeritView Inc. is the data controller for your personal information. For privacy-related inquiries, data subject requests, or questions about this policy, contact: privacy@meritview.ai or write to: MeritView Privacy, 100 Innovation Drive, Suite 300, Wilmington, DE 19801, USA. Our Data Protection Officer can be reached at dpo@meritview.ai.</p>

        <h2>15. California Privacy Rights</h2>
        <p>California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to delete personal information, and the right to opt out of the sale of personal information. MeritView does not sell personal information. To exercise your CCPA rights, contact privacy@meritview.ai. We will not discriminate against you for exercising these rights.</p>
      </div>
    </div>
  );
}
