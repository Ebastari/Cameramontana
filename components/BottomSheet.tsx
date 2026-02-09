
import React, { useState, Suspense, lazy } from 'react';
import { PlantEntry, GpsLocation, FormState } from '../types';
import { FormTab } from './FormTab';
import { DataTab } from './DataTab';

const AnalyticsTab = lazy(() => import('./AnalyticsTab').then(m => ({ default: m.AnalyticsTab })));
const SettingsTab = lazy(() => import('./SettingsTab').then(m => ({ default: m.SettingsTab })));
const OnlineDashboardTab = lazy(() => import('./OnlineDashboardTab').then(m => ({ default: m.OnlineDashboardTab })));

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  entries: PlantEntry[];
  formState: FormState;
  onFormStateChange: React.Dispatch<React.SetStateAction<FormState>>;
  onClearData: () => void;
  appsScriptUrl: string;
  onAppsScriptUrlChange: (url: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  gps: GpsLocation | null;
  onGpsUpdate: (gps: GpsLocation) => void;
  onSyncPending: () => Promise<void>;
  isOnline: boolean;
}

const TabLoader = () => (
  <div className="flex flex-col gap-4 py-10 animate-pulse px-6">
    <div className="h-48 w-full bg-slate-100 rounded-[2.5rem]" />
    <div className="h-32 w-full bg-slate-100 rounded-[2rem]" />
  </div>
);

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen, onClose, entries, formState, onFormStateChange, onClearData, appsScriptUrl, onAppsScriptUrlChange, onSyncPending, isOnline
}) => {
  const [activeTab, setActiveTab] = useState('form');

  return (
    <div 
      className={`fixed inset-0 z-40 transition-all duration-500 ease-in-out ${isOpen ? 'bg-black/70 backdrop-blur-sm opacity-100' : 'bg-transparent opacity-0 pointer-events-none'}`} 
      onClick={onClose}
    >
      <div
        className={`absolute bottom-0 left-0 right-0 h-[94vh] bg-white rounded-t-[50px] shadow-[0_-30px_60px_-15px_rgba(0,0,0,0.5)] transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="w-full py-5 flex items-center justify-center flex-shrink-0 group focus:outline-none"
        >
          <div className="h-1.5 w-14 bg-slate-200 rounded-full group-hover:bg-slate-300 transition-all" />
        </button>

        <div className="px-6 pb-6">
          <nav className="flex items-center bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
            {[
              { id: 'form', label: '📝 Input' },
              { id: 'grafik', label: '📊 Analitik' },
              { id: 'data', label: '💾 Histori' },
              { id: 'dashboard', label: '☁️ Cloud' },
              { id: 'pengaturan', label: '⚙️' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`flex-1 min-w-[90px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-6">
          <Suspense fallback={<TabLoader />}>
            {activeTab === 'form' && <FormTab formState={formState} onFormStateChange={onFormStateChange} />}
            {activeTab === 'grafik' && <AnalyticsTab entries={entries} appsScriptUrl={appsScriptUrl} isOnline={isOnline} />}
            {activeTab === 'data' && <DataTab entries={entries} isOnline={isOnline} onSyncPending={onSyncPending} />}
            {activeTab === 'dashboard' && <OnlineDashboardTab appsScriptUrl={appsScriptUrl} isOnline={isOnline} />}
            {activeTab === 'pengaturan' && <SettingsTab appsScriptUrl={appsScriptUrl} onAppsScriptUrlChange={onAppsScriptUrlChange} entries={entries} onClearData={onClearData} />}
          </Suspense>
        </div>
      </div>
    </div>
  );
};
