export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: July 2026</p>
      <div className="prose prose-gray max-w-none space-y-6">
        <h2>1. Service Description</h2>
        <p>MeritView provides AI-generated decision support for contract dispute analysis. Our platform uses multiple AI models to evaluate user-submitted briefs and generate opinions. MeritView is NOT a law firm and does not provide legal advice.</p>

        <h2>2. User Obligations</h2>
        <p>Users must provide accurate information, maintain confidentiality of their account credentials, and not use the service for illegal purposes. Users are responsible for the content of their submitted briefs.</p>

        <h2>3. Payment Terms</h2>
        <p>Services are priced as listed at the time of purchase. All payments are processed securely through Stripe. Refunds are available only as specified in our refund policy.</p>

        <h2>4. Disclaimer of Legal Advice</h2>
        <p>MeritView does not provide legal advice. Our AI-generated opinions are for informational and educational purposes only. Users should consult a qualified attorney for legal advice. No attorney-client relationship is created through use of the service.</p>

        <h2>5. Limitation of Liability</h2>
        <p>MeritView provides its services "as is" without warranties of any kind. We are not liable for any damages arising from use of the service, including but not limited to reliance on AI-generated opinions.</p>

        <h2>6. Privacy</h2>
        <p>User data is handled as described in our Privacy Policy. Brief content is encrypted at rest and only decrypted during evaluation.</p>

        <h2>7. Termination</h2>
        <p>Users may delete their account at any time. We may suspend or terminate accounts for violation of these terms.</p>

        <h2>8. Governing Law</h2>
        <p>These terms are governed by applicable local laws. Any disputes shall be resolved through binding arbitration.</p>

        <h2>9. Contact</h2>
        <p>For questions about these terms, contact support@meritview.ai.</p>
      </div>
    </div>
  );
}
