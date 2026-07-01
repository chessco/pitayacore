import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTenant } from '../../contexts/TenantContext';
import { Settings, Plus, RefreshCw, Trash2, Smartphone, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';

interface Channel {
  id: string;
  name: string;
  provider: string;
  status: string;
  defaultAgentId?: string;
}

export const CommunicationSettingsPanel: React.FC = () => {
  const { selectedTenant: tenant } = useTenant();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<Record<string, string>>({});
  const [socket, setSocket] = useState<Socket | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:2014';

  useEffect(() => {
    if (!tenant) return;
    
    // Connect to communication websocket namespace
    const newSocket = io(`${apiUrl}/communication`, {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      newSocket.emit('joinTenant', tenant.id);
    });

    newSocket.on('session.status', (data: any) => {
      setChannels(prev => prev.map(c => 
        c.id === data.channelId ? { ...c, status: data.status } : c
      ));
    });

    newSocket.on('session.qr', (data: any) => {
      setQrCodeData(prev => ({ ...prev, [data.channelId]: data.qr }));
    });

    setSocket(newSocket);
    fetchChannels();

    return () => {
      newSocket.emit('leaveTenant', tenant.id);
      newSocket.disconnect();
    };
  }, [tenant]);

  const fetchChannels = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/communication/channels`, {
        headers: { 'x-tenant-id': tenant.id }
      });
      setChannels(res.data);
    } catch (err) {
      console.error('Failed to fetch channels', err);
    } finally {
      setLoading(false);
    }
  };

  const addWhatsAppChannel = async () => {
    if (!tenant) return;
    try {
      await axios.post(`${apiUrl}/api/communication/channels`, {
        name: `WhatsApp ${channels.length + 1}`,
        provider: 'whatsapp',
      }, {
        headers: { 'x-tenant-id': tenant.id }
      });
      fetchChannels();
    } catch (err) {
      console.error('Failed to create channel', err);
    }
  };

  const removeChannel = async (id: string) => {
    if (!tenant) return;
    try {
      await axios.delete(`${apiUrl}/api/communication/channels/${id}`, {
        headers: { 'x-tenant-id': tenant.id }
      });
      fetchChannels();
    } catch (err) {
      console.error('Failed to remove channel', err);
    }
  };

  const connectSession = async (channelId: string) => {
    if (!tenant) return;
    try {
      await axios.post(`${apiUrl}/api/communication/sessions/${channelId}/initialize`, {}, {
        headers: { 'x-tenant-id': tenant.id }
      });
      fetchChannels(); // Refresh status
    } catch (err) {
      console.error('Failed to initialize session', err);
    }
  };

  const disconnectSession = async (channelId: string) => {
    if (!tenant) return;
    try {
      await axios.delete(`${apiUrl}/api/communication/sessions/${channelId}/disconnect`, {
        headers: { 'x-tenant-id': tenant.id }
      });
      setQrCodeData(prev => {
        const newData = { ...prev };
        delete newData[channelId];
        return newData;
      });
      fetchChannels(); // Refresh status
    } catch (err) {
      console.error('Failed to disconnect session', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
            <Smartphone size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Canales de Comunicación</h3>
            <p className="text-sm text-slate-500">Gestiona tus números de WhatsApp y otros canales</p>
          </div>
        </div>
        <button 
          onClick={addWhatsAppChannel}
          className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Agregar WhatsApp
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Smartphone className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>No hay canales configurados</p>
            <p className="text-sm mt-1">Haz clic en Agregar WhatsApp para conectar un número</p>
          </div>
        ) : (
          <div className="space-y-4">
            {channels.map(channel => (
              <div key={channel.id} className="border border-slate-200 rounded-xl p-5 hover:border-brand-blue/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-xl flex items-center justify-center">
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{channel.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">{channel.provider}</span>
                        <span className="text-slate-300">•</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          channel.status === 'READY' ? 'bg-green-100 text-green-700' :
                          channel.status === 'AUTHENTICATING' ? 'bg-amber-100 text-amber-700' :
                          channel.status === 'QR_READY' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {channel.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {channel.status === 'DISCONNECTED' || !channel.status ? (
                      <button 
                        onClick={() => connectSession(channel.id)}
                        className="p-2 text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 rounded-lg transition-colors"
                        title="Conectar Sesión"
                      >
                        <RefreshCw size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => disconnectSession(channel.id)}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="Desconectar Sesión"
                      >
                        <Settings size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => removeChannel(channel.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar Canal"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {channel.status === 'QR_READY' && qrCodeData[channel.id] && (
                  <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-slate-700 mb-4">Escanea este código con tu app de WhatsApp</p>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <QRCodeSVG value={qrCodeData[channel.id]} size={200} />
                    </div>
                    <p className="text-xs text-slate-500 mt-4 text-center max-w-sm">
                      Abre WhatsApp en tu teléfono {'>'} Dispositivos vinculados {'>'} Vincular un dispositivo
                    </p>
                  </div>
                )}
                
                {channel.status === 'AUTHENTICATING' && (
                  <div className="mt-6 p-6 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">Autenticando conexión...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
