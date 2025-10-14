import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../../src/hooks/useAuth';

const mockOnAuthStateChanged = vi.fn();
const mockSignInWithPopup = vi.fn().mockResolvedValue(undefined);
const mockSignOut = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth: unknown, cb: (u: any) => void) => mockOnAuthStateChanged(cb),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
}));

vi.mock('../../src/utils/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

describe('useAuth', () => {
  beforeEach(() => {
    mockOnAuthStateChanged.mockReset();
    mockSignInWithPopup.mockClear();
    mockSignOut.mockClear();
  });

  it('exposes signIn/signOut and updates user via onAuthStateChanged', async () => {
    let capturedCb: (u: any) => void = () => {};
    mockOnAuthStateChanged.mockImplementation((cb: (u: any) => void) => {
      capturedCb = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    // Simulate auth state update
    act(() => {
      capturedCb({ uid: '123', displayName: 'Tester' });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user?.uid).toBe('123');

    await act(async () => {
      await result.current.signInWithGoogle();
    });
    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.signOutUser();
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
