import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateBadge } from '@/components/StateBadge';

describe('StateBadge', () => {
  it('renders DRAFT state', () => {
    render(<StateBadge state="DRAFT" />);
    expect(screen.getByText('DRAFT')).toBeTruthy();
  });

  it('renders COMPLETED state', () => {
    render(<StateBadge state="COMPLETED" />);
    expect(screen.getByText('COMPLETED')).toBeTruthy();
  });

  it('renders UNDER_ANALYSIS state', () => {
    render(<StateBadge state="UNDER_ANALYSIS" />);
    expect(screen.getByText('UNDER ANALYSIS')).toBeTruthy();
  });

  it('renders WITHDRAWN state', () => {
    render(<StateBadge state="WITHDRAWN" />);
    expect(screen.getByText('WITHDRAWN')).toBeTruthy();
  });

  it('renders AWAITING_BRIEFS state', () => {
    render(<StateBadge state="AWAITING_BRIEFS" />);
    expect(screen.getByText('AWAITING BRIEFS')).toBeTruthy();
  });

  it('renders payment states', () => {
    render(<StateBadge state="PAYMENT_PENDING" />);
    expect(screen.getByText('PAYMENT PENDING')).toBeTruthy();
  });

  it('renders brief states', () => {
    render(<StateBadge state="BRIEF_SEALED" />);
    expect(screen.getByText('BRIEF SEALED')).toBeTruthy();
  });
});
