import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Inbox, 
  BrainCircuit, 
  Zap, 
  BookOpen, 
  Users, 
  BarChart3, 
  Bell, 
  Settings, 
  Search,
  Droplets,
  ChevronDown,
  Plus,
  LogOut,
  HelpCircle,
  FileText,
  Workflow,
  Activity,
  Dna,
  ScanEye,
  Megaphone
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Panel Control', path: '/' },
  { icon: Inbox, label: 'Bandeja', path: '/inbox' },
  { icon: Activity, label: 'Hub Predictivo', path: '/predictive' },
  { icon: Dna, label: 'Arq. Protocolos', path: '/protocols' },
  { icon: ScanEye, label: 'Lab Visión', path: '/vision' },
  { icon: BrainCircuit, label: 'HITL', path: '/hitl' },
  { icon: Zap, label: 'Habilidades', path: '/skills' },
  { icon: BookOpen, label: 'Conocimiento', path: '/knowledge' },
  { icon: Megaphone, label: 'Campañas', path: '/campaigns' },
  { icon: Users, label: 'Inquilinos', path: '/tenants' },
  { icon: BarChart3, label: 'Analíticas', path: '/analytics' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg">
            <Droplets size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">PitayaCore AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Operaciones</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-white text-primary shadow-sm ring-1 ring-slate-200 font-bold" 
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <item.icon size={20} className={cn(location.pathname === item.path && "text-primary")} />
              <span className="font-display">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-1">
          <button className="w-full mb-4 py-2.5 px-4 bg-primary text-white font-semibold rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm">
            <Workflow size={16} />
            Soporte AI
          </button>
          <NavLink
            to="/docs"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 text-sm font-medium"
          >
            <FileText size={20} />
            <span>Documentación</span>
          </NavLink>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-error hover:bg-error-container/20 text-sm font-medium transition-colors">
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2 py-1">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBn20QnVrczCw256p3rwaJ1C__uXhIJ7zONqXj8RhMhXYU4DxiGYQCUTlEI_9QvbXfJxhvrnYnLJ3TGI6kyE8w0ljF7l0sNKZ20ojzYhARaAcabMhIqPi87IgMSWFG4x07922AT2luc-lcY_E4R22Htj2Y4uzlF5MHJeFei_5Rj6-bbwTFKmjq9eCBffFWohtOiMjLxV7R6UQDNOjH4Rj0WOwfYDuRdtGgGLVSNMHXQXcPW3M20DoHMjZ6CWMObx68MLbRTRcXK2Q" 
              alt="Profile" 
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">Carlos Méndez</p>
              <p className="text-xs text-slate-500 truncate">Admin Soporte</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex-1 max-w-md">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar conversaciones, inquilinos..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all font-sans"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95">
                <Bell size={20} />
              </button>
              <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95">
                <HelpCircle size={20} />
              </button>
              <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95">
                <Settings size={20} />
              </button>
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-1" />

            <button className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-sm">
              Seleccionar Inquilino
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto relative">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-8 max-w-7xl mx-auto w-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
      
      {/* Floating Action Button (Optional, can be contextual) */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center z-50 hover:brightness-110"
      >
        <Plus size={32} />
      </motion.button>
    </div>
  );
}
