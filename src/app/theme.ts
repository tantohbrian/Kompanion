import { useState, useEffect, useCallback } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'kompanion:theme';
const DEFAULT_PREFERENCE: ThemePreference = 'dark';

export function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
  } catch {
    // Ignore localStorage errors (e.g., private browsing mode)
  }
  return DEFAULT_PREFERENCE;
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return preference;
}

export function applyThemeToDOM(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', resolved);
  }
  return resolved;
}

type ThemeListener = (theme: ThemePreference, resolved: ResolvedTheme) => void;
const listeners = new Set<ThemeListener>();

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Ignore storage write errors
  }
  const resolved = applyThemeToDOM(preference);
  listeners.forEach((listener) => listener(preference, resolved));
}

export function useTheme(): {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (preference: ThemePreference) => void;
} {
  const [theme, setThemeState] = useState<ThemePreference>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getStoredTheme()));

  useEffect(() => {
    const initial = getStoredTheme();
    setThemeState(initial);
    setResolvedTheme(applyThemeToDOM(initial));

    const handlePreferenceChange: ThemeListener = (newTheme, newResolved) => {
      setThemeState(newTheme);
      setResolvedTheme(newResolved);
    };

    listeners.add(handlePreferenceChange);

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (getStoredTheme() === 'system') {
        const resolved = applyThemeToDOM('system');
        setResolvedTheme(resolved);
      }
    };

    mediaQuery?.addEventListener('change', handleSystemChange);

    return () => {
      listeners.delete(handlePreferenceChange);
      mediaQuery?.removeEventListener('change', handleSystemChange);
    };
  }, []);

  const setTheme = useCallback((preference: ThemePreference) => {
    setThemePreference(preference);
  }, []);

  return { theme, resolvedTheme, setTheme };
}
