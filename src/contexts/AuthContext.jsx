import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, tokens } from '../api/client.js';

const AuthContext = createContext(null);

// Фиксированные ESIA-UID для демо-кнопок — чтобы каждый раз входить
// под одного и того же пользователя со всей накопленной историей
const DEMO_ESIA_UIDS = {
  investor:     'demo_investor',
  entrepreneur: 'demo_owner',
  admin:        'demo_admin',
};

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokens.access) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then(setUser)
      .catch(() => tokens.clear())
      .finally(() => setLoading(false));
  }, []);

  const setAuthData = (data) => {
    tokens.set(data.access, data.refresh);
    setUser(data.user);
  };

  const login = useCallback(async (username, password) => {
    const data = await authApi.login({ username, password });
    setAuthData(data);
    return data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const data = await authApi.register(formData);
    setAuthData(data);
    return data.user;
  }, []);

  const loginWithESIA = useCallback(async (role = 'investor', isDemoButton = false) => {
    // Демо-кнопки на форме логина → фиксированный uid → захожу под seed-юзером
    // Кнопка "Войти через Госуслуги" в шапке формы → случайный uid (новый юзер)
    const esia_uid = isDemoButton
      ? DEMO_ESIA_UIDS[role] || DEMO_ESIA_UIDS.investor
      : `demo_${Math.random().toString(36).slice(2, 10)}`;

    const data = await authApi.esia({ esia_uid, role });
    setAuthData(data);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokens.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authApi.me();
      setUser(fresh);
      return fresh;
    } catch (e) {
      logout();
      throw e;
    }
  }, [logout]);

  const updateUser = useCallback((patch) => {
    setUser((u) => ({ ...u, ...patch }));
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, loginWithESIA, logout, refreshUser, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри <AuthProvider>');
  return ctx;
}
