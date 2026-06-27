import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  slug?: string;
  status?: string;
  isDefault?: boolean;
  sector?: string;
  avatar?: string;
  brandingConfig?: {
    brandName?: string;
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    footerText?: string;
    heroImage?: string;
  };
  enabledModules?: any;
  stripeApiKey?: string;
  consumption?: {
    totalTokens: number;
    totalCost: number;
  };
}

interface TenantContextType {
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant) => void;
  tenants: Tenant[];
  refreshTenants: () => Promise<void>;
  flowUrl: string;
  setFlowUrl: (url: string) => void;
  flowTenantSlug: string;
  setFlowTenantSlug: (slug: string) => void;
  flowToken: string | null;
  setFlowToken: (token: string | null) => void;
  role: 'system' | 'admin' | 'tenant' | 'operator';
  setRole: (role: 'system' | 'admin' | 'tenant' | 'operator') => void;
  tenantLanguages: Record<string, 'es' | 'en'>;
  setTenantLanguage: (tenantId: string, lang: 'es' | 'en') => void;
  flowApiKey: string;
  setFlowApiKey: (key: string) => void;
  permissions: { menus: string[]; actions: string[] } | null;
  setPermissions: (perms: { menus: string[]; actions: string[] } | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenantState] = useState<Tenant | null>(() => {
    const saved = localStorage.getItem('selectedTenant');
    return saved ? JSON.parse(saved) : null;
  });

  const [flowUrl, setFlowUrlState] = useState<string>(() => {
    return localStorage.getItem('flowUrl') || 'https://flow-api.pitayacode.io';
  });

  const [flowTenantSlug, setFlowTenantSlugState] = useState<string>(() => {
    return localStorage.getItem('flowTenantSlug') || 'pitaya';
  });

  const [flowToken, setFlowTokenState] = useState<string | null>(() => {
    return localStorage.getItem('flowToken');
  });

  const [flowApiKey, setFlowApiKeyState] = useState<string>(() => {
    return localStorage.getItem('flowApiKey') || '';
  });

  const [role, setRoleState] = useState<'system' | 'admin' | 'tenant' | 'operator'>(() => {
    return (localStorage.getItem('pitayacore_role') as any) || 'tenant';
  });

  const [permissions, setPermissionsState] = useState<{ menus: string[]; actions: string[] } | null>(() => {
    const saved = localStorage.getItem('pitayacore_permissions');
    return saved ? JSON.parse(saved) : null;
  });

  const setPermissions = (perms: { menus: string[]; actions: string[] } | null) => {
    setPermissionsState(perms);
    if (perms) localStorage.setItem('pitayacore_permissions', JSON.stringify(perms));
    else localStorage.removeItem('pitayacore_permissions');
  };

  const refreshTenants = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const response = await axios.get(`${apiUrl}/api/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let fetchedTenants = response.data;
      
      // If system, add a virtual "Global View" tenant
      if (role?.toLowerCase() === 'system') {
        const globalView = { id: 'global', name: '🌐 Vista Global', plan: 'SUPERADMIN' };
        fetchedTenants = [globalView, ...fetchedTenants];
      }
      
      setTenants(fetchedTenants);
      
      const saved = localStorage.getItem('selectedTenant');
      if (saved) {
        const parsed = JSON.parse(saved);
        const found = fetchedTenants.find((t: any) => t.id === parsed.id);
        if (found) setSelectedTenantState(found);
        else if (fetchedTenants.length > 0) setSelectedTenant(fetchedTenants[0]);
      } else if (fetchedTenants.length > 0) {
        // Fallback: if system, global is first, if not, first tenant
        setSelectedTenant(fetchedTenants[0]);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  useEffect(() => {
    refreshTenants();
  }, [role]);

  const setRole = (newRole: 'system' | 'admin' | 'tenant' | 'operator') => {
    setRoleState(newRole);
    localStorage.setItem('pitayacore_role', newRole);
  };

  const [tenantLanguages, setTenantLanguages] = useState<Record<string, 'es' | 'en'>>(() => {
    const saved = localStorage.getItem('tenantLanguages');
    return saved ? JSON.parse(saved) : {};
  });

  const setTenantLanguage = (tenantId: string, lang: 'es' | 'en') => {
    const newLangs = { ...tenantLanguages, [tenantId]: lang };
    setTenantLanguages(newLangs);
    localStorage.setItem('tenantLanguages', JSON.stringify(newLangs));
  };

  const setSelectedTenant = (tenant: Tenant) => {
    setSelectedTenantState(tenant);
    localStorage.setItem('selectedTenant', JSON.stringify(tenant));
  };

  const setFlowUrl = (url: string) => {
    setFlowUrlState(url);
    localStorage.setItem('flowUrl', url);
  };

  const setFlowTenantSlug = (slug: string) => {
    setFlowTenantSlugState(slug);
    localStorage.setItem('flowTenantSlug', slug);
  };

  const setFlowToken = (token: string | null) => {
    setFlowTokenState(token);
    if (token) localStorage.setItem('flowToken', token);
    else localStorage.removeItem('flowToken');
  };

  const setFlowApiKey = (key: string) => {
    setFlowApiKeyState(key);
    localStorage.setItem('flowApiKey', key);
  };

  return (
    <TenantContext.Provider value={{ 
      selectedTenant, 
      setSelectedTenant, 
      tenants, 
      refreshTenants,
      flowUrl, 
      setFlowUrl,
      flowTenantSlug,
      setFlowTenantSlug,
      flowToken, 
      setFlowToken,
      flowApiKey,
      setFlowApiKey,
      role,
      setRole,
      tenantLanguages,
      setTenantLanguage,
      permissions,
      setPermissions
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

