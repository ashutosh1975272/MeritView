export default function DisclaimerPage() {
  return (
    <div className="container px-4 py-16 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Disclaimers</h1>
        <p className="text-muted-foreground">Last updated: January 2024</p>
      </div>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        <section className="p-6 border border-yellow-200 bg-yellow-50 rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-3">Important Notice</h2>
          <p className="font-medium text-yellow-800">
            MeritView is a decision support tool. It is not a law firm, does not provide legal advice, and does not create an attorney-client relationship. The information provided by MeritView should not be relied upon as a substitute for professional legal advice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. No Legal Advice</h2>
          <p>
            MeritView provides AI-generated analysis for informational and decision-support purposes only. The analysis does not constitute legal advice, legal opinion, or any form of legal representation. You should consult a qualified attorney licensed in your jurisdiction for advice specific to your situation.
          </p>
          <p>
            No attorney-client relationship is created by using MeritView. Communications between you and MeritView are not protected by attorney-client privilege or work-product doctrine.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. No Guarantee of Outcomes</h2>
          <p>
            MeritView does not guarantee any particular outcome or result from the use of its analysis. The AI models may not correctly identify all relevant legal principles, factual issues, or strategic considerations. The analysis should be considered one input among many in your decision-making process.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. AI Limitations</h2>
          <p>
            AI models have known limitations including but not limited to: potential for hallucination (generating incorrect but plausible-sounding content), bias in training data, inability to understand context beyond training data, and varying performance across different types of disputes. The analysis should be reviewed critically.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. No Warranty</h2>
          <p>
            MeritView provides the Service &ldquo;as is&rdquo; without any warranty, express or implied. We do not warrant that the analysis will be accurate, complete, or timely. We disclaim all warranties including merchantability and fitness for a particular purpose.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Limitation of Liability</h2>
          <p>
            In no event shall MeritView, its affiliates, or its service providers be liable for any damages arising from your use of the Service, including but not limited to direct, indirect, incidental, punitive, or consequential damages. This limitation applies even if MeritView has been advised of the possibility of such damages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Third-Party AI Providers</h2>
          <p>
            MeritView uses third-party AI services (Groq, Google) to generate analysis. We do not control the outputs of these services and are not responsible for their accuracy, reliability, or compliance with applicable laws. These providers have their own terms of service and privacy policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Jurisdictional Restrictions</h2>
          <p>
            MeritView may not be available in all jurisdictions. We reserve the right to restrict access in jurisdictions where AI-based decision support tools are prohibited or restricted by law. You are responsible for ensuring your use of MeritView complies with local laws.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. No Endorsement</h2>
          <p>
            References to third-party services, AI models, or legal concepts do not constitute endorsements. All trademarks and service marks are the property of their respective owners.
          </p>
        </section>

        <section className="p-4 border border-border rounded-lg bg-card">
          <p className="text-xs leading-relaxed">
            <strong>By using MeritView, you acknowledge that you have read, understood, and agree to these disclaimers. If you do not agree, do not use the Service.</strong>
          </p>
        </section>
      </div>
    </div>
  );
}
