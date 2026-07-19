import React, { createContext, useState, useEffect } from 'react';
import { login as loginService, changePassword as changePasswordService } from '../api/authApi';

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (email, password, role) => {
    try {
      const data = await loginService(email, password, role);
      if (data.requirePasswordChange) {
        return { requirePasswordChange: true, tempToken: data.tempToken };
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      const data = err.response?.data;
      throw new Error(data?.details || data?.error || 'Login failed');
    }
  };

  const changePassword = async (tempToken, newPassword) => {
    try {
      const data = await changePasswordService(tempToken, newPassword);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      const data = err.response?.data;
      throw new Error(data?.error || 'Failed to change password');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}
