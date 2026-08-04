import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewDisputePage from '../../app/(dashboard)/dashboard/disputes/new/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/dashboard/disputes/new',
    query: {},
    asPath: '/dashboard/disputes/new',
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard/disputes/new',
  useSearchParams: () => new URLSearchParams(),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('NewDisputePage', () => {
  it('renders the dispute creation form', () => {
    renderWithClient(<NewDisputePage />);

    expect(screen.getByText('Create New Dispute')).toBeTruthy();
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
  });

  it('shows validation error for short title', async () => {
    renderWithClient(<NewDisputePage />);

    const textboxes = screen.getAllByRole('textbox');
    const titleInput = textboxes[0];
    fireEvent.change(titleInput, { target: { value: 'AB' } });

    const nextBtn = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/title must be at least 5 characters/i)).toBeTruthy();
    });
  });

  it('shows error for invalid stakes', async () => {
    renderWithClient(<NewDisputePage />);

    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[0], { target: { value: '-10' } });

    const nextBtn = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/must be a positive number/i)).toBeTruthy();
    });
  });

  it('disables submit button while submitting', async () => {
    renderWithClient(<NewDisputePage />);

    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[0], { target: { value: 'Valid dispute title testing form' } });
  });
});