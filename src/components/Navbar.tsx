import React from 'react';
import { Waves, Moon, Sun, Menu, X, ShieldAlert, Cpu } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  sourceStatus: {
    type: 'synthetic' | 'live_sensor';
    fs: number;
    nyquist: number;
    isAliased: boolean;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  isDarkTheme,
  onToggleTheme,
  isMobileMenuOpen,
  onToggleMobileMenu,
  sourceStatus,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#101820]/95 backdrop-blur border-b border-[#304357] px-4 py-2.5 flex items-center justify-between">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded text-[#A5B2C0] hover:text-white hover:bg-[#1B2B3B] transition"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#13B8A6] flex items-center justify-center text-[#062622] shadow-sm shadow-[#13B8A6]/20">
            <Waves className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-[#F2F5F8]">
                Vibe<span className="text-[#13B8A6]">Lab</span>
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#1B2B3B] text-[#13B8A6] border border-[#304357]">
                v1.0 DSP
              </span>
            </div>
            <div className="text-[10px] text-[#A5B2C0] hidden sm:block">
              Signals & Systems Laboratory
            </div>
          </div>
        </div>
      </div>

      {/* Live State Pills & Indicators */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Source Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-[#1B2B3B] border border-[#304357] px-2.5 py-1 rounded text-xs">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span className="text-[#A5B2C0]">Source:</span>
          <span className="font-mono font-medium text-[#F2F5F8] capitalize">
            {sourceStatus.type === 'synthetic' ? 'Synthetic Sim' : 'Live Motion'}
          </span>
        </div>

        {/* Nyquist Status Badge */}
        <div className="hidden md:flex items-center gap-2 bg-[#1B2B3B] border border-[#304357] px-2.5 py-1 rounded text-xs font-mono">
          <span className="text-[#A5B2C0]">fs:</span>
          <span className="text-[#13B8A6] font-semibold">{sourceStatus.fs} Hz</span>
          <span className="text-[#304357]">|</span>
          <span className="text-[#A5B2C0]">fN:</span>
          <span className="text-[#F59E0B] font-semibold">{sourceStatus.nyquist} Hz</span>
        </div>

        {/* Aliasing Status Pill */}
        {sourceStatus.isAliased ? (
          <div className="flex items-center gap-1.5 bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#EF4444] px-2 py-0.5 rounded text-[11px] font-semibold animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Aliasing Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] px-2 py-0.5 rounded text-[11px] font-medium">
            <span className="hidden xs:inline">Nyquist Met</span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-[#1B2B3B] hover:bg-[#223447] text-[#A5B2C0] hover:text-[#F2F5F8] border border-[#304357] transition"
          title={`Switch to ${isDarkTheme ? 'Light' : 'Dark'} Theme`}
          aria-label="Toggle theme"
        >
          {isDarkTheme ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#13B8A6]" />}
        </button>
      </div>
    </header>
  );
};
