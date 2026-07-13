import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import { useTenant } from '../../../contexts/TenantContext';

interface ThemeToken {
  name: string;
  value: string;
  type: string;
}

interface ThemeConfig {
  whiteLabel: {
    appName: string;
    companyName: string;
    logo: string | null;
    favicon: string | null;
  };
  activeTheme: {
    name: string;
    mode: 'LIGHT' | 'DARK' | 'AUTO';
    tokens: ThemeToken[];
  };
}

interface ThemeContextType {
  config: ThemeConfig | null;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { selectedTenant, flowApiKey } = useTenant();
  const [config, setConfig] = useState<ThemeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';

  const refreshTheme = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiUrl}/api/design/white-label/config`, {
        headers: {
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setConfig(res.data);
      applyThemeTokens(res.data.activeTheme.tokens);
    } catch (e) {
      console.error('Error loading design system configuration:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const applyThemeTokens = (tokens: ThemeToken[]) => {
    const root = document.documentElement;
    
    // Clear previous custom variables
    const variablesToRemove: string[] = [];
    for (let i = 0; i < root.style.length; i++) {
      const key = root.style[i];
      if (key.startsWith('--brand-') || key.startsWith('--theme-')) {
        variablesToRemove.push(key);
      }
    }
    variablesToRemove.forEach(v => root.style.removeProperty(v));

    // Apply new tokens
    tokens.forEach(token => {
      // Injects theme variables (e.g., --primary, --background, etc.)
      root.style.setProperty(`--theme-${token.name}`, token.value);
      // For tailwind fallback
      root.style.setProperty(`--${token.name}`, token.value);
    });
  };

  useEffect(() => {
    refreshTheme();
  }, [selectedTenant]);

  return (
    <ThemeContext.Provider value={{ config, isLoading, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeEngine() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeEngine must be used within a ThemeProvider');
  }
  return context;
}
