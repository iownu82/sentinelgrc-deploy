import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getCurrentSession, signOut as cognitoSignOut } from '../lib/cognito';

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  email: string | null;
  sub: string | null;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface IdTokenPayload {
  email?: string;
  sub?: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const session = await getCurrentSession();
    if (session) {
      const payload = session.getIdToken().payload as IdTokenPayload;
      setIsAuthenticated(true);
      setEmail(payload.email ?? null);
      setSub(payload.sub ?? null);
    } else {
      setIsAuthenticated(false);
      setEmail(null);
      setSub(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(() => {
    cognitoSignOut();
    setIsAuthenticated(false);
    setEmail(null);
    setSub(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ isAuthenticated, loading, email, sub, signOut, refresh }),
    [isAuthenticated, loading, email, sub, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
