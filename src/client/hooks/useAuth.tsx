import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../../shared/types.js';
import { adminApi } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await adminApi.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
        localStorage.removeItem('auth_token');
      }
    } catch {
      setUser(null);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (u: string, p: string): Promise<User> => {
    const res = await adminApi.login(u, p);
    if (res.token) {
      localStorage.setItem('auth_token', res.token);
    }
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // Ignorar error al cerrar sesión
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
