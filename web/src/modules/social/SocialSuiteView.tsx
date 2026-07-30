import React, { useState } from 'react';
import { Palette, Target, Megaphone, FileText, Send, BarChart3, Brain, Flame, PlugZap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Sub Studios
import { BrandStudio } from './components/BrandStudio';
import { AudienceStudio } from './components/AudienceStudio';
import { CampaignStudio } from './components/CampaignStudio';
import { ContentStudio } from './components/ContentStudio';
import { PublisherStudio } from './components/PublisherStudio';
import { AnalyticsStudio } from './components/AnalyticsStudio';
import { OptimizationStudio } from './components/OptimizationStudio';
import { TrendStudio } from './components/TrendStudio';
import { ProviderSettings } from './components/ProviderSettings';

export default function SocialSuiteView() {
  const [activeSubTab, setActiveSubTab] = useState('brand');

  const subTabs = [
    { id: 'brand', label: 'Brand Studio', icon: Palette },
    { id: 'audience', label: 'Audience Studio', icon: Target },
    { id: 'campaign', label: 'Campaign Studio', icon: Megaphone },
    { id: 'content', label: 'Content Studio', icon: FileText },
    { id: 'publisher', label: 'Publisher Studio', icon: Send },
    { id: 'analytics', label: 'Analytics Studio', icon: BarChart3 },
    { id: 'optimization', label: 'Optimizer Studio', icon: Brain },
    { id: 'trends', label: 'Trend Studio', icon: Flame },
    { id: 'providers', label: 'Providers', icon: PlugZap },
  ];

  const renderContent = () => {
    switch (activeSubTab) {
      case 'brand':
        return <BrandStudio />;
      case 'audience':
        return <AudienceStudio />;
      case 'campaign':
        return <CampaignStudio />;
      case 'content':
        return <ContentStudio />;
      case 'publisher':
        return <PublisherStudio />;
      case 'analytics':
        return <AnalyticsStudio />;
      case 'optimization':
        return <OptimizationStudio />;
      case 'trends':
        return <TrendStudio />;
      case 'providers':
        return <ProviderSettings />;
      default:
        return <BrandStudio />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      {/* Sub Tabs Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm z-10 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative overflow-hidden cursor-pointer ${
                isActive
                  ? 'text-brand-blue bg-blue-50/50 shadow-inner'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="social-suite-active-tab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-brand-blue"
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main viewport with fade transitions */}
      <div className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
