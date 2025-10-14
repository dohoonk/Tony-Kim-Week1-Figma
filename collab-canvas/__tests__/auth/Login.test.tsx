import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Login from '../../src/components/Auth/Login';

// Hoist a shared mock so the ESM mock can reference it
const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }));

vi.mock('../../src/context/UserContext', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    useUser: () => ({ loading: false, user: null, signInWithGoogle: signInMock, signOutUser: vi.fn() }),
  };
});

describe('Login', () => {
  it('calls signInWithGoogle on click', () => {
    render(<Login />);
    const btn = screen.getByRole('button', { name: /sign in with google/i });
    fireEvent.click(btn);
    expect(signInMock).toHaveBeenCalledTimes(1);
  });
});
