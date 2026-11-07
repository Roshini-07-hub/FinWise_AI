import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('finwise_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('finwise_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('finwise_user', JSON.stringify(res.data.data));
          }
        } catch (err) {
          console.error('Session verify failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.data.success) {
      const userData = res.data.data;
      setUser(userData);
      setToken(userData.token);
      localStorage.setItem('finwise_token', userData.token);
      localStorage.setItem('finwise_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    if (res.data.success) {
      const userData = res.data.data;
      setUser(userData);
      setToken(userData.token);
      localStorage.setItem('finwise_token', userData.token);
      localStorage.setItem('finwise_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('finwise_token');
    localStorage.removeItem('finwise_user');
  };

  const updateUserData = (updatedFields) => {
    setUser(prev => {
      const next = { ...prev, ...updatedFields };
      localStorage.setItem('finwise_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
