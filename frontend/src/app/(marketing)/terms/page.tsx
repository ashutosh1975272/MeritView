export default function TermsPage() {
  return (
    <div className="container px-4 py-16 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: January 2024</p>
      </div>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using MeritView (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
          <p>
            MeritView provides AI-powered decision support for contract disputes. The Service generates structured analysis of dispute briefs using multiple AI models. MeritView is a decision support tool and does not provide legal advice, legal representation, or any form of legal services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Not Legal Advice</h2>
          <p>
            MeritView is not a law firm, does not provide legal advice, and does not create an attorney-client relationship. The analysis provided by the Service is for informational and decision-support purposes only. You should consult a qualified attorney for legal advice specific to your situation.
          </p>
          <p>
            No AI-generated analysis should be relied upon as a substitute for professional legal advice. The accuracy and applicability of AI-generated analysis may vary based on the specific facts and laws of your jurisdiction.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, current, and complete information during registration.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Submit content that is illegal, harassing, threatening, or contains personally identifiable information of third parties</li>
            <li>Attempt to manipulate, hack, or disrupt the Service</li>
            <li>Use the Service for any fraudulent purpose</li>
            <li>Submit content that infringes on the rights of others</li>
            <li>Reverse engineer or attempt to extract the source code of the Service</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Fees and Payment</h2>
          <p>
            The current fee for analysis is $49 USD per dispute, unless otherwise specified. Fees are non-refundable except as expressly stated in our refund policy. We reserve the right to change fees with 30 days notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Refund Policy</h2>
          <p>
            Refunds may be issued in the following circumstances: (a) automatic refund if fewer than three AI models successfully evaluate your brief, or (b) at our discretion for service failures. Refund requests must be submitted within 7 days of analysis delivery.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Intellectual Property</h2>
          <p>
            You retain all rights to the content you submit. MeritView claims no ownership over your dispute content. The Service, including its software, algorithms, and generated analysis formats, is the intellectual property of MeritView.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">9. Limitation of Liability</h2>
          <p>
            MeritView provides the Service &ldquo;as is&rdquo; without any warranty, express or implied. In no event shall MeritView be liable for any damages arising from the use or inability to use the Service, including but not limited to reliance on AI-generated analysis.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">10. Data Privacy</h2>
          <p>
            Your use of the Service is governed by our Privacy Policy. Brief content is encrypted at rest and in transit. We do not train AI models on your data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">11. Termination</h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time. Upon termination, your data will be handled in accordance with our Privacy Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">12. Changes to Terms</h2>
          <p>
            We may modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify users of material changes via email or through the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">13. Governing Law</h2>
          <p>
            These terms are governed by the laws of the State of Delaware, without regard to its conflict of laws principles. Any disputes arising from these terms shall be resolved in the courts of Delaware.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">14. Contact</h2>
          <p>
            For questions about these terms, contact us at legal@meritview.com.
          </p>
        </section>
      </div>
    </div>
  );
}
