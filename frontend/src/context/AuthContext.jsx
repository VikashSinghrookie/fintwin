import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('ft_token');
    if (saved) {
      const payload = parseJwt(saved);
      if (payload && payload.exp * 1000 > Date.now()) {
        setToken(saved);
        setUser({ id: payload.sub, name: payload.name });
      } else {
        sessionStorage.removeItem('ft_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await client.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    sessionStorage.setItem('ft_token', t);
    setToken(t);
    setUser(u);
  };

  const register = async (name, email, password) => {
    const res = await client.post('/auth/register', { name, email, password });
    const { token: t, user: u } = res.data;
    sessionStorage.setItem('ft_token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    sessionStorage.clear();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
