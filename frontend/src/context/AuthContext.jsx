import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ag_rental_token';
const USER_KEY = 'ag_rental_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  // Swap in a fresh user (+ optionally a fresh token, e.g. after a
  // successful email/phone verify).
  function applyAuth({ user: nextUser, token }) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (nextUser) setUser(nextUser);
  }

  async function login(email, password) {
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      applyAuth(data);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  async function register(payload) {
    setLoading(true);
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: payload,
        auth: false,
      });
      applyAuth(data);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  async function refreshUser() {
    try {
      const data = await api('/auth/me');
      if (data?.user) setUser(data.user);
      return data?.user;
    } catch {
      // token invalid → log the user out
      logout();
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      user, login, register, logout, loading, refreshUser, applyAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
