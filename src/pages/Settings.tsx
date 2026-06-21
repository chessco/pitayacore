import React from 'react';
import { 
  Settings2, 
  Shield, 
  Key, 
  Globe, 
  Bell, 
  Users, 
  CreditCard, 
  Code,
  Check,
  ChevronRight,
  Database,
  Lock,
  Eye,
  EyeOff,
  Save,
  LogOut,
  Moon,
  Sun,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function Settings() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 font-display">Configuración</h2>
        <p className="text-base text-slate-500 mt-1 font-medium italic">Ajustes del sistema operativo e infraestructura de Inteligencia Artificial.</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Nav Sidebar */}
        <div className="col-span-12 lg:col-span-3 space-y-2">
           <SettingsNavItem icon={<Settings2 size={18} />} label="General" active />
           <SettingsNavItem icon={<Shield size={18} />} label="Seguridad y Acceso" />
           <SettingsNavItem icon={<Key size={18} />} label="API Keys y Conexiones" />
           <SettingsNavItem icon={<Bell size={18} />} label="Notificaciones" />
           <SettingsNavItem icon={<Globe size={18} />} label="Inquilinos (Tenants)" />
           <SettingsNavItem icon={<Database size={18} />} label="Almacenamiento" />
           <SettingsNavItem icon={<CreditCard size={18} />} label="Facturación" />
           
           <div className="pt-8 mt-8 border-t border-slate-100 flex flex-col gap-2">
              <button className="flex items-center gap-3 px-4 py-2.5 text-xs font-black text-error hover:bg-error-container/20 transition-all rounded-xl uppercase tracking-widest leading-none">
                 <LogOut size={18} />
                 Cerrar Sesión
              </button>
           </div>
        </div>

        {/* Content Area */}
        <div className="col-span-12 lg:col-span-9 space-y-8 pb-20">
           {/* Section 1: Security */}
           <SettingsSection title="Seguridad Global del Sistema">
              <div className="space-y-6">
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group transition-all hover:bg-white hover:shadow-lg hover:shadow-blue-500/5">
                    <div className="flex gap-4">
                       <div className="p-3 bg-white rounded-xl shadow-sm text-primary group-hover:scale-110 transition-transform">
                          <Lock size={20} />
                       </div>
                       <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors font-display">Doble Factor de Autenticación (2FA)</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1 italic">Requerido para todos los perfiles administrativos.</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                          <Check size={12} /> HABILITADO
                       </span>
                       <button className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.15em] underline underline-offset-4">Configurar</button>
                    </div>
                 </div>

                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group transition-all hover:bg-white hover:shadow-lg hover:shadow-blue-500/5">
                    <div className="flex gap-4">
                       <div className="p-3 bg-white rounded-xl shadow-sm text-amber-500 group-hover:scale-110 transition-transform">
                          <Key size={20} />
                       </div>
                       <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors font-display">Rotación de Claves API</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1 italic">Programada cada 90 días automáticamente.</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 bg-slate-200 px-2 py-1 rounded">PENDIENTE</span>
                       <button className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.15em] underline underline-offset-4">Rotar Ahora</button>
                    </div>
                 </div>
              </div>
           </SettingsSection>

           {/* Section 2: AI Config */}
           <SettingsSection title="Configuración de Motores IA">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden group">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="p-1.5 bg-blue-500 rounded-lg text-white shadow-lg shadow-blue-500/20">
                          <Code size={16} />
                       </div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Primary Model</span>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 font-display">PitayaCore Brain (v4)</h4>
                    <p className="text-sm text-slate-500 font-medium">Motor principal optimizado para decisiones biológicas.</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">ACTIVO</span>
                       <button className="text-[10px] font-black text-primary uppercase underline underline-offset-4 opacity-0 group-hover:opacity-100 transition-opacity">Testing Playground</button>
                    </div>
                    <LayoutGrid className="absolute -right-6 -bottom-6 w-20 h-20 text-slate-500/5 group-hover:scale-110 transition-transform duration-500" />
                 </div>

                 <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 hover:bg-white hover:shadow-xl transition-all relative overflow-hidden group">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="p-1.5 bg-slate-200 rounded-lg text-slate-500">
                          <Code size={16} />
                       </div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Fallback Model</span>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 font-display">GPT-4o (OpenAI)</h4>
                    <p className="text-sm text-slate-500 font-medium">Utilizado como sistema redundante ante fallos del nodo local.</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">BAJO DEMANDA</span>
                       <button className="text-[10px] font-black text-slate-400 uppercase underline underline-offset-4">Configurar Proxy</button>
                    </div>
                 </div>
              </div>
           </SettingsSection>

           {/* Form Footer */}
           <div className="flex items-center justify-end gap-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-xl shadow-black/[0.03] sticky bottom-8">
              <button className="px-6 py-2.5 text-slate-500 font-bold text-sm tracking-wide rounded-xl hover:bg-slate-50 transition-colors uppercase">Descartar</button>
              <button className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white font-black text-sm rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest">
                 <Save size={18} />
                 Guardar Cambios
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function SettingsNavItem({ icon, label, active }: any) {
   return (
      <button className={cn(
         "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all transition-duration-300",
         active 
            ? "bg-white text-primary shadow-lg shadow-blue-500/5 border border-slate-200 ring-1 ring-slate-100" 
            : "text-slate-500 hover:bg-slate-100 opacity-60 hover:opacity-100"
      )}>
         <div className="flex items-center gap-3">
            <span className={cn(active ? "text-primary scale-110 transition-transform" : "text-slate-400")}>{icon}</span>
            <span className="font-display tracking-tight leading-none px-2 uppercase text-[10px] sm:text-xs">{label}</span>
         </div>
         <ChevronRight size={14} className={cn("transition-transform", active && "rotate-90 text-primary")} />
      </button>
   );
}

function SettingsSection({ title, children }: any) {
   return (
      <div className="space-y-6">
         <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 pb-4 ml-2">{title}</h3>
         {children}
      </div>
   );
}
