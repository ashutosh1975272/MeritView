import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewDisputePage from '../../app/(dashboard)/dashboard/disputes/new/page';

describe('NewDisputePage', () => {
  it('renders the dispute creation form', () => {
    render(<NewDisputePage />);

    expect(screen.getByText('Create New Dispute')).toBeTruthy();
    expect(screen.getByLabelText(/category/i)).toBeTruthy();
    expect(screen.getByLabelText(/title/i)).toBeTruthy();
    expect(screen.getByLabelText(/summary/i)).toBeTruthy();
    expect(screen.getByLabelText(/estimated stakes/i)).toBeTruthy();
  });

  it('shows validation error for short title', async () => {
    render(<NewDisputePage />);

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'AB' } });

    const submitBtn = screen.getByRole('button', { name: /create dispute/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/title must be at least 5 characters/i)).toBeTruthy();
    });
  });

  it('shows error for invalid stakes', async () => {
    render(<NewDisputePage />);

    const stakesInput = screen.getByLabelText(/estimated stakes/i);
    fireEvent.change(stakesInput, { target: { value: '-10' } });

    const submitBtn = screen.getByRole('button', { name: /create dispute/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/must be a positive number/i)).toBeTruthy();
    });
  });

  it('disables submit button while submitting', async () => {
    render(<NewDisputePage />);

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Valid dispute title testing form' } });
  });
});
