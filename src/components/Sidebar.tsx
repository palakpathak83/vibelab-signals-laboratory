import React from 'react';
import {
  Activity,
  Smartphone,
  Cpu,
  FolderArchive,
  BookOpen,
  FileText,
  FlaskConical,
  HelpCircle,
} from 'lucide-react';

export type NavTab = 'lab' | 'sensor' | 'reconstruction' | 'experiments' | 'learn' | 'methodology';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  savedTrialsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  savedTrialsCount = 0,
}) => {
  const navItems = [
    {
      id: 'lab' as NavTab,
      label: 'Signal Laboratory',
      description: 'Simulator & Spectral Analysis',
      icon: Activity,
    },
    {
      id: 'sensor' as NavTab,
      label: 'Live Sensor',
      description: 'Device Accelerometer & Test Stream',
      icon: Smartphone,
    },
    {
      id: 'reconstruction' as NavTab,
      label: 'Reconstruction',
      description: 'Sinc vs ZOH vs FOH Holds',
      icon: Cpu,
    },
    {
      id: 'experiments' as NavTab,
      label: 'Experiments',
      description: 'Trial History & Comparison',
      icon: FolderArchive,
      badge: savedTrialsCount > 0 ? savedTrialsCount : undefined,
    },
    {
      id: 'learn' as NavTab,
      label: 'Learning Center',
      description: 'Signals & Systems Lessons & Quiz',
      icon: BookOpen,
    },
    {
      id: 'methodology' as NavTab,
      label: 'Methodology',
      description: 'B.Tech Architecture & Literature',
      icon: FileText,
    },
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full justify-between bg-[#101820] border-r border-[#304357] w-64 p-3 select-none">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-semibold text-[#A5B2C0] uppercase tracking-wider">
          Laboratory Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition group ${
                isActive
                  ? 'bg-[#1B2B3B] text-[#13B8A6] border border-[#13B8A6]/40 shadow-xs'
                  : 'text-[#A5B2C0] hover:text-[#F2F5F8] hover:bg-[#1B2B3B]/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition ${
                    isActive ? 'text-[#13B8A6]' : 'text-[#A5B2C0] group-hover:text-white'
                  }`}
                />
                <div className="min-w-0">
                  <div
                    className={`text-xs font-medium truncate ${
                      isActive ? 'text-[#F2F5F8] font-semibold' : ''
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="text-[10px] text-[#A8B7C7] truncate leading-tight">
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge !== undefined && (
                <span className="shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#13B8A6]/20 text-[#13B8A6] border border-[#13B8A6]/40">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="bg-[#1B2B3B]/70 border border-[#304357] rounded-lg p-3 text-[11px] text-[#A5B2C0] space-y-1.5">
        <div className="flex items-center gap-1.5 text-[#F2F5F8] font-semibold">
          <FlaskConical className="w-3.5 h-3.5 text-[#13B8A6]" />
          <span>Academic Context</span>
        </div>
        <p className="leading-snug text-[#A8B7C7]">
          Unit VI: Sampling Theorem & Aliasing. Educational engineering laboratory.
        </p>
        <div className="pt-1 text-[10px] text-[#A5B2C0] flex items-center justify-between border-t border-[#304357]/60">
          <span>Client-side DSP</span>
          <span className="font-mono text-[#13B8A6]">Pure TS / FFT</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Rail */}
      <aside className="hidden lg:block shrink-0">{content}</aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
