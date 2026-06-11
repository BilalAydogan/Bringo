import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '../api/axios';

type JwtPayload = {
  id?: string;
  username: string;
  roles?: string[];
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt?: string;
  isVerified?: boolean;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const decodeUser = (token: string): User => {
    const decoded = jwtDecode<JwtPayload>(token);

    return {
      id: decoded.id || '',
      email: decoded.username,
      firstName: '',
      lastName: '',
      roles: decoded.roles ?? [],
    };
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/auth/me');
      const profile = response.data.data;
      setUser({
        id: profile.id ?? '',
        email: profile.email ?? '',
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        createdAt: profile.created_at ?? undefined,
        isVerified: profile.is_verified ?? undefined,
        roles: profile.roles ?? [],
      });
    } catch {
      console.error('Could not load current user');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setUser(decodeUser(token));
        void refreshUser();
      } catch {
        console.error('Invalid token');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
      }
    }
  }, [refreshUser]);

  const login = (token: string, refreshToken: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refresh_token', refreshToken);
    try {
      setUser(decodeUser(token));
      void refreshUser();
    } catch {
      console.error('Invalid token on login');
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        const axiosInstance = (await import('../api/axios')).default;
        await axiosInstance.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Silently fail - we still want to clear local state
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.roles.includes('ROLE_ADMIN') ?? false,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
