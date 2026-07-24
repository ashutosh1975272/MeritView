export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: July 2026</p>
      <div className="prose prose-gray max-w-none space-y-6">
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using MeritView ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. We may update these terms at any time; continued use after changes constitutes acceptance.</p>

        <h2>2. Service Description</h2>
        <p>MeritView provides AI-generated decision support for contract dispute analysis. Our platform uses multiple AI models to evaluate user-submitted briefs and generate structured opinions. MeritView is NOT a law firm, does not provide legal advice, and no attorney-client relationship is created through use of the Service. The opinions generated are for informational and educational purposes only.</p>

        <h2>3. Eligibility</h2>
        <p>You must be at least 18 years old to use the Service. By registering, you represent that you have the legal capacity to enter into binding agreements. If you are accepting these terms on behalf of an entity, you represent that you have authority to bind that entity.</p>

        <h2>4. Account Registration and Security</h2>
        <p>You must provide accurate and complete registration information. You are solely responsible for maintaining the confidentiality of your password and account credentials. You must notify us immediately of any unauthorized use. We are not liable for any loss or damage arising from your failure to protect your account.</p>

        <h2>5. User Obligations</h2>
        <p>You agree to: (a) provide accurate information in your briefs and account details; (b) not use the Service for any illegal purpose or in violation of any laws; (c) not submit false, misleading, or defamatory content; (d) not attempt to manipulate, reverse-engineer, or abuse the AI evaluation system; (e) not upload malware or attempt to disrupt the Service; (f) not use automated scripts or bots without written permission.</p>

        <h2>6. Brief Content</h2>
        <p>You retain all ownership rights to the content you submit. You grant MeritView a limited license to process, analyze, and store your brief content solely for the purpose of providing the Service. Brief content is encrypted at rest. We do not use your content to train AI models. You represent that your brief content does not infringe any third-party rights.</p>

        <h2>7. Payment Terms</h2>
        <p>Services are priced as listed at the time of purchase, denominated in USD. All payments are processed securely through Stripe. Payment is due at the time of service initiation. Prices are subject to change with 30 days notice. Refunds are available only as specified in our refund policy posted on our website. We reserve the right to cancel and refund services at our discretion.</p>

        <h2>8. Refund Policy</h2>
        <p>Refund requests for services not yet rendered will be honored in full. Once AI analysis has commenced, refunds are provided on a prorated basis at our discretion. Refunds for completed analyses are not available due to the consumable nature of the service. All refunds are processed to the original payment method within 10 business days.</p>

        <h2>9. Disclaimer of Legal Advice</h2>
        <p>MeritView does not provide legal advice. Our AI-generated opinions are for informational and educational purposes only. They do not constitute legal advice, legal opinion, or a binding judgment. Users should consult a qualified attorney licensed in their jurisdiction for legal advice specific to their situation. No attorney-client relationship, fiduciary duty, or confidential relationship is created through use of the Service. Do not make legal decisions based solely on AI-generated analysis.</p>

        <h2>10. Intellectual Property</h2>
        <p>The MeritView name, logo, platform, and technology are proprietary. Users may not copy, modify, distribute, sell, or lease any part of the Service without written permission. The AI models, evaluation methodology, aggregation algorithms, and prompt systems are trade secrets and confidential information of MeritView.</p>

        <h2>11. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, MeritView provides its services "as is" without warranties of any kind, express or implied. We disclaim all warranties of merchantability, fitness for a particular purpose, and non-infringement. We are not liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from use of the Service, including but not limited to reliance on AI-generated opinions, loss of data, or business interruption. Our total liability shall not exceed the total amount paid by you for the specific service giving rise to the claim.</p>

        <h2>12. Indemnification</h2>
        <p>You agree to indemnify and hold MeritView harmless from any claims, damages, losses, and expenses (including reasonable legal fees) arising from: (a) your use of the Service; (b) your violation of these terms; (c) your violation of any third-party rights; (d) your brief content or any dispute related thereto.</p>

        <h2>13. Termination</h2>
        <p>Users may delete their account at any time through account settings. Upon deletion, your personal data will be anonymized within 30 days. Brief content is retained per our retention policy and then permanently deleted. We may suspend or terminate accounts for violation of these terms, with notice where practical. Upon termination, your right to use the Service ceases immediately.</p>

        <h2>14. Data Handling and Privacy</h2>
        <p>User data is handled as described in our Privacy Policy. Brief content is encrypted at rest using AES-256-GCM and only decrypted in memory during evaluation. We employ industry-standard security measures including encryption in transit, access controls, and regular security audits.</p>

        <h2>15. Service Availability</h2>
        <p>We strive for 99.9% uptime but do not guarantee uninterrupted availability. We reserve the right to perform maintenance, updates, and upgrades with reasonable notice. We are not liable for any losses resulting from service interruptions. In the event of prolonged downtime, affected users may receive service credits at our discretion.</p>

        <h2>16. Modification of Service</h2>
        <p>We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time. We will provide reasonable notice for material changes that affect existing users. We are not liable for any modification, suspension, or discontinuation of the Service.</p>

        <h2>17. Governing Law and Dispute Resolution</h2>
        <p>These terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Any disputes arising from these terms or the Service shall be resolved through binding arbitration in accordance with the American Arbitration Association rules. The arbitration shall be conducted in Wilmington, Delaware. Each party shall bear its own costs. Nothing in this section prevents either party from seeking injunctive relief in any court of competent jurisdiction.</p>

        <h2>18. Class Action Waiver</h2>
        <p>All disputes must be brought on an individual basis. You waive any right to participate in any class action, consolidated action, or representative proceeding against MeritView.</p>

        <h2>19. Severability</h2>
        <p>If any provision of these terms is found to be unenforceable or invalid, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it enforceable.</p>

        <h2>20. Entire Agreement</h2>
        <p>These terms, together with the Privacy Policy and Disclaimer, constitute the entire agreement between you and MeritView regarding the Service, superseding any prior agreements or understandings.</p>

        <h2>21. Contact</h2>
        <p>For questions about these terms, contact us at legal@meritview.ai or write to: MeritView Legal, 100 Innovation Drive, Suite 300, Wilmington, DE 19801.</p>
      </div>
    </div>
  );
}
