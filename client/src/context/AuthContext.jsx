import { createContext, useContext, useState } from 'react';
import { apiFetch } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('elective_user')) || null; }
    catch { return null; }
  });

  function persist(data) {
    localStorage.setItem('elective_token', data.token);
    const { token: _t, ...safeUser } = data;
    setUser(safeUser);
    localStorage.setItem('elective_user', JSON.stringify(safeUser));
    return safeUser;
  }

  const login = async (identifier, password, role) => {
    const body = { email: identifier.trim(), password };

    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return persist(data);
  };

  const register = async (name, email, password) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });
    return persist(data);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('elective_user');
    localStorage.removeItem('elective_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
