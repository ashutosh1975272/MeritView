import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({}),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn(),
  apiClient: {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
  },
}));

let mockQueryImpl: any;

vi.mock('@tanstack/react-query', () => {
  const mockSetQueryData = vi.fn();
  return {
    useQuery: (...args: any[]) => mockQueryImpl?.(...args) ?? { data: null, isLoading: false, isError: false, error: null, refetch: vi.fn() },
    useMutation: (...args: any[]) => ({ mutate: vi.fn(), isPending: false }),
    useQueryClient: () => ({ setQueryData: mockSetQueryData, invalidateQueries: vi.fn() }),
  };
});

import DisputesPage from '@/app/(dashboard)/disputes/page';

describe('DisputeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T2.2.3.9: fetches and displays disputes', async () => {
    mockQueryImpl = () => ({
      data: [
        { id: 'd1', title: 'First Dispute', category: 'CONTRACT_INTERPRETATION', state: 'DRAFT', priceUsd: 49, createdAt: new Date().toISOString() },
        { id: 'd2', title: 'Second Dispute', category: 'SMALL_CLAIMS_ASSESSMENT', state: 'COMPLETED', priceUsd: 49, createdAt: new Date().toISOString() },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DisputesPage />);

    expect(screen.getByText('First Dispute')).toBeTruthy();
    expect(screen.getByText('Second Dispute')).toBeTruthy();
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('T2.2.3.10: shows loading skeleton while fetching', () => {
    mockQueryImpl = () => ({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<DisputesPage />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('T2.2.3.11: shows empty state when no disputes', () => {
    mockQueryImpl = () => ({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DisputesPage />);
    expect(screen.getByText(/no disputes yet/i)).toBeTruthy();
    const createBtn = screen.getAllByText(/Create Your First Dispute/i);
    expect(createBtn.length).toBeGreaterThanOrEqual(1);
  });

  it('T2.2.3.12: handles API error gracefully', () => {
    const mockRefetch = vi.fn();
    mockQueryImpl = () => ({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('API Error'),
      refetch: mockRefetch,
    });

    render(<DisputesPage />);
    expect(screen.getByText(/failed to load disputes/i)).toBeTruthy();

    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalled();
  });
});
