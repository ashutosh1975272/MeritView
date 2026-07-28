export default function PrivacyPage() {
  return (
    <div className="container px-4 py-16 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: January 2024</p>
      </div>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p>
            We collect information you provide when creating an account and using the Service, including your name, email address, and dispute brief content. We also collect usage data such as page views and interactions with the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide and maintain the Service</li>
            <li>Process payments and send transaction notifications</li>
            <li>Communicate with you about the Service</li>
            <li>Improve and optimize the Service</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Data Encryption and Security</h2>
          <p>
            All brief content is encrypted at rest using AES-256-GCM encryption. Data in transit is protected using TLS 1.3. We implement industry-standard security measures to protect your information from unauthorized access, alteration, or disclosure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. AI Model Data Handling</h2>
          <p>
            We send your brief content to third-party AI models (Groq and Google) for analysis. These providers have contractual obligations to not use your data for training their models. We do not use your dispute data to train or improve our own systems.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Data Retention</h2>
          <p>
            We retain your account information for as long as your account is active. Brief content is retained for the duration necessary to provide the Service and as required by law. Upon account deletion, we delete or anonymize your data within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Payment Information</h2>
          <p>
            Payment processing is handled by Stripe, a PCI-DSS compliant payment processor. We do not store credit card numbers or sensitive payment information on our servers. Stripe&apos;s privacy policy applies to payment data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Cookies and Tracking</h2>
          <p>
            We use essential cookies for authentication and service functionality. We do not use tracking cookies or third-party analytics services. You can control cookie settings through your browser preferences.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Third-Party Services</h2>
          <p>
            We use the following third-party services: Stripe (payment processing), Groq (AI model inference), Google (Gemini AI model inference). Each service has its own privacy policy governing data handling.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">9. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, delete, or port your data. To exercise these rights, contact us at privacy@meritview.com. We will respond to requests within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">10. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for users under 18 years of age. We do not knowingly collect information from minors. If we become aware of such data, we will delete it promptly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">11. Changes to Privacy Policy</h2>
          <p>
            We may update this policy from time to time. We will notify users of material changes via email or through the Service. Continued use after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">12. Contact</h2>
          <p>
            For privacy-related inquiries, contact us at privacy@meritview.com or write to us at our registered address.
          </p>
        </section>
      </div>
    </div>
  );
}
