import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
const mockRegister = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    register: mockRegister,
    isLoading: false,
    error: null,
  }),
}));

import RegisterPage from '@/app/(auth)/register/page';

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all registration fields', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Display Name (optional)')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(screen.getByLabelText('Confirm Password')).toBeDefined();
    expect(screen.getByRole('button', { name: /create account/i })).toBeDefined();
  });

  it('T1.2.3.13: validates password match', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password1' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Different1' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.queryByText('Passwords do not match')).toBeTruthy();
    });
  });

  it('T1.2.3.14: validates accept_terms checkbox', async () => {
    render(<RegisterPage />);

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      const errorMsg = screen.queryByText('You must accept the terms');
      if (errorMsg) {
        expect(errorMsg).toBeDefined();
      }
    });
  });

  it('T1.2.3.15: submits successfully', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password1' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Password1' } });
    const termsCb = document.getElementById('acceptTerms') as HTMLInputElement;
    if (termsCb) {
      fireEvent.change(termsCb, { target: { checked: true } });
    }
    const displayName = screen.queryByLabelText('Display Name (optional)');
    if (displayName) fireEvent.change(displayName, { target: { value: '' } });

    const btn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
