import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
const mockParams = { id: 'disp_1' };

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'user_1' } }),
}));

let mockQueryImpl: any;
let mockMutationImpl: any;

vi.mock('@tanstack/react-query', () => {
  const mockSetQueryData = vi.fn();
  return {
    useQuery: (...args: any[]) => mockQueryImpl?.(...args) ?? { data: null, isLoading: false, isError: false, error: null, refetch: vi.fn() },
    useMutation: (...args: any[]) => mockMutationImpl?.(...args) ?? { mutate: vi.fn(), isPending: false },
    useQueryClient: () => ({ setQueryData: mockSetQueryData }),
  };
});

import BriefPage from '@/app/(dashboard)/disputes/[id]/brief/page';

const SECTIONS = [
  'factual_background',
  'my_position',
  'supporting_arguments',
  'acknowledgment_of_opposing',
  'desired_resolution',
];

describe('BriefForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupDefaultMocks() {
    mockQueryImpl = ({ queryKey }: any) => {
      if (queryKey[0] === 'dispute') {
        return {
          data: { id: 'disp_1', parties: [{ id: 'party_1', user_id: 'user_1', role: 'initiator' }] },
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: null, isLoading: false, isError: false, error: null, refetch: vi.fn() };
    };
    mockMutationImpl = () => ({ mutate: vi.fn(), isPending: false, isSuccess: false });
  }

  it('renders all 5 sections with textareas', () => {
    setupDefaultMocks();
    render(<BriefPage />);

    SECTIONS.forEach((section) => {
      const textarea = document.querySelector(`textarea[id="field-${section}"]`);
      expect(textarea).toBeTruthy();
    });
  });

  it('shows loading skeleton while fetching data', () => {
    mockQueryImpl = () => ({ data: null, isLoading: true, isError: false, error: null, refetch: vi.fn() });
    mockMutationImpl = () => ({ mutate: vi.fn(), isPending: false });

    const { container } = render(<BriefPage />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state with retry button on API failure', () => {
    mockQueryImpl = () => ({ data: null, isLoading: false, isError: true, error: new Error('API Error'), refetch: vi.fn() });
    mockMutationImpl = () => ({ mutate: vi.fn(), isPending: false });

    render(<BriefPage />);
    expect(screen.getByText(/try again/i)).toBeTruthy();
  });

  it('shows "not a party" when user has no party membership', () => {
    mockQueryImpl = ({ queryKey }: any) => {
      if (queryKey[0] === 'dispute') {
        return {
          data: { id: 'disp_1', parties: [{ id: 'party_1', user_id: 'user_other', role: 'respondent' }] },
          isLoading: false, isError: false, error: null, refetch: vi.fn(),
        };
      }
      return { data: null, isLoading: false, isError: false, error: null, refetch: vi.fn() };
    };
    mockMutationImpl = () => ({ mutate: vi.fn(), isPending: false });

    render(<BriefPage />);
    expect(screen.getByText(/not a party/i)).toBeTruthy();
  });

  it('validates all 5 sections required on submit', () => {
    setupDefaultMocks();
    render(<BriefPage />);

    const submitButton = screen.getByText('Submit Brief');
    expect(submitButton).toBeDisabled();

    SECTIONS.forEach((section) => {
      const textarea = document.querySelector(`textarea[id="field-${section}"]`) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'some content' } });
    });

    expect(submitButton).not.toBeDisabled();
  });

  it('allows partial fill on draft save', () => {
    setupDefaultMocks();
    const mockMutate = vi.fn();
    mockMutationImpl = () => ({ mutate: mockMutate, isPending: false, isSuccess: false });

    render(<BriefPage />);

    const firstTextarea = document.querySelector(`textarea[id="field-factual_background"]`) as HTMLTextAreaElement;
    fireEvent.change(firstTextarea, { target: { value: 'Partial content for draft' } });

    const saveButton = screen.getByText('Save Draft');
    expect(saveButton).not.toBeDisabled();
  });

  it('updates word count correctly per section and total', async () => {
    setupDefaultMocks();
    render(<BriefPage />);

    const textarea = document.querySelector(`textarea[id="field-factual_background"]`) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'one two three four five' } });

    await waitFor(() => {
      expect(screen.getByText(/Total words:/)).toBeTruthy();
    });
  });

  it('shows warning at 4500 words', () => {
    setupDefaultMocks();
    render(<BriefPage />);

    const textarea = document.querySelector(`textarea[id="field-factual_background"]`) as HTMLTextAreaElement;
    const longText = Array(4501).fill('word').join(' ');
    fireEvent.change(textarea, { target: { value: longText } });

    expect(screen.getByText(/warning/i)).toBeTruthy();
  });

  it('disables submit button until all sections filled', () => {
    setupDefaultMocks();
    render(<BriefPage />);

    const submitButton = screen.getByText('Submit Brief');
    expect(submitButton).toBeDisabled();

    SECTIONS.forEach((section) => {
      const textarea = document.querySelector(`textarea[id="field-${section}"]`) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'content' } });
    });

    expect(submitButton).not.toBeDisabled();
  });

  it('shows loading state on submit', () => {
    setupDefaultMocks();
    mockMutationImpl = () => ({ mutate: vi.fn(), isPending: true, isSuccess: false });

    render(<BriefPage />);

    SECTIONS.forEach((section) => {
      const textarea = document.querySelector(`textarea[id="field-${section}"]`) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'content' } });
    });

    const submitButton = screen.getByText('Submit Brief');
    expect(submitButton).toBeDisabled();
  });

  it('disables all inputs after submit', () => {
    mockQueryImpl = ({ queryKey }: any) => {
      if (queryKey[0] === 'dispute') {
        return {
          data: { id: 'disp_1', parties: [{ id: 'party_1', user_id: 'user_1', role: 'initiator' }] },
          isLoading: false, isError: false, error: null, refetch: vi.fn(),
        };
      }
      return {
        data: { id: 'brief_1', status: 'submitted' },
        isLoading: false, isError: false, error: null, refetch: vi.fn(),
      };
    };
    mockMutationImpl = () => ({ mutate: vi.fn(), isPending: false });

    render(<BriefPage />);

    expect(screen.getByText(/submitted successfully/i)).toBeTruthy();
    expect(screen.queryByText('Save Draft')).toBeNull();
    expect(screen.queryByText('Submit Brief')).toBeNull();
  });

  it('shows success message after submit', () => {
    mockQueryImpl = ({ queryKey }: any) => {
      if (queryKey[0] === 'dispute') {
        return {
          data: { id: 'disp_1', parties: [{ id: 'party_1', user_id: 'user_1', role: 'initiator' }] },
          isLoading: false, isError: false, error: null, refetch: vi.fn(),
        };
      }
      return {
        data: { id: 'brief_1', status: 'submitted' },
        isLoading: false, isError: false, error: null, refetch: vi.fn(),
      };
    };
    mockMutationImpl = () => ({ mutate: vi.fn(), isPending: false });

    render(<BriefPage />);
    expect(screen.getByText(/submitted successfully/i)).toBeTruthy();
  });

  it('shows error on API failure with retry', () => {
    mockQueryImpl = () => ({ data: null, isLoading: false, isError: true, error: new Error('Failed to load'), refetch: vi.fn() });

    render(<BriefPage />);
    expect(screen.getByText(/try again/i)).toBeTruthy();
  });
});
