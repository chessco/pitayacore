import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { TenantProvider } from './contexts/TenantContext'
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import axios from 'axios';

// Global Axios Interceptor
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Global Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  const token = localStorage.getItem('token');
  
  if (token && typeof resource === 'string' && resource.includes('/api/')) {
    const newConfig: any = config ? { ...config } : {};
    newConfig.headers = {
      ...newConfig.headers,
      'Authorization': `Bearer ${token}`
    };
    args[1] = newConfig;
  }
  return originalFetch(...args);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <App />
        </TenantProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)

