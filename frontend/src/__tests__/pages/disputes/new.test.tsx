import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn(),
  apiClient: { request: vi.fn() },
}));

import NewDisputePage from '@/app/(dashboard)/disputes/new/page';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><NewDisputePage /></QueryClientProvider>);
}

describe('New Dispute Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T2.2.3.14: renders the form with all inputs', () => {
    renderPage();

    expect(screen.getByText('Create New Dispute')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /title/i })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /summary/i })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: /stakes/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /create dispute/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
  });

  it('T2.2.3.16: validation errors displayed inline', async () => {
    renderPage();

    fireEvent.keyDown(document.querySelector('form')!, { key: 'Enter' });

    expect(await screen.findByText(/Title must be at least 5 characters/i)).toBeTruthy();
  });

  it('shows character counter for title', () => {
    renderPage();
    expect(screen.getByText(/0\/200/)).toBeTruthy();
  });

  it('shows character counter for summary', () => {
    renderPage();
    expect(screen.getByText(/0\/500/)).toBeTruthy();
  });

  it('Cancel button navigates back', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockBack).toHaveBeenCalled();
  });
});
