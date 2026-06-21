import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Mail, Users, BarChart3, Settings, Zap, ArrowLeft, Menu, X, Brain } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export const CapsuleStudioLayout: React.FC = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  
  const menuItems = [
    { icon: LayoutGrid, label: 'Cápsulas', path: '/app/capsules' },
    { icon: Mail, label: 'Campañas', path: '/app/capsules/campaigns' },
    { icon: Users, label: 'Leads', path: '/app/capsules/leads' },
    { icon: BarChart3, label: 'Analytics', path: '/app/capsules/analytics' },
    { icon: Brain, label: 'Agentes', path: '/app/capsules/agents' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row relative">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#001A41] rounded-lg flex items-center justify-center text-white">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="text-base font-black tracking-tight text-[#001A41]">Studio</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[50] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-100 flex flex-col z-[60] 
        transition-transform duration-300 md:translate-x-0 md:static
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#001A41] rounded-xl flex items-center justify-center text-white">
              <Zap size={22} fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-[#001A41]">Studio</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Motor de Crecimiento</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-50">
          <Link to="/app" className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
            <ArrowLeft size={20} />
            Volver a Pitayacore
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

