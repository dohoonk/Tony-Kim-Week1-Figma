import { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthState } from '../hooks/useAuth';

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
