import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Mail, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle2, 
  X, 
  Search, 
  ChevronRight, 
  BarChart3, 
  Database, 
  Wand2, 
  Zap, 
  Fish, 
  Palette, 
  Trash2,
  Eye,
  Sparkles,
  Loader2,
  RefreshCw,
  MessageCircle,
  Phone,
  ExternalLink,
  Copy,
  CheckCheck,
  Users,
  AlertCircle,
  PhoneOff,
  UserX,
  Edit2
} from 'lucide-react';
import axios from 'axios';
import { useTenant } from '../../../contexts/TenantContext';

import { EmailTemplateEditor } from './components/EmailTemplateEditor';
import type { EmailBlock } from './components/EmailTemplateEditor';
import { AudienceManager } from './components/AudienceManager';

export const CampaignManager: React.FC = () => {
  const { selectedTenant, flowApiKey, role } = useTenant();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'audiences' | 'branding' | 'whatsapp'>('campaigns');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [audiencesList, setAudiencesList] = useState<any[]>([]);
  const [hasError, setHasError] = useState(false);
  const [branding, setBranding] = useState({
    primaryColor: '#001A41',
    accentColor: '#2563eb',
    logoUrl: '/static/assets/logo-white.png',
    heroImage: '/static/assets/hero-acuaequipos.png',
    footerText: '© 2026 Acuaequipos Capsulas Acuicolas. Todos los derechos reservados.'
  });

  const [campaignData, setCampaignData] = useState({
    name: '',
    capsuleId: '',
    subject: '',
    description: '',
    ctaText: 'Explorar Cápsula Interactiva',
    audience: '',
    audienceId: ''
  });
  const [emailBlocks, setEmailBlocks] = useState<EmailBlock[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setHasError(false);
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('pitayacore_role') || 'ADMIN';

      let apiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3014`;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        apiUrl = `http://${window.location.hostname}:3014`;
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': selectedTenant?.id || '', 
        'x-user-role': role.toUpperCase(),
        'x-api-key': flowApiKey 
      };

      try {
        const [capsulesRes, campaignsRes, brandingRes, audiencesRes] = await Promise.all([
          axios.get(apiUrl + '/api/capsule-studio/capsules', { headers }),
          axios.get(apiUrl + '/api/capsule-studio/campaigns', { headers }),
          axios.get(apiUrl + '/api/capsule-studio/branding', { headers }),
          axios.get(apiUrl + '/api/capsule-studio/audiences', { headers }).catch(() => ({ data: [] }))
        ]);
        setCapsules(capsulesRes.data);
        const sortedCampaigns = (campaignsRes.data || []).sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setCampaigns(sortedCampaigns);
        setAudiencesList(audiencesRes.data || []);
        if (brandingRes.data && Object.keys(brandingRes.data).length > 0) {
          setBranding(prev => ({ ...prev, ...brandingRes.data }));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    };
    if (selectedTenant) fetchData();
  }, [selectedTenant, flowApiKey, refreshKey]);

  // Refetch audiences when switching to the campaigns OR whatsapp tab
  // so any lists created in the Audiences tab show up in both dropdowns
  useEffect(() => {
    if ((activeTab === 'campaigns' || activeTab === 'whatsapp') && selectedTenant) {
      const fetchAudiences = async () => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('pitayacore_role') || 'ADMIN';
        let apiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3014`;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') apiUrl = `http://${window.location.hostname}:3014`;
        
        const headers = { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': selectedTenant.id, 
          'x-user-role': role.toUpperCase(),
          'x-api-key': flowApiKey 
        };

        try {
          const res = await axios.get(apiUrl + '/api/capsule-studio/audiences', { headers });
          setAudiencesList(res.data || []);
        } catch (err) {
          console.error('Error fetching audiences:', err);
        }
      };
      fetchAudiences();
    }
  }, [activeTab, selectedTenant, flowApiKey]);

  const handleGenerateAiText = async (tone: string = 'professional') => {
    const selected = capsules.find(c => c.id === campaignData.capsuleId);
    if (!selected) return alert('Por favor, selecciona una cápsula primero');
    
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3014'}/api/ai/generate-campaign-text`, {
        capsule: { title: selected.title, description: selected.description },
        tone: tone
      }, { headers: { 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey, 'x-user-role': (role || 'admin').toUpperCase() } });
      
      setCampaignData(prev => ({ 
        ...prev, 
        subject: res.data.subject,
        description: res.data.content,
        ctaText: res.data.cta 
      }));
    } catch (err) {
      alert('Error generando texto con IA');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiImage = async () => {
    const selected = capsules.find(c => c.id === campaignData.capsuleId);
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3014'}/api/ai/generate-image`, {
        prompt: selected ? `Topic: ${selected.title}. Description: ${selected.description}` : 'High quality professional aquaculture design'
      }, {
        headers: { 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey, 'x-user-role': (role || 'admin').toUpperCase() }
      });
      setBranding(prev => ({ ...prev, heroImage: res.data.url }));
    } catch (err) {
      alert('Error generando imagen con IA');
    } finally {
      setLoading(false);
    }
  };

  const handleCapsuleChange = (id: string) => {
    const selected = capsules.find(c => c.id === id);
    if (selected) {
      setCampaignData(prev => ({
        ...prev,
        capsuleId: id,
        name: `Campaña: ${selected.title}`,
        subject: `Descubre: ${selected.title}`
      }));
      const heroImg = selected.contentBlocks?.find((b: any) => b.type === 'hero')?.data?.image || branding.heroImage;
      const fullHeroImg = heroImg?.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:3014'}${heroImg}` : heroImg;

      const keyPoints = selected.contentBlocks
        ?.filter((b: any) => b.type === 'text' || b.type === 'section')
        ?.slice(0, 2)
        ?.map((b: any) => b.data?.title || b.title || '')
        ?.filter(Boolean)
        ?.join(' y ') || '';

      const initialText = `Estimado productor,\n\nQuiero compartir contigo una herramienta clave para tu operación: "${selected.title}".\n\nEn esta cápsula interactiva exploramos a fondo ${keyPoints || 'los puntos críticos para tu producción'}, con el objetivo de mejorar tu eficiencia y resultados.\n\n${selected.description || ''}\n\nTe invito a revisarla haciendo clic en el botón de abajo.`;

      setEmailBlocks([
        { id: 'h1', type: 'header', content: { title: selected.title } },
        { id: 'i1', type: 'image', content: { url: fullHeroImg, alt: selected.title } },
        { id: 't1', type: 'text', content: { text: initialText } },
        { id: 'b1', type: 'button', content: { text: 'Explorar Cápsula Interactiva', url: '#' } },
        { id: 'f1', type: 'footer', content: { text: branding.footerText } }
      ]);
    } else {
      setCampaignData(prev => ({ ...prev, capsuleId: id }));
      setEmailBlocks([]);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const combinedContent = emailBlocks.map(b => {
        if (b.type === 'text') return b.content.text;
        if (b.type === 'header') return `# ${b.content.title}`;
        return '';
      }).filter(t => t).join('\n\n');

      const payload = {
        name: campaignData.name,
        capsuleId: campaignData.capsuleId,
        subject: campaignData.subject,
        content: combinedContent,
        audience: campaignData.audience,
        audienceId: (campaignData as any).audienceId || null,
        scheduledAt: new Date(),
        templateConfig: {
          ctaText: campaignData.ctaText,
          blocks: emailBlocks
        }
      };

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const headers = {
        'x-tenant-id': selectedTenant?.id || '',
        'x-api-key': flowApiKey,
        'x-user-role': (role || 'admin').toUpperCase(),
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };

      let res;
      if ((campaignData as any).id) {
        // Update existing
        res = await axios.patch(`${apiUrl}/api/capsule-studio/campaigns/${(campaignData as any).id}`, payload, { headers });
      } else {
        // Create new
        res = await axios.post(`${apiUrl}/api/capsule-studio/campaigns`, payload, { headers });
      }

      let finalCampaign = res.data;
      if (finalCampaign.audienceId) {
        const selectedAudience = audiencesList.find(a => a.id === finalCampaign.audienceId);
        if (selectedAudience) {
          finalCampaign.audienceList = {
            _count: { members: selectedAudience._count?.members || 0 }
          };
        }
      }

      if ((campaignData as any).id) {
        setCampaigns(campaigns.map(c => c.id === finalCampaign.id ? finalCampaign : c));
      } else {
        setCampaigns([finalCampaign, ...campaigns]);
      }

      setShowCreateModal(false);
      resetCampaignForm();
    } catch (err) {
      console.error('Error saving campaign:', err);
      alert('Error al guardar la campaña.');
    } finally {
      setLoading(false);
    }
  };

  const resetCampaignForm = () => {
    setCampaignData({
      name: '',
      capsuleId: '',
      subject: '',
      description: '',
      ctaText: 'Explorar Cápsula Interactiva',
      audience: '',
      audienceId: ''
    });
    setEmailBlocks([]);
  };

  const handleEditClick = (camp: any) => {
    if (camp.sentAt) {
        setSelectedCampaign(camp); // Just view stats if already sent
        return;
    }

    setCampaignData({
      id: camp.id,
      name: camp.name,
      capsuleId: camp.capsuleId,
      subject: camp.subject,
      description: camp.content,
      ctaText: (camp.templateConfig as any)?.ctaText || 'Explorar Cápsula Interactiva',
      audience: camp.audience || '',
      audienceId: camp.audienceId || ''
    } as any);

    if ((camp.templateConfig as any)?.blocks) {
      setEmailBlocks((camp.templateConfig as any).blocks);
    } else {
      // Fallback: create basic blocks from content
      setEmailBlocks([
        { id: 'h1', type: 'header', content: { title: camp.name } },
        { id: 't1', type: 'text', content: { text: camp.content } }
      ]);
    }

    setShowCreateModal(true);
  };

  const handleSendCampaign = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas enviar esta campaña ahora?')) return;
    
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const headers = { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'x-tenant-id': selectedTenant?.id || '',
        'x-api-key': flowApiKey,
        'x-user-role': (role || 'admin').toUpperCase()
      };

      await axios.post(`${apiUrl}/api/capsule-studio/campaigns/${id}/send`, {}, { headers });
      
      // Update local state
      setCampaigns(campaigns.map(c => c.id === id ? { ...c, sentAt: new Date().toISOString() } : c));
      setSelectedCampaign(null);
      alert('¡Campaña enviada con éxito!');
    } catch (err) {
      console.error('Error sending campaign:', err);
      alert('Error al enviar la campaña. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar esta campaña permanentemente?')) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const headers = { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'x-tenant-id': selectedTenant?.id || '',
        'x-api-key': flowApiKey,
        'x-user-role': (role || 'admin').toUpperCase()
      };

      await axios.delete(`${apiUrl}/api/capsule-studio/campaigns/${id}`, { headers });
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (err) {
      alert('No se pudo eliminar la campaña.');
    }
  };

  const handleSaveBranding = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const headers = { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'x-tenant-id': selectedTenant?.id || '',
        'x-api-key': flowApiKey,
        'x-user-role': (role || 'admin').toUpperCase()
      };

      await axios.post(`${apiUrl}/api/capsule-studio/branding`, branding, { headers });
      alert('Diseño global guardado correctamente.');
    } catch (err) {
      alert('Error al guardar el diseño.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const res = await axios.post(`${apiUrl}/api/capsule-studio/upload`, formData, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'x-user-role': (role || 'admin').toUpperCase()
        }
      });
      setBranding(prev => ({ ...prev, [field]: res.data.url }));
    } catch (err) {
      alert('Error al subir la imagen.');
    } finally {
      setLoading(false);
    }
  };

  // ─── WhatsApp Campaign Panel ───────────────────────────────────────────────
  const WhatsAppCampaignPanel: React.FC = () => {
    const [waCampaigns, setWaCampaigns] = useState<any[]>([]);
    const [selectedWaCampaign, setSelectedWaCampaign] = useState<any>(null);
    const [waMessage, setWaMessage] = useState('');
    const [waLinks, setWaLinks] = useState<any[]>([]);
    const [waLoading, setWaLoading] = useState(false);
    const [waLinksLoading, setWaLinksLoading] = useState(false);
    const [waError, setWaError] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [creatingNew, setCreatingNew] = useState(false);
    const [newWaName, setNewWaName] = useState('');
    const [newWaCapsuleId, setNewWaCapsuleId] = useState('');
    const [newWaAudienceId, setNewWaAudienceId] = useState('');
    const [newWaLoading, setNewWaLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    // Sequential "send all" (warm-up) state
    const [waSending, setWaSending] = useState(false);
    const [waSendProgress, setWaSendProgress] = useState(0);
    const waStopRef = useRef(false);
    // Server-side send (image + text) state
    const [waImage, setWaImage] = useState<string | null>(null);
    const [waImageName, setWaImageName] = useState('');
    const [waServerStarting, setWaServerStarting] = useState(false);
    const [waServerStatus, setWaServerStatus] = useState<any>(null);
    const waPollRef = useRef<any>(null);
    // Manual per-contact send (via library)
    const [waSendingOneId, setWaSendingOneId] = useState<string | null>(null);
    const [waSentOneIds, setWaSentOneIds] = useState<string[]>([]);

    const apiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3014`;
    const headers = {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'x-tenant-id': selectedTenant?.id || '',
      'x-api-key': flowApiKey,
      'x-user-role': (role || 'admin').toUpperCase(),
    };

    // Load WhatsApp campaigns
    useEffect(() => {
      if (!selectedTenant) return;
      setWaLoading(true);
      fetch(`${apiUrl}/api/capsule-studio/campaigns/whatsapp`, { headers })
        .then(r => r.json())
        .then(data => {
          setWaCampaigns(Array.isArray(data) ? data : []);
        })
        .catch(() => setWaError('Error cargando campañas WhatsApp'))
        .finally(() => setWaLoading(false));
    }, [selectedTenant, refreshKey]);

    // When a campaign is selected, load its whatsapp message
    const handleSelectCampaign = async (camp: any) => {
      setSelectedWaCampaign(camp);
      setWaLinks([]);
      setWaMessage(camp.whatsappMessage || '');
      // Auto-generate message if none exists
      if (!camp.whatsappMessage) {
        await handleGenerateMessage(camp.id, false);
      }
    };

    const handleGenerateMessage = async (campId: string, confirm = true) => {
      if (confirm && !window.confirm('¿Generar un mensaje nuevo con IA? Esto reemplazará el mensaje actual.')) return;
      setWaLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/capsule-studio/campaigns/${campId}/whatsapp-message`, {
          method: 'POST', headers
        });
        const data = await res.json();
        setWaMessage(typeof data === 'string' ? data : data.message || '');
        setSelectedWaCampaign((prev: any) => prev ? { ...prev, whatsappMessage: data } : prev);
      } catch { setWaError('Error generando mensaje'); }
      finally { setWaLoading(false); }
    };

    const handleSaveMessage = async () => {
      if (!selectedWaCampaign) return;
      setWaLoading(true);
      try {
        await fetch(`${apiUrl}/api/capsule-studio/campaigns/${selectedWaCampaign.id}/whatsapp-message`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: waMessage }),
        });
        setSelectedWaCampaign((prev: any) => prev ? { ...prev, whatsappMessage: waMessage } : prev);
      } catch { setWaError('Error guardando mensaje'); }
      finally { setWaLoading(false); }
    };

    const handleMarkLead = async (memberId: string, status: string) => {
      if (!selectedWaCampaign?.audienceId) {
        setWaError('Esta campaña no tiene audiencia asignada.');
        return;
      }
      if (!window.confirm(`¿Seguro que deseas marcar este lead como ${status === 'WA_INVALID' ? 'NÚMERO INVÁLIDO' : 'NO MOLESTAR'}?`)) return;
      try {
        await fetch(`${apiUrl}/api/capsule-studio/audiences/${selectedWaCampaign.audienceId}/members/${memberId}/status`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        setWaLinks(prev => prev.filter(l => l.memberId !== memberId));
      } catch {
        setWaError('Error al actualizar lead');
      }
    };

    const handleGenerateLinks = async () => {
      if (!selectedWaCampaign) return;
      setWaLinksLoading(true);
      setWaError('');
      try {
        const res = await fetch(`${apiUrl}/api/capsule-studio/campaigns/${selectedWaCampaign.id}/whatsapp-links`, { headers });
        const data = await res.json();
        setWaLinks(data.links || []);
      } catch { setWaError('Error generando links. Verifica que la audiencia tiene contactos.'); }
      finally { setWaLinksLoading(false); }
    };

    const handleCopyMessage = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    };

    const handleOpenAll = () => {
      const withPhone = waLinks.filter(l => l.hasPhone);
      if (!withPhone.length) { alert('Ningún contacto tiene teléfono registrado.'); return; }
      if (!window.confirm(`¿Abrir ${withPhone.length} conversaciones de WhatsApp en nuevas pestañas?`)) return;
      withPhone.forEach((l, i) => setTimeout(() => window.open(l.waUrl, '_blank'), i * 500));
    };

    // Opens each conversation one-by-one with a random 3-7s pause between them
    // to "warm up" the campaign. Cancelable; clicking again while running stops it.
    const handleSendAllSequential = async () => {
      if (waSending) {
        waStopRef.current = true; // request stop
        return;
      }
      const withPhone = waLinks.filter(l => l.hasPhone);
      if (!withPhone.length) { alert('Ningún contacto tiene teléfono registrado.'); return; }
      if (!window.confirm(
        `Se abrirán ${withPhone.length} conversaciones de WhatsApp UNA POR UNA, con una pausa aleatoria de 3-7 s entre cada una (para calentar la campaña).\n\n` +
        `• No cierres esta pestaña durante el proceso.\n` +
        `• Permite las ventanas emergentes si el navegador las bloquea.\n` +
        `• Puedes detenerlo en cualquier momento con el mismo botón.\n\n¿Continuar?`
      )) return;

      waStopRef.current = false;
      setWaSending(true);
      try {
        for (let i = 0; i < withPhone.length; i++) {
          if (waStopRef.current) break;
          setWaSendProgress(i + 1);
          window.open(withPhone[i].waUrl, '_blank');
          // Random 3-7s pause before the next one (not after the last).
          if (i < withPhone.length - 1) {
            const delay = 3000 + Math.random() * 4000;
            const step = 100;
            for (let waited = 0; waited < delay; waited += step) {
              if (waStopRef.current) break;
              await new Promise(r => setTimeout(r, step));
            }
          }
        }
      } finally {
        setWaSending(false);
        setWaSendProgress(0);
        waStopRef.current = false;
      }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { alert('Selecciona un archivo de imagen.'); return; }
      if (file.size > 8 * 1024 * 1024) { alert('La imagen es muy grande (máx. 8 MB).'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        setWaImage(reader.result as string);
        setWaImageName(file.name);
      };
      reader.readAsDataURL(file);
    };

    const pollServerStatus = async () => {
      if (!selectedWaCampaign) return;
      try {
        const res = await fetch(`${apiUrl}/api/capsule-studio/campaigns/${selectedWaCampaign.id}/send-whatsapp/status`, { headers });
        const data = await res.json();
        setWaServerStatus(data);
        if (data.exists && !data.running && data.done && waPollRef.current) {
          clearInterval(waPollRef.current);
          waPollRef.current = null;
        }
      } catch { /* ignore transient poll errors */ }
    };

    const startPolling = () => {
      if (waPollRef.current) clearInterval(waPollRef.current);
      pollServerStatus();
      waPollRef.current = setInterval(pollServerStatus, 2000);
    };

    const handleServerSend = async () => {
      const withPhone = waLinks.filter(l => l.hasPhone);
      if (!withPhone.length) { alert('Ningún contacto tiene teléfono registrado. Genera los links primero.'); return; }
      if (!window.confirm(
        `Se enviará el mensaje${waImage ? ' + imagen' : ''} a ${withPhone.length} contacto(s) DIRECTAMENTE desde el servidor (la línea de WhatsApp conectada), uno por uno con pausa aleatoria de 3-7 s.\n\n` +
        `⚠️ El envío automático masivo puede provocar que WhatsApp bloquee la línea. Úsalo con volúmenes controlados.\n\n¿Continuar?`
      )) return;

      setWaServerStarting(true);
      try {
        const res = await fetch(`${apiUrl}/api/capsule-studio/campaigns/${selectedWaCampaign.id}/send-whatsapp`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: waImage || undefined })
        });
        const data = await res.json();
        if (!res.ok || !data.started) {
          alert(data.message || 'No se pudo iniciar el envío.');
          return;
        }
        startPolling();
      } catch {
        alert('Error al iniciar el envío por servidor.');
      } finally {
        setWaServerStarting(false);
      }
    };

    const handleStopServerSend = async () => {
      try {
        await fetch(`${apiUrl}/api/capsule-studio/campaigns/${selectedWaCampaign.id}/send-whatsapp/stop`, { method: 'POST', headers });
      } catch { /* ignore */ }
    };

    // Manual send of a single contact via the library (server).
    const handleSendOne = async (link: any) => {
      if (!link.hasPhone) { alert('Este contacto no tiene teléfono.'); return; }
      setWaSendingOneId(link.memberId);
      try {
        const res = await fetch(`${apiUrl}/api/capsule-studio/campaigns/${selectedWaCampaign.id}/send-whatsapp-one`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId: link.memberId, imageBase64: waImage || undefined })
        });
        const data = await res.json();
        if (res.ok && data.skipped) {
          // Already sent within the 24h window — treat as sent, inform.
          setWaSentOneIds(prev => prev.includes(link.memberId) ? prev : [...prev, link.memberId]);
          alert(data.reason || 'Ya se envió a este contacto en las últimas 24 horas.');
          return;
        }
        if (!res.ok || !data.sent) {
          alert(data.message || 'No se pudo enviar por la librería.');
          return;
        }
        setWaSentOneIds(prev => prev.includes(link.memberId) ? prev : [...prev, link.memberId]);
      } catch {
        alert('Error al enviar por la librería.');
      } finally {
        setWaSendingOneId(null);
      }
    };

    // Resume progress display if a job is already running, and clean up polling.
    useEffect(() => {
      pollServerStatus();
      return () => {
        if (waPollRef.current) { clearInterval(waPollRef.current); waPollRef.current = null; }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWaCampaign?.id]);

    // Keep polling active while a resumed job is running.
    useEffect(() => {
      if (waServerStatus?.running && !waPollRef.current) startPolling();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waServerStatus?.running]);

    const handleCreateWaCampaign = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newWaName || !newWaCapsuleId) return;
      setNewWaLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/capsule-studio/campaigns`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newWaName,
            capsuleId: newWaCapsuleId,
            audienceId: newWaAudienceId || undefined,
            channel: 'WHATSAPP',
            subject: newWaName,
            content: '',
            scheduledAt: new Date(),
          }),
        });
        const created = await res.json();
        setWaCampaigns(prev => [created, ...prev]);
        setCreatingNew(false);
        setNewWaName(''); setNewWaCapsuleId(''); setNewWaAudienceId('');
        handleSelectCampaign(created);
      } catch { setWaError('Error creando campaña'); }
      finally { setNewWaLoading(false); }
    };

    const handleUpdateWaCampaign = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newWaName || !newWaCapsuleId || !editingId) return;
      setNewWaLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/capsule-studio/campaigns/${editingId}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newWaName,
            capsuleId: newWaCapsuleId,
            audienceId: newWaAudienceId || null,
          }),
        });
        const updated = await res.json();
        setWaCampaigns(prev => prev.map(c => c.id === editingId ? updated : c));
        if (selectedWaCampaign?.id === editingId) {
          setSelectedWaCampaign((prev: any) => ({ ...prev, name: updated.name, capsuleId: updated.capsuleId, audienceId: updated.audienceId }));
        }
        setEditingId(null);
        setNewWaName(''); setNewWaCapsuleId(''); setNewWaAudienceId('');
      } catch { setWaError('Error actualizando campaña'); }
      finally { setNewWaLoading(false); }
    };

    const handleDeleteWaCampaign = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!window.confirm('¿Deseas eliminar esta campaña WhatsApp permanentemente?')) return;
      
      try {
        await fetch(`${apiUrl}/api/capsule-studio/campaigns/${id}`, {
          method: 'DELETE',
          headers,
        });
        setWaCampaigns(prev => prev.filter(c => c.id !== id));
        if (selectedWaCampaign?.id === id) setSelectedWaCampaign(null);
      } catch {
        setWaError('No se pudo eliminar la campaña.');
      }
    };

    const handleEditClick = (e: React.MouseEvent, camp: any) => {
      e.stopPropagation();
      setCreatingNew(false);
      setEditingId(camp.id);
      setNewWaName(camp.name);
      setNewWaCapsuleId(camp.capsuleId || '');
      setNewWaAudienceId(camp.audienceId || '');
    };

    // WhatsApp message preview renderer (bold & line breaks)
    const renderPreview = (msg: string) =>
      msg.replace(/\*([^*]+)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />');

    const linksWithPhone = waLinks.filter(l => l.hasPhone).length;
    const linksNoPhone = waLinks.filter(l => !l.hasPhone).length;

    return (
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#25D366' }}>
              <MessageCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Canal</p>
              <p className="text-sm font-black text-slate-800">Campañas WhatsApp</p>
            </div>
          </div>
          <button
            onClick={() => { setCreatingNew(true); setEditingId(null); setNewWaName(''); setNewWaCapsuleId(''); setNewWaAudienceId(''); setSelectedWaCampaign(null); setWaLinks([]); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all hover:opacity-90"
            style={{ background: '#25D366', boxShadow: '0 8px 20px #25D36640' }}
          >
            <Plus size={16} /> Nueva Campaña WA
          </button>
        </div>

        {waError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2 text-red-600 text-sm font-semibold">
            <AlertCircle size={16} />{waError}
            <button onClick={() => setWaError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        <div className="flex gap-6 items-start">
          {/* LEFT — Campaign list + creator */}
          <div className="w-72 shrink-0 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campañas WA</p>

            {/* Create new or edit form */}
            {(creatingNew || editingId) && (
              <form onSubmit={editingId ? handleUpdateWaCampaign : handleCreateWaCampaign} className="bg-white border-2 rounded-2xl p-4 space-y-3" style={{ borderColor: '#25D366' }}>
                <p className="text-xs font-black text-slate-700">{editingId ? 'Editar Campaña WA' : 'Nueva Campaña WA'}</p>
                <input
                  required placeholder="Nombre de campaña"
                  value={newWaName} onChange={e => setNewWaName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400"
                />
                <select
                  required value={newWaCapsuleId} onChange={e => setNewWaCapsuleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400"
                >
                  <option value="">Selecciona cápsula...</option>
                  {capsules.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <select
                  value={newWaAudienceId} onChange={e => setNewWaAudienceId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400"
                >
                  <option value="">Sin audiencia (asignar después)</option>
                  {audiencesList.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a._count?.members || 0})</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setCreatingNew(false); setEditingId(null); }} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                  <button type="submit" disabled={newWaLoading} className="flex-1 py-2 rounded-xl text-xs font-black text-white" style={{ background: '#25D366' }}>
                    {newWaLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : (editingId ? 'Guardar' : 'Crear')}
                  </button>
                </div>
              </form>
            )}

            {waLoading && !waCampaigns.length ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-green-500" size={24} /></div>
            ) : waCampaigns.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center space-y-2">
                <MessageCircle size={32} className="mx-auto text-slate-200" />
                <p className="text-xs text-slate-400 font-semibold">No hay campañas WA.<br />Crea la primera.</p>
              </div>
            ) : (
              waCampaigns.map((camp: any) => (
                <button
                  key={camp.id}
                  onClick={() => handleSelectCampaign(camp)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all group relative ${
                    selectedWaCampaign?.id === camp.id
                      ? 'border-green-400 bg-green-50/40 shadow-md shadow-green-100'
                      : 'border-slate-100 bg-white hover:border-green-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: selectedWaCampaign?.id === camp.id ? '#25D366' : '#f0fdf4' }}>
                      <MessageCircle size={16} className={selectedWaCampaign?.id === camp.id ? 'text-white' : 'text-green-500'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-800 text-xs truncate">{camp.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {camp.audienceList ? `${camp.audienceList._count?.members || 0} contactos` : 'Sin audiencia'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {camp.sentAt && <CheckCheck size={14} className="text-green-500" />}
                      {/* Hover Actions */}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-white/90 px-1 rounded-lg backdrop-blur-sm shadow-sm">
                        <div 
                          onClick={(e) => handleEditClick(e, camp)} 
                          className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </div>
                        <div 
                          onClick={(e) => handleDeleteWaCampaign(e, camp.id)} 
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* RIGHT — Editor + Send panel */}
          {selectedWaCampaign ? (
            <div className="flex-1 space-y-6 min-w-0">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Message editor */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <MessageCircle size={16} className="text-green-500" />
                      Mensaje de WhatsApp
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGenerateMessage(selectedWaCampaign.id)}
                        disabled={waLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                      >
                        {waLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} fill="currentColor" />}
                        Generar IA
                      </button>
                      <button
                        onClick={handleSaveMessage}
                        disabled={waLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} /> Guardar
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={waMessage}
                    onChange={e => setWaMessage(e.target.value)}
                    placeholder="Escribe el mensaje aquí...\n\nUsa *negritas* con asteriscos.\n{{capsuleUrl}} se reemplaza automáticamente."
                    className="w-full h-44 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono resize-none outline-none focus:border-green-400 transition-colors leading-relaxed"
                  />

                  <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <AlertCircle size={10} />
                    Usa *texto* para negritas en WhatsApp. Límite recomendado: 500 chars.
                    <span className={waMessage.length > 500 ? 'text-red-400 font-black' : 'ml-auto'}>{waMessage.length}/500</span>
                  </div>
                </div>

                {/* Live preview */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Eye size={16} className="text-slate-400" />
                    Vista Previa
                  </h3>
                  {/* WhatsApp phone mockup */}
                  <div className="rounded-3xl overflow-hidden border-4 border-slate-200 shadow-inner mx-auto" style={{ maxWidth: 280, background: '#e5ddd5' }}>
                    {/* Chat header */}
                    <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#075E54' }}>
                      <div className="w-8 h-8 rounded-full bg-green-300 flex items-center justify-center">
                        <MessageCircle size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">{selectedWaCampaign.capsule?.title || 'PitayaCore'}</p>
                        <p className="text-green-200 text-[9px]">En línea</p>
                      </div>
                    </div>
                    {/* Messages area */}
                    <div className="p-4 min-h-[140px] flex flex-col items-end gap-2">
                      {waMessage ? (
                        <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm" style={{ background: '#dcf8c6' }}>
                          <p
                            className="text-xs text-slate-800 leading-relaxed break-words"
                            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                            dangerouslySetInnerHTML={{ __html: renderPreview(waMessage.slice(0, 280) + (waMessage.length > 280 ? '...' : '')) }}
                          />
                          <p className="text-[9px] text-slate-400 mt-1 text-right">12:34 ✓✓</p>
                        </div>
                      ) : (
                        <div className="w-full text-center py-4">
                          <p className="text-xs text-slate-400 font-medium">El mensaje aparecerá aquí</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyMessage(waMessage, 'preview')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    {copiedId === 'preview' ? <><CheckCheck size={14} className="text-green-500" /> ¡Copiado!</> : <><Copy size={14} /> Copiar Mensaje</>}
                  </button>
                </div>
              </div>

              {/* Audience & Send panel */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    Envío Masivo
                    {waLinks.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: '#25D366' }}>
                        {waLinks.length} links
                      </span>
                    )}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateLinks}
                      disabled={waLinksLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#25D366', boxShadow: '0 4px 12px #25D36640' }}
                    >
                      {waLinksLoading ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                      Generar Links
                    </button>
                    {waLinks.length > 0 && (
                      <button
                        onClick={handleOpenAll}
                        disabled={waSending}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-all disabled:opacity-50"
                      >
                        <ExternalLink size={14} /> Abrir todos ({linksWithPhone})
                      </button>
                    )}
                    {waLinks.length > 0 && linksWithPhone > 0 && (
                      <button
                        onClick={handleSendAllSequential}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition-all ${waSending ? 'bg-red-500 hover:bg-red-600' : 'hover:opacity-90'}`}
                        style={waSending ? undefined : { background: '#128C7E', boxShadow: '0 4px 12px #128C7E40' }}
                        title="Abre cada chat uno por uno con pausa aleatoria de 3-7s para calentar la campaña"
                      >
                        {waSending
                          ? <><X size={14} /> Detener ({waSendProgress}/{linksWithPhone})</>
                          : <><Zap size={14} /> Enviar todos ({linksWithPhone})</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Audience info */}
                {!selectedWaCampaign.audienceId && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-700 text-xs font-semibold">
                    <AlertCircle size={14} />
                    Esta campaña no tiene audiencia asignada. Los links personalizados requieren una lista de contactos.
                  </div>
                )}

                {/* Links stats */}
                {waLinks.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-green-50 rounded-2xl text-center">
                      <p className="text-xl font-black" style={{ color: '#25D366' }}>{waLinks.length}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Links</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-2xl text-center">
                      <p className="text-xl font-black text-emerald-600">{linksWithPhone}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Con Teléfono</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-2xl text-center">
                      <p className="text-xl font-black text-amber-500">{linksNoPhone}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sin Teléfono</p>
                    </div>
                  </div>
                )}

                {/* Server-side automatic send (image + text) */}
                {waLinks.length > 0 && linksWithPhone > 0 && (
                  <div className="p-4 border border-teal-200 bg-teal-50/50 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-xs font-black text-teal-800">
                        <Zap size={14} /> Envío automático por servidor (imagen + texto)
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-teal-300 text-teal-700 cursor-pointer hover:bg-teal-50">
                          <ExternalLink size={14} />
                          {waImageName ? 'Cambiar imagen' : 'Adjuntar imagen'}
                          <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                        </label>
                        {waServerStatus?.running ? (
                          <button
                            onClick={handleStopServerSend}
                            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-red-500 hover:bg-red-600 flex items-center gap-2"
                          >
                            <X size={14} /> Detener
                          </button>
                        ) : (
                          <button
                            onClick={handleServerSend}
                            disabled={waServerStarting}
                            className="px-4 py-2 rounded-xl text-xs font-black text-white flex items-center gap-2 disabled:opacity-50"
                            style={{ background: '#128C7E', boxShadow: '0 4px 12px #128C7E40' }}
                          >
                            {waServerStarting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Enviar automático ({linksWithPhone})
                          </button>
                        )}
                      </div>
                    </div>

                    {waImage && (
                      <div className="flex items-center gap-3">
                        <img src={waImage} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-teal-200" />
                        <span className="text-xs text-slate-500 truncate flex-1">{waImageName}</span>
                        <button
                          onClick={() => { setWaImage(null); setWaImageName(''); }}
                          className="text-xs text-red-500 hover:underline font-semibold"
                        >
                          Quitar
                        </button>
                      </div>
                    )}

                    {waServerStatus?.exists && (
                      <div className="space-y-1">
                        <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-teal-100">
                          <div
                            className="h-full bg-teal-500 transition-all"
                            style={{ width: `${waServerStatus.total ? Math.round(((waServerStatus.sent + waServerStatus.failed) / waServerStatus.total) * 100) : 0}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600">
                          {waServerStatus.running
                            ? `Enviando a ${waServerStatus.current || '...'} — ✓ ${waServerStatus.sent} · ✗ ${waServerStatus.failed} de ${waServerStatus.total}`
                            : `Terminado — ✓ ${waServerStatus.sent} enviados · ✗ ${waServerStatus.failed} fallidos de ${waServerStatus.total}`}
                          {waServerStatus.skippedRecently ? ` · ⏭ ${waServerStatus.skippedRecently} omitidos (24h)` : ''}
                        </p>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400">
                      Envía directo desde la línea de WhatsApp conectada, con pausa 3-7 s entre cada uno. Úsalo con volúmenes controlados para evitar bloqueos de WhatsApp.
                    </p>
                  </div>
                )}

                {/* Contact list */}
                {waLinks.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {waLinks.map((link: any) => {
                      const initials = link.name?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';
                      return (
                        <div
                          key={link.memberId}
                          className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 hover:border-green-200 hover:bg-green-50/30 transition-all group"
                        >
                          {/* Avatar */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                            style={{ background: link.hasPhone ? '#25D366' : '#94a3b8' }}
                          >
                            {initials}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-slate-800 text-sm truncate">{link.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-medium truncate">{link.email}</span>
                              {link.hasPhone ? (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600">
                                  <Phone size={9} /> {link.phone}
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                                  <PhoneOff size={9} /> Sin teléfono
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleMarkLead(link.memberId, 'WA_INVALID')}
                              title="Marcar como número inválido / Equivocado"
                              className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <PhoneOff size={14} />
                            </button>
                            <button
                              onClick={() => handleMarkLead(link.memberId, 'UNSUBSCRIBED')}
                              title="No quiere ser molestado (Unsubscribe)"
                              className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:border-amber-300 hover:text-amber-500 hover:bg-amber-50 transition-all"
                            >
                              <UserX size={14} />
                            </button>
                            <button
                              onClick={() => handleCopyMessage(link.message, link.memberId)}
                              title="Copiar mensaje personalizado"
                              className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:border-green-300 hover:text-green-600 transition-all"
                            >
                              {copiedId === link.memberId ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                            {link.hasPhone && (() => {
                              const isSending = waSendingOneId === link.memberId;
                              const alreadySent = waSentOneIds.includes(link.memberId) || link.sentRecently;
                              return (
                                <button
                                  onClick={() => handleSendOne(link)}
                                  disabled={isSending || alreadySent}
                                  title={alreadySent
                                    ? 'Ya se envió a este contacto en las últimas 24 horas'
                                    : 'Enviar este contacto por el servidor (librería), incluye la imagen si adjuntaste una'}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                                  style={{ background: alreadySent ? '#94a3b8' : '#128C7E' }}
                                >
                                  {isSending
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : alreadySent
                                      ? <CheckCheck size={12} />
                                      : <Send size={12} />}
                                  {isSending ? 'Enviando' : alreadySent ? 'Enviado 24h' : 'Lib'}
                                </button>
                              );
                            })()}
                            <a
                              href={link.waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={link.hasPhone ? 'Abrir WhatsApp (wa.me)' : 'Abrir WhatsApp Web'}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90"
                              style={{ background: link.hasPhone ? '#25D366' : '#64748b' }}
                            >
                              <MessageCircle size={12} />
                              {link.hasPhone ? 'Enviar' : 'WA Web'}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                      <Phone size={24} className="text-green-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">Genera los links personalizados</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Cada contacto de la audiencia recibirá un link único de WhatsApp con el mensaje pre-cargado y tracking individual.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <MessageCircle size={36} className="text-green-400" />
              </div>
              <h3 className="text-xl font-black text-slate-700">Selecciona una campaña</h3>
              <p className="text-slate-400 font-medium max-w-sm">
                Elige una campaña WhatsApp de la lista o crea una nueva para comenzar a enviar mensajes personalizados.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };
  // ─── End WhatsApp Panel ────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-8 h-full overflow-auto premium-scrollbar">
      <div className="flex justify-between items-end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-[#001A41]">Campañas</h1>
            <p className="text-slate-500 font-medium">Gestiona campañas de Email y WhatsApp con inteligencia artificial.</p>
          </div>
          
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('campaigns')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'campaigns' ? 'bg-white text-[#001A41] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Mail size={13} /> Email
            </button>
            <button 
              onClick={() => setActiveTab('whatsapp')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'whatsapp' ? 'bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              style={activeTab === 'whatsapp' ? { color: '#25D366' } : {}}
            >
              <MessageCircle size={13} /> WhatsApp
            </button>
            <button 
              onClick={() => setActiveTab('audiences')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'audiences' ? 'bg-white text-[#001A41] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Audiencias
            </button>
            <button 
              onClick={() => setActiveTab('branding')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'branding' ? 'bg-white text-[#001A41] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Diseño Global
            </button>
          </div>
        </div>
        
        {activeTab === 'campaigns' && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="p-3 bg-white text-slate-400 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-[#001A41] transition-all shadow-sm"
              title="Actualizar Datos"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={() => {
                  resetCampaignForm();
                  setShowCreateModal(true);
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Plus size={20} /> Nueva Campaña Email
            </button>
          </div>
        )}
      </div>

      {activeTab === 'whatsapp' && <WhatsAppCampaignPanel />}
      {activeTab === 'audiences' && <AudienceManager />}
      {activeTab === 'campaigns' && (
        <>
          {hasError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
              <X className="bg-red-100 rounded-lg p-1" size={24} />
              Error al conectar con el servidor. Por favor, verifica tu conexión o los permisos del tenant.
            </div>
          )}

          {campaigns.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-20 text-center space-y-4">
                <div className="w-20 h-20 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center mx-auto">
                  <Mail size={40} />
                </div>
                <h3 className="text-xl font-black text-[#001A41]">Aún no tienes campañas</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto">
                  Crea tu primera campaña para enviar cápsulas interactivas a tus productores y generar leads calificados.
                </p>
                <button 
                  onClick={() => alert('Guía de campañas: 1. Selecciona una cápsula. 2. Usa el editor visual. 3. Envía.')}
                  className="text-blue-600 font-black uppercase text-xs tracking-widest mt-4 hover:text-blue-800 transition-colors"
                >
                  Aprender cómo crear una campaña
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {campaigns.map(camp => (
                <div 
                  key={camp.id} 
                  onClick={() => handleEditClick(camp)}
                  className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/5"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Send size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-[#001A41] text-lg">{camp.name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={12} /> Programada: {camp.scheduledAt ? new Date(camp.scheduledAt).toLocaleDateString() : 'Pendiente'}
                        </span>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                          {camp.sentAt ? 'Enviada' : 'Borrador Activo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-12">
                    <div className="text-center">
                      <div className="text-xl font-black text-[#001A41]">
                        {camp.audienceList 
                          ? camp.audienceList._count?.members || 0
                          : camp.audience ? camp.audience.split(/[,|\n]/).filter((e: string) => e.trim()).length : 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{camp.sentAt ? 'Enviados' : 'Destinatarios'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-[#001A41]">{camp.opensCount || 0}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aperturas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-[#001A41]">{camp.clicksCount || 0}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clics</div>
                    </div>
                    {!camp.sentAt && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendCampaign(camp.id);
                        }}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                      >
                        <Send size={14} />
                        Enviar
                      </button>
                    )}
                    {(!camp.sentAt || role?.toLowerCase() === 'system' || role?.toLowerCase() === 'admin') && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCampaign(camp.id);
                        }}
                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    {camp.sentAt ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCampaign(camp);
                          }}
                          className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#001A41] hover:text-white transition-all flex items-center gap-2"
                        >
                          <BarChart3 size={14} />
                          Estadísticas
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCampaignData({
                              id: camp.id,
                              name: camp.name,
                              subject: camp.subject,
                              capsuleId: camp.capsuleId,
                              scheduledAt: camp.scheduledAt ? new Date(camp.scheduledAt).toISOString().slice(0, 16) : '',
                              templateConfig: camp.templateConfig,
                              ctaText: (camp.templateConfig as any)?.ctaText || 'Explorar Cápsula Interactiva',
                              audience: camp.audience || '',
                              audienceId: camp.audienceId || ''
                            } as any);
                            setShowCreateModal(true);
                          }}
                          className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#001A41] hover:text-white transition-all flex items-center gap-2"
                        >
                          <Eye size={14} />
                          Diseño
                        </button>
                      </div>
                    ) : (
                      <button className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-[#001A41] group-hover:text-white transition-all">
                        <ChevronRight size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCreateModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#001A41]/40 backdrop-blur-sm">
              <div className="bg-white w-full max-w-7xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Send size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#001A41]">{(campaignData as any).id ? 'Modificar Campaña' : 'Nueva Campaña Visual'}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Editor de Plantillas AI</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateCampaign} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                  <div className="w-full lg:flex-1 p-4 lg:p-8 space-y-6 overflow-y-auto lg:overflow-auto premium-scrollbar border-b lg:border-b-0 lg:border-r border-slate-100 lg:border-slate-50">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de Campaña</label>
                        <input 
                          type="text" required placeholder="Ej: Lanzamiento Nutrición Q3"
                          value={campaignData.name} onChange={e => setCampaignData({...campaignData, name: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cápsula</label>
                        <select 
                          required value={campaignData.capsuleId} onChange={e => handleCapsuleChange(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                        >
                          <option value="">Selecciona...</option>
                          {capsules.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asunto del Email</label>
                      <input 
                        type="text" required placeholder="Ej: Optimiza tu FCA con PitayaCore"
                        value={campaignData.subject} onChange={e => setCampaignData({...campaignData, subject: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audiencia de Destino</label>
                      <select 
                        value={(campaignData as any).audienceId || ''} 
                        onChange={e => setCampaignData({...campaignData, audienceId: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 mb-2"
                      >
                        <option value="">Ingreso Manual (Usar cuadro de texto inferior)</option>
                        {audiencesList.map(a => <option key={a.id} value={a.id}>{a.name} ({a._count?.members || 0} contactos)</option>)}
                      </select>
                      
                      {!(campaignData as any).audienceId && (
                        <textarea 
                          placeholder="ejemplo@correo.com, cliente@empresa.com..."
                          value={campaignData.audience} onChange={e => setCampaignData({...campaignData, audience: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 min-h-[100px]"
                        />
                      )}
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex gap-4">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-6 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                            {(campaignData as any).id ? 'Actualizar Campaña' : 'Crear y Programar'}
                        </button>
                    </div>
                  </div>

                  <div className="flex-[2.5] flex-1 bg-slate-50 p-4 lg:p-8 overflow-hidden flex flex-col">
                     <EmailTemplateEditor 
                        blocks={emailBlocks} 
                        onChange={setEmailBlocks} 
                        branding={branding}
                        tenantId={selectedTenant?.id}
                        apiKey={flowApiKey}
                        capsuleContext={capsules.find(c => c.id === campaignData.capsuleId)}
                     />
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'branding' && (
        <div className="space-y-8">
            <div className="flex justify-end">
                <button 
                    onClick={handleSaveBranding}
                    disabled={loading}
                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50"
                >
                    <CheckCircle2 size={20} /> Guardar Configuración de Marca
                </button>
            </div>
            
            <div className="flex gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-[1.2] bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                <div className="space-y-6">
                <h3 className="text-lg font-black text-[#001A41] flex items-center gap-2">
                    <Palette className="text-blue-600" size={20} /> Identidad Visual
                </h3>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Color Primario</label>
                    <div className="flex gap-3">
                        <input type="color" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} className="w-12 h-12 rounded-xl border-0 p-0 overflow-hidden cursor-pointer shadow-sm" />
                        <input type="text" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/10 outline-none" />
                    </div>
                    </div>
                    <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Color de Acento</label>
                    <div className="flex gap-3">
                        <input type="color" value={branding.accentColor} onChange={e => setBranding({...branding, accentColor: e.target.value})} className="w-12 h-12 rounded-xl border-0 p-0 overflow-hidden cursor-pointer shadow-sm" />
                        <input type="text" value={branding.accentColor} onChange={e => setBranding({...branding, accentColor: e.target.value})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/10 outline-none" />
                    </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL del Logo (Blanco/Transparente preferido)</label>
                    <div className="flex gap-2">
                    <input type="text" value={branding.logoUrl} onChange={e => setBranding({...branding, logoUrl: e.target.value})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="https://..." />
                    <label className="bg-white border-2 border-dashed border-slate-200 p-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-all flex items-center justify-center">
                        <Plus size={20} className="text-slate-400" />
                        <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'logoUrl')} accept="image/*" />
                    </label>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Imagen Hero por Defecto</label>
                    <div className="flex gap-2">
                    <input type="text" value={branding.heroImage} onChange={e => setBranding({...branding, heroImage: e.target.value})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="URL de la imagen de cabecera..." />
                    <label className="bg-white border-2 border-dashed border-slate-200 p-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-all flex items-center justify-center">
                        <Plus size={20} className="text-slate-400" />
                        <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'heroImage')} accept="image/*" />
                    </label>
                    <button 
                        type="button"
                        onClick={handleGenerateAiImage}
                        title="Generar con Nano Banana"
                        className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg shadow-blue-500/20"
                    >
                        <Zap size={20} fill="currentColor" />
                    </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pie de Página (Copyright/Legales)</label>
                    <textarea value={branding.footerText} onChange={e => setBranding({...branding, footerText: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10 min-h-[80px]" />
                </div>
                </div>
                
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <Wand2 className="text-blue-600" size={20} />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    Esta configuración se aplicará automáticamente a todas tus campañas. Puedes sobrescribir el texto del botón y el mensaje en cada envío individual.
                </p>
                </div>
            </div>

            <div className="flex-1 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista Previa Global</h4>
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/10 overflow-hidden border border-slate-100 sticky top-8">
                    <div className="p-12 text-center space-y-6" style={{ background: `linear-gradient(135deg, ${branding.primaryColor} 0%, #054CC1 100%)` }}>
                    <img src={branding.logoUrl?.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:3014'}${branding.logoUrl}` : branding.logoUrl} alt="Logo" className="h-10 mx-auto object-contain drop-shadow-md" />
                    {branding.heroImage ? (
                        <img src={branding.heroImage.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:3014'}${branding.heroImage}` : branding.heroImage} className="w-full h-40 object-cover rounded-[2rem] shadow-lg border-2 border-white/20" alt="Hero" />
                    ) : (
                        <div className="w-full h-40 bg-white/10 rounded-[2rem] flex items-center justify-center border border-white/10">
                        <Fish size={48} className="text-white/20" />
                        </div>
                    )}
                    </div>
                    <div className="p-10 space-y-8">
                    <div className="space-y-4">
                        <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                        <div className="space-y-2">
                        <div className="h-3 bg-slate-50 rounded-full w-full" />
                        <div className="h-3 bg-slate-50 rounded-full w-full" />
                        <div className="h-3 bg-slate-50 rounded-full w-5/6" />
                        </div>
                    </div>
                    <div className="w-full py-5 rounded-2xl text-white text-center font-black uppercase text-xs tracking-[0.2em] shadow-xl" style={{ backgroundColor: branding.accentColor, boxShadow: `0 10px 20px ${branding.accentColor}33` }}>
                        Botón de Acción
                    </div>
                    <div className="pt-10 border-t border-slate-50 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        {branding.footerText}
                        </p>
                    </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
      )}

      {selectedCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#001A41]/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#001A41]">{selectedCampaign.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detalles de la Campaña</p>
                </div>
              </div>
              <button onClick={() => setSelectedCampaign(null)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</p>
                  <p className="text-sm font-black text-blue-600">{selectedCampaign.status}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enviados</p>
                  <p className="text-sm font-black text-[#001A41]">
                    {selectedCampaign.audienceList 
                      ? selectedCampaign.audienceList._count?.members || 0
                      : selectedCampaign.audience ? selectedCampaign.audience.split(/[,|\n]/).filter((e: string) => e.trim()).length : 0}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aperturas</p>
                  <p className="text-sm font-black text-[#001A41]">{selectedCampaign.opensCount || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clics</p>
                  <p className="text-sm font-black text-[#001A41]">{selectedCampaign.clicksCount || 0}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => handleSendCampaign(selectedCampaign.id)}
                  disabled={loading}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : (selectedCampaign.sentAt ? 'Re-enviar Ahora' : 'Enviar Campaña')}
                </button>
                <button
                  onClick={() => {
                    const camp = selectedCampaign;
                    setSelectedCampaign(null);
                    setCampaignData({
                      id: undefined as any,
                      name: camp.name + ' (Copia)',
                      capsuleId: camp.capsuleId,
                      subject: camp.subject,
                      description: camp.content,
                      ctaText: (camp.templateConfig as any)?.ctaText || 'Explorar Cápsula Interactiva',
                      audience: camp.audience || '',
                      audienceId: camp.audienceId || ''
                    } as any);
                    if ((camp.templateConfig as any)?.blocks) {
                      setEmailBlocks((camp.templateConfig as any).blocks);
                    } else {
                      setEmailBlocks([
                        { id: 'h1', type: 'header', content: { title: camp.name } },
                        { id: 't1', type: 'text', content: { text: camp.content } }
                      ]);
                    }
                    setShowCreateModal(true);
                  }}
                  className="flex-[1] py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-200 transition-all"
                >
                  Duplicar
                </button>
                <button onClick={() => setSelectedCampaign(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
