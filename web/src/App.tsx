import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { SystemDashboard } from './components/dashboards/SystemDashboard'
import { OperationalDashboard } from './components/dashboards/OperationalDashboard'
import { Login } from './components/dashboards/Login'
import { useTenant } from './contexts/TenantContext'
import { useTranslation } from 'react-i18next'
import { CapsuleLanding } from './modules/capsules/CapsuleLanding'
import { CapsuleCatalog } from './modules/capsules/CapsuleCatalog'
import { CapsuleStudioLayout } from './modules/capsules/Studio/CapsuleStudioLayout'
import { CapsuleList } from './modules/capsules/Studio/CapsuleList'
import { CampaignManager } from './modules/capsules/Studio/CampaignManager'
import { CapsuleEditor } from './modules/capsules/Studio/CapsuleEditor'
import { LeadManager } from './modules/capsules/Studio/LeadManager'
import { CapsuleAnalytics } from './modules/capsules/Studio/CapsuleAnalytics'
import { AgentsManager } from './modules/agents/AgentsManager'
import { Storefront } from './modules/ecommerce/storefront/Storefront'

function AppContent() {
  const { selectedTenant, setSelectedTenant, tenantLanguages, role, setRole, setPermissions } = useTenant();
  const { i18n } = useTranslation();

  // PWA Update Logic: Force reload when update is found
  const {
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      console.log('Update found! Forcing reload...');
      updateServiceWorker(true);
    },
  });

  useEffect(() => {
    if (selectedTenant && tenantLanguages[selectedTenant.id]) {
      i18n.changeLanguage(tenantLanguages[selectedTenant.id]);
    }
  }, [selectedTenant, tenantLanguages, i18n]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('pitayacore_auth') === 'true';
  });
  
  const handleLogin = (user: any) => {
    let userRole: 'system' | 'admin' | 'tenant' | 'operator' = 'tenant';
    
    // Map backend roles to frontend role buckets
    if (user.role === 'SYSTEM') userRole = 'system';
    else if (user.role === 'ADMIN') userRole = 'admin';
    else if (user.role === 'OPERATOR') userRole = 'operator';
    else userRole = 'tenant'; 

    // Set selected tenant from user profile
    if (user.tenantId) {
      setSelectedTenant({
        id: user.tenantId,
        name: user.tenantName || 'Inquilino',
        plan: 'FREE' // Default plan if not provided
      });
    }

    setIsAuthenticated(true);
    setRole(userRole);
    setPermissions(user.permissions);
    localStorage.setItem('pitayacore_auth', 'true');
    localStorage.setItem('pitayacore_user_email', user.email);
  };


  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/capsules/:slug" element={<CapsuleLanding />} />
      <Route path="/capsules" element={<CapsuleCatalog />} />
      <Route path="/store/:slug" element={<Storefront />} />
      <Route path="/store/:slug/order/:trackingId" element={<Storefront />} />
      
      {/* Auth Routes */}
      <Route 
        path="/" 
        element={
          !isAuthenticated ? (
            <Login onLogin={handleLogin} />
          ) : (
            (role === 'system' && (!selectedTenant || selectedTenant.id === 'global')) 
              ? <SystemDashboard /> 
              : <OperationalDashboard />
          )
        } 
      />

      {/* Capsule Studio */}
      <Route path="/app/capsules" element={isAuthenticated ? <CapsuleStudioLayout /> : <Navigate to="/" />}>
        <Route index element={<CapsuleList />} />
        <Route path="campaigns" element={<CampaignManager />} />
        <Route path="leads" element={<LeadManager />} />
        <Route path="analytics" element={<CapsuleAnalytics />} />
        <Route path="agents" element={<AgentsManager />} />
      </Route>

      <Route path="/app/capsules/edit/:id" element={isAuthenticated ? <CapsuleEditor /> : <Navigate to="/" />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

