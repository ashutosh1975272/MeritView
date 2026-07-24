import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn(),
  apiClient: { request: vi.fn() },
}));

import NewDisputePage from '@/app/(dashboard)/disputes/new/page';
import { apiRequest } from '@/lib/api-client';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><NewDisputePage /></QueryClientProvider>);
}

describe('DisputeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T2.2.3.2: validates title length - too short shows error', async () => {
    renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: /title/i }), { target: { value: 'AB' } });
    fireEvent.keyDown(document.querySelector('form')!, { key: 'Enter' });
    expect(await screen.findByText(/Title must be at least 5 characters/i)).toBeTruthy();
  });

  it('T2.2.3.3: validates summary max length', async () => {
    renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: /summary/i }), { target: { value: 'A'.repeat(501) } });
    fireEvent.keyDown(document.querySelector('form')!, { key: 'Enter' });
    expect(await screen.findByText(/500 characters or less/i)).toBeTruthy();
  });

  it('T2.2.3.4: validates stakes must be positive', async () => {
    renderPage();
    fireEvent.change(screen.getByRole('spinbutton', { name: /stakes/i }), { target: { value: '-10' } });
    fireEvent.keyDown(document.querySelector('form')!, { key: 'Enter' });
    expect(await screen.findByText(/positive number/i)).toBeTruthy();
  });

  it('T2.2.3.5: submit button exists and form renders', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create dispute/i })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /title/i })).toBeTruthy();
  });
});
