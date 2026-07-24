import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

let LandingPage: any;

describe('LandingPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    LandingPage = (await import('@/app/page')).default;
  });

  it('renders the hero section', () => {
    render(<LandingPage />);
    expect(screen.getByText('AI Decision Support for')).toBeInTheDocument();
    expect(screen.getByText('Contract Disputes')).toBeInTheDocument();
  });

  it('renders the value proposition', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Get structured, impartial analysis/)).toBeInTheDocument();
  });

  it('renders the call-to-action buttons', () => {
    render(<LandingPage />);
    expect(screen.getByText('Start Your Analysis')).toBeInTheDocument();
    expect(screen.getAllByText('How It Works').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the how-it-works section with 3 steps', () => {
    render(<LandingPage />);
    expect(screen.getByText('1. Describe Your Dispute')).toBeInTheDocument();
    expect(screen.getByText('2. Multi-Model AI Analysis')).toBeInTheDocument();
    expect(screen.getByText('3. Receive Structured Opinion')).toBeInTheDocument();
  });

  it('renders the Why Choose section', () => {
    render(<LandingPage />);
    expect(screen.getByText('Why Choose MeritView?')).toBeInTheDocument();
    expect(screen.getByText('Impartial Analysis')).toBeInTheDocument();
    expect(screen.getByText('Flat $49 Fee')).toBeInTheDocument();
    expect(screen.getByText('Decision Support')).toBeInTheDocument();
  });

  it('renders the CTA section', () => {
    render(<LandingPage />);
    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
    expect(screen.getByText('Create Free Account →')).toBeInTheDocument();
  });

  it('renders the footer with legal links', () => {
    render(<LandingPage />);
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Disclaimers')).toBeInTheDocument();
  });

  it('renders the header with sign-in link', () => {
    render(<LandingPage />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });
});
