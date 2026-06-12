import { createContext, useContext, type ReactNode } from 'react';
import { useSpotifyAuth } from './hooks/useSpotifyAuth';

type AuthContextValue = ReturnType<typeof useSpotifyAuth>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSpotifyAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> stehen.');
  return ctx;
}

export function isPremium(product: string | undefined): boolean {
  return product === 'premium';
}
