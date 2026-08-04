import { describe, it, expect } from 'vitest';
import { useAuthStore } from '@/stores/useAuthStore';

describe('useAuthStore', () => {
  it('initializes with null user and tokens', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('sets user and tokens on login via setTokens/setUser', () => {
    const store = useAuthStore.getState();
    store.setUser({ id: 'user_1', email: 'test@example.com', emailVerified: true, role: 'STANDARD' });
    store.setTokens('acc_1', 'ref_1');

    const state = useAuthStore.getState();
    expect(state.user?.email).toBe('test@example.com');
    expect(state.accessToken).toBe('acc_1');
    expect(state.refreshToken).toBe('ref_1');
  });

  it('clears user on logout', () => {
    useAuthStore.getState().setUser({ id: 'user_1', email: 'test@example.com', emailVerified: true, role: 'STANDARD' });
    useAuthStore.getState().setTokens('acc_1', 'ref_1');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
