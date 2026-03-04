import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface User {
  id?: number;
  name: string;
  email?: string;
  role: 'ciudadano' | 'operador' | 'jefe_cuadrilla' | 'supervisor' | 'operator';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function parseError(err: any, fallback: string): string {
  if (!err) return fallback;
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail.map((d: any) => d.msg || JSON.stringify(d)).join(' · ');
  }
  if (err.message) return err.message;
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('vita360_token');
    const savedUser = localStorage.getItem('vita360_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('vita360_token');
        localStorage.removeItem('vita360_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);

    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(parseError(err, 'Error al iniciar sesión'));
    }

    const data = await res.json();
    const userData: User = { name: data.name, role: data.role, email };
    setToken(data.access_token);
    setUser(userData);
    localStorage.setItem('vita360_token', data.access_token);
    localStorage.setItem('vita360_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string
  ) => {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(parseError(err, 'Error al registrar usuario'));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('vita360_token');
    localStorage.removeItem('vita360_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
