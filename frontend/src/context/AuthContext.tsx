import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export type UserRole = 'ADMIN' | 'REVIEWER' | 'DATA_ENTRY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('attribute3_token');
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('attribute3_token');
          }
        } catch {
          localStorage.removeItem('attribute3_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (res.success && res.token) {
      localStorage.setItem('attribute3_token', res.token);
      setUser(res.user);
    }
  };

  const quickLogin = async (role: UserRole) => {
    let email = 'entry@institution.edu';
    let password = 'Entry@123';

    if (role === 'REVIEWER') {
      email = 'reviewer@institution.edu';
      password = 'Reviewer@123';
    } else if (role === 'ADMIN') {
      email = 'admin@institution.edu';
      password = 'Admin@123';
    }

    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('attribute3_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, quickLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
