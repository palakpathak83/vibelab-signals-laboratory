import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { LabView } from './views/LabView';
import { LiveSensorView } from './views/LiveSensorView';
import { ReconstructionView } from './views/ReconstructionView';
import { ExperimentsView } from './views/ExperimentsView';
import { LearnView } from './views/LearnView';
import { MethodologyView } from './views/MethodologyView';
import { TrialRecord } from './types/dsp';
import { getAllTrials } from './services/storage';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('lab');
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(true);
  const [savedTrialsCount, setSavedTrialsCount] = useState<number>(0);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('vibelab_theme');
    if (savedTheme === 'light') {
      setIsDarkTheme(false);
      document.documentElement.classList.add('light');
    } else {
      setIsDarkTheme(true);
      document.documentElement.classList.remove('light');
    }

    // Check query params for autostart / direct navigation
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as NavTab | null;
    if (
      tabParam &&
      ['lab', 'sensor', 'reconstruction', 'experiments', 'learn', 'methodology'].includes(tabParam)
    ) {
      setCurrentTab(tabParam);
    }

    // Load initial trial count
    getAllTrials().then((list) => setSavedTrialsCount(list.length));
  }, []);

  const handleToggleTheme = () => {
    setIsDarkTheme((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.remove('light');
        localStorage.setItem('vibelab_theme', 'dark');
      } else {
        document.documentElement.classList.add('light');
        localStorage.setItem('vibelab_theme', 'light');
      }
      return next;
    });
  };

  const handleTrialSaved = (trial: TrialRecord) => {
    setSavedTrialsCount((c) => c + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased">
      {/* Top Navigation Bar */}
      <Navbar
        currentView={currentTab}
        isDarkTheme={isDarkTheme}
        onToggleTheme={handleToggleTheme}
        isMobileMenuOpen={isMobileOpen}
        onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
        sourceStatus={{
          type: currentTab === 'sensor' ? 'live_sensor' : 'synthetic',
          fs: currentTab === 'sensor' ? 50 : 40,
          nyquist: currentTab === 'sensor' ? 25 : 20,
          isAliased: false,
        }}
      />

      {/* Main Workspace with Sidebar and View Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          savedTrialsCount={savedTrialsCount}
        />

        {/* View Content Area */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'lab' && (
            <LabView
              onSaveTrial={handleTrialSaved}
              onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
            />
          )}

          {currentTab === 'sensor' && (
            <LiveSensorView onSaveTrial={handleTrialSaved} />
          )}

          {currentTab === 'reconstruction' && <ReconstructionView />}

          {currentTab === 'experiments' && <ExperimentsView />}

          {currentTab === 'learn' && <LearnView />}

          {currentTab === 'methodology' && <MethodologyView />}
        </main>
      </div>
    </div>
  );
}
