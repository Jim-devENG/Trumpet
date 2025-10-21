import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiService } from '@/services/api';

type AuthUser = any | null;

interface AuthContextValue {
  user: AuthUser;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMe = useCallback(async () => {
    try {
      console.log('AuthContext: fetchMe called, getting current user...');
      const res = await apiService.getCurrentUser();
      console.log('AuthContext: getCurrentUser response:', res);
      if ((res as any).success) {
        console.log('AuthContext: Setting user:', (res as any).data.user);
        setUser((res as any).data.user);
      } else {
        console.log('AuthContext: No user data, setting user to null');
        setUser(null);
      }
    } catch (error) {
      console.log('AuthContext: Error getting user, setting to null:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    const onAuthChanged = () => {
      console.log('AuthContext: Received trumpet:auth-changed event');
      setLoading(true);
      fetchMe();
    };
    window.addEventListener('trumpet:auth-changed', onAuthChanged as any);
    return () => window.removeEventListener('trumpet:auth-changed', onAuthChanged as any);
  }, [fetchMe]);

  const logout = useCallback(() => {
    apiService.clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, loading, refresh: fetchMe, logout }), [user, loading, fetchMe, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


