import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('Marketing Pages', () => {
  describe('Terms Page', () => {
    it('renders the terms of service page', async () => {
      const TermsPage = (await import('@/app/(marketing)/terms/page')).default;
      render(<TermsPage />);
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Last updated: July 2026')).toBeInTheDocument();
    });

    it('displays service description section', async () => {
      const TermsPage = (await import('@/app/(marketing)/terms/page')).default;
      render(<TermsPage />);
      expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
      expect(screen.getByText('2. Service Description')).toBeInTheDocument();
    });

    it('displays legal disclaimer section', async () => {
      const TermsPage = (await import('@/app/(marketing)/terms/page')).default;
      render(<TermsPage />);
      expect(screen.getByText('9. Disclaimer of Legal Advice')).toBeInTheDocument();
    });

    it('renders all major sections', async () => {
      const TermsPage = (await import('@/app/(marketing)/terms/page')).default;
      render(<TermsPage />);
      const headings = [
        '3. Eligibility',
        '4. Account Registration and Security',
        '5. User Obligations',
        '6. Brief Content',
        '7. Payment Terms',
        '8. Refund Policy',
        '10. Intellectual Property',
        '11. Limitation of Liability',
        '12. Indemnification',
        '13. Termination',
        '17. Governing Law and Dispute Resolution',
        '21. Contact',
      ];
      headings.forEach(h => expect(screen.getByText(h)).toBeInTheDocument());
    });
  });

  describe('Privacy Page', () => {
    it('renders the privacy policy page', async () => {
      const PrivacyPage = (await import('@/app/(marketing)/privacy/page')).default;
      render(<PrivacyPage />);
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Last updated: July 2026')).toBeInTheDocument();
    });

    it('displays information collection details', async () => {
      const PrivacyPage = (await import('@/app/(marketing)/privacy/page')).default;
      render(<PrivacyPage />);
      expect(screen.getByText('2. Information We Collect')).toBeInTheDocument();
      expect(screen.getByText(/Account Information/)).toBeInTheDocument();
    });

    it('displays data sharing section', async () => {
      const PrivacyPage = (await import('@/app/(marketing)/privacy/page')).default;
      render(<PrivacyPage />);
      expect(screen.getByText('6. Data Sharing and Third-Party Processors')).toBeInTheDocument();
    });

    it('displays your rights section', async () => {
      const PrivacyPage = (await import('@/app/(marketing)/privacy/page')).default;
      render(<PrivacyPage />);
      expect(screen.getByText('8. Your Rights and Choices')).toBeInTheDocument();
    });

    it('displays contact information', async () => {
      const PrivacyPage = (await import('@/app/(marketing)/privacy/page')).default;
      render(<PrivacyPage />);
      expect(screen.getByText('14. Contact and Data Controller')).toBeInTheDocument();
    });
  });

  describe('Disclaimer Page', () => {
    it('renders the disclaimer page', async () => {
      const DisclaimerPage = (await import('@/app/(marketing)/disclaimer/page')).default;
      render(<DisclaimerPage />);
      expect(screen.getByText('Legal Disclaimer')).toBeInTheDocument();
      expect(screen.getByText('Last updated: July 2026')).toBeInTheDocument();
    });

    it('displays important notice banner', async () => {
      const DisclaimerPage = (await import('@/app/(marketing)/disclaimer/page')).default;
      render(<DisclaimerPage />);
      expect(screen.getByText('Important Notice')).toBeInTheDocument();
    });

    it('renders all disclaimer sections', async () => {
      const DisclaimerPage = (await import('@/app/(marketing)/disclaimer/page')).default;
      render(<DisclaimerPage />);
      const headings = [
        '1. No Attorney-Client Relationship',
        '2. Not a Substitute for Professional Legal Advice',
        '3. No Guarantee of Accuracy or Completeness',
        '4. No Guarantee of Outcomes',
        '5. For Informational and Educational Purposes Only',
        '6. Not a Binding Judgment or Arbitration Award',
        '7. Jurisdictional Limitations',
        '8. No Warranties',
        '9. Limitation of Liability',
        '13. Contact',
      ];
      headings.forEach(h => expect(screen.getByText(h)).toBeInTheDocument());
    });
  });
});
