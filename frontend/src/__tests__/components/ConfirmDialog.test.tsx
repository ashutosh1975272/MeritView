import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders with title and message', () => {
    render(
      <ConfirmDialog
        open
        title="Delete Dispute"
        message="Are you sure?"
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Delete Dispute')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Confirm"
        message="Proceed?"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onClose when cancel button clicked', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Confirm"
        message="Proceed?"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('hides when open is false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Hidden"
        message="Should not appear"
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('presses Escape to close', () => {
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Escape test"
        message="Press escape"
        onClose={onClose}
        onConfirm={() => {}}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
