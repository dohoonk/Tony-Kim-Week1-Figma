import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AuthState } from '../hooks/useAuth';

const UserContext = createContext<AuthState | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const authState = useAuth();
  return <UserContext.Provider value={authState}>{children}</UserContext.Provider>;
}

export function useUser(): AuthState {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
