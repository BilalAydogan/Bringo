import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<any>(token);
        // Note: LexikJWTAuthenticationBundle standard claims are 'username' for email and 'roles'.
        setUser({ id: decoded.id || '', email: decoded.username, roles: decoded.roles });
      } catch (e) {
        console.error('Invalid token');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
      }
    }
  }, []);

  const login = (token: string, refreshToken: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refresh_token', refreshToken);
    try {
      const decoded = jwtDecode<any>(token);
      setUser({ id: decoded.id || '', email: decoded.username, roles: decoded.roles });
    } catch (e) {
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
    } catch (e) {
      // Silently fail - we still want to clear local state
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
