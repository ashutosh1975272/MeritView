export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: July 2026</p>
      <div className="prose prose-gray max-w-none space-y-6">
        <h2>1. Information We Collect</h2>
        <p>We collect account information (email, display name), dispute information (brief content, case details), and usage data (page views, feature interactions). We do not sell your personal information.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to provide and improve our services, process payments, send service-related communications, and comply with legal obligations. Brief content is used only for evaluation purposes.</p>

        <h2>3. Data Storage and Security</h2>
        <p>All brief content is encrypted using AES-256-GCM before storage. Database connections are encrypted. We enforce strict access controls and regular security audits.</p>

        <h2>4. Data Sharing</h2>
        <p>We share your brief content with our AI providers (Groq, Google) solely for evaluation purposes. These providers have contractual guarantees not to use your data for training. We do not share your personal information with third parties for marketing.</p>

        <h2>5. Data Retention</h2>
        <p>Account data is retained until account deletion. Brief content is retained for the duration of the dispute plus a retention period, after which it is permanently deleted. You can request data deletion at any time.</p>

        <h2>6. Your Rights</h2>
        <p>You have the right to access, correct, delete, and export your data. You can manage your account settings or contact support@meritview.ai to exercise these rights.</p>

        <h2>7. Cookies</h2>
        <p>We use essential cookies for authentication and security. We do not use tracking cookies or third-party analytics.</p>

        <h2>8. Contact</h2>
        <p>For privacy-related inquiries, contact support@meritview.ai.</p>
      </div>
    </div>
  );
}
