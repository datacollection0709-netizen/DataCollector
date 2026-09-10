import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export type UserRole = 'ADMIN' | 'REVIEWER' | 'DATA_ENTRY';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (name: string, department: string) => Promise<void>;
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

  const login = async (name: string, department: string) => {
    const res = await api.login(name, department);
    if (res.success && res.token) {
      localStorage.setItem('attribute3_token', res.token);
      setUser(res.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('attribute3_token');
    localStorage.removeItem('attribute3_local_user');
    localStorage.removeItem('attribute3_current_values');
    localStorage.removeItem('attribute3_submissions');
    // Clear all proof-related local storage items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('proof_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
