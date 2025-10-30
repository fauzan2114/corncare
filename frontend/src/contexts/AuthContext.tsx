import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, getAuthToken, removeAuthToken, User } from '../lib/auth-api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: () => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: async () => {},
  logout: () => {}
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUserState(userData);
    } catch (error) {
      setUserState(null);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUserState(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        await setUser();
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      setUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};