import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setCsrf, post, ApiError } from './api';
import type { User, Period } from '../../shared/contracts';
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(!!path),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    setLoading(!!path);
    if (path)
      api<T>(path)
        .then((d) => {
          if (active) setData(d);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return { data, error, loading, refresh };
}
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}>({ user: null, loading: true, error: '', refresh: async () => {}, logout: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const u = await api<User>('/auth/me');
      setCsrf(u.csrfToken);
      setUser(u);
      setError('');
    } catch (e) {
      setUser(null);
      if (!(e instanceof ApiError && e.status === 401)) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const listener = () => setUser(null);
    window.addEventListener('session-expired', listener);
    return () => window.removeEventListener('session-expired', listener);
  }, [refresh]);
  const logout = async () => {
    await post('/auth/logout');
    setCsrf('');
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
const PeriodContext = createContext<{
  period: Period | undefined;
  periods: Period[];
  setPeriod: (id: string) => void;
  refresh: () => void;
  loading: boolean;
  error: string;
}>({
  period: undefined,
  periods: [],
  setPeriod: () => {},
  refresh: () => {},
  loading: true,
  error: '',
});
export function PeriodProvider({ children }: { children: ReactNode }) {
  const { data, refresh, loading, error } = useApi<Period[]>('/periods');
  const [selected, setSelected] = useState(localStorage.getItem('talenta.period') || '');
  const periods = data || [],
    period =
      periods.find((p) => p.id === selected) ||
      periods.find((p) => p.status === 'OPEN') ||
      periods[0];
  const setPeriod = (id: string) => {
    setSelected(id);
    localStorage.setItem('talenta.period', id);
  };
  return (
    <PeriodContext.Provider value={{ period, periods, setPeriod, refresh, loading, error }}>
      {children}
    </PeriodContext.Provider>
  );
}
export const usePeriod = () => useContext(PeriodContext);
