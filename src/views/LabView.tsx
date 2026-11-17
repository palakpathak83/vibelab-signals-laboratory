import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SignalConfig,
  Sample,
  SpectrumResult,
  SignalMetrics,
  TrialRecord,
} from '../types/dsp';
import {
  generateSyntheticSignal,
  calculateSignalMetrics,
  computeFFTSpectrum,
  generateSamplesCSV,
  triggerCSVDownload,
  calculateAliasFrequency,
  computeNyquist,
} from '../dsp/dsp';
import { SignalControls } from '../components/SignalControls';
import { WaveformChart } from '../components/WaveformChart';
import { SpectrumChart } from '../components/SpectrumChart';
import { AliasingCard } from '../components/AliasingCard';
import { MetricsPanel } from '../components/MetricsPanel';
import { SaveTrialModal } from '../components/SaveTrialModal';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  BookmarkPlus,
  Sliders,
  CheckCircle,
} from 'lucide-react';

interface LabViewProps {
  onSaveTrial: (trial: TrialRecord) => void;
  onNavigateTab: (tab: string) => void;
}

export const LabView: React.FC<LabViewProps> = ({ onSaveTrial, onNavigateTab }) => {
  // Main signal configuration state
  const [config, setConfig] = useState<SignalConfig>({
    waveform: 'sine',
    f1: 5.0,
    a1: 1.5,
    f2: 12.0,
    a2: 0.6,
    noise: 0.05,
    dcOffset: 0.0,
    duration: 1.5,
    samplingRate: 40,
    detrend: false,
  });

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generate continuous and discrete samples
  const { continuous, sampled } = useMemo(() => {
    return generateSyntheticSignal(config, 2000);
  }, [config]);

  // Compute FFT spectrum
  const spectrum: SpectrumResult = useMemo(() => {
    return computeFFTSpectrum(sampled, config.samplingRate, 'hann', config.detrend);
  }, [sampled, config.samplingRate, config.detrend]);

  // Compute metrics
  const metrics: SignalMetrics = useMemo(() => {
    const rawMetrics = calculateSignalMetrics(sampled, config.samplingRate, config.f1);
    rawMetrics.dominantFreq = spectrum.dominantFreq;
    return rawMetrics;
  }, [sampled, config.samplingRate, config.f1, spectrum.dominantFreq]);

  // Handle Preset Selection
  const handleApplyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'adequate':
        setConfig({
          waveform: 'sine',
          f1: 5.0,
          a1: 1.5,
          f2: 0,
          a2: 0,
          noise: 0.02,
          dcOffset: 0,
          duration: 1.5,
          samplingRate: 40,
          detrend: false,
        });
        showToast('Applied Adequate Sampling Preset (5 Hz tone @ 40 Hz sampling)');
        break;
      case 'aliasing':
        setConfig({
          waveform: 'sine',
          f1: 15.0,
          a1: 1.5,
          f2: 0,
          a2: 0,
          noise: 0.02,
          dcOffset: 0,
          duration: 1.5,
          samplingRate: 20, // Nyquist is 10 Hz; 15 Hz folds to 5 Hz!
          detrend: false,
        });
        showToast('Applied Aliasing Demo Preset (15 Hz tone @ 20 Hz sampling -> folds to 5 Hz)');
        break;
      case 'near_nyquist':
        setConfig({
          waveform: 'sine',
          f1: 10.0,
          a1: 1.5,
          f2: 0,
          a2: 0,
          noise: 0.02,
          dcOffset: 0,
          duration: 1.5,
          samplingRate: 25, // Nyquist is 12.5 Hz
          detrend: false,
        });
        showToast('Applied Near Nyquist Preset (10 Hz tone @ 25 Hz sampling)');
        break;
      case 'composite':
        setConfig({
          waveform: 'composite',
          f1: 4.0,
          a1: 1.2,
          f2: 12.0,
          a2: 0.6,
          noise: 0.05,
          dcOffset: 0,
          duration: 1.5,
          samplingRate: 35,
          detrend: false,
        });
        showToast('Applied Composite Vibration Preset (4 Hz + 12 Hz)');
        break;
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const csvData = generateSamplesCSV(sampled, {
      source: `Synthetic Generator (${config.waveform})`,
      samplingRate: config.samplingRate,
      units: 'm/s^2',
      dominantFreq: spectrum.dominantFreq,
      nyquist: computeNyquist(config.samplingRate),
      rms: metrics.rms,
    });
    const filename = `vibelab_sim_${config.waveform}_${config.f1}Hz_fs${config.samplingRate}Hz_${Date.now()}.csv`;
    triggerCSVDownload(csvData, filename);
    showToast(`Exported ${sampled.length} samples to CSV`);
  };

  return (
    <div className="flex-1 p-3 sm:p-5 space-y-4 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#13B8A6] text-[#062622] font-semibold text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Lab Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1B2B3B] border border-[#304357] p-3.5 rounded-lg">
        <div>
          <h1 className="text-lg font-bold text-[#F2F5F8] tracking-tight">
            Signal Laboratory & Spectrum Analyzer
          </h1>
          <p className="text-xs text-[#A5B2C0]">
            Generate synthetic vibration signals, evaluate discrete sampling intervals, and inspect spectral folding.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
              isRunning
                ? 'bg-[#223447] text-[#F2F5F8] hover:bg-[#304357] border border-[#304357]'
                : 'bg-[#13B8A6] text-[#062622] hover:bg-[#0FA08F]'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Sim' : 'Resume Sim'}</span>
          </button>

          <button
            onClick={() => handleApplyPreset('adequate')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#223447] hover:bg-[#304357] text-[#A5B2C0] hover:text-white text-xs border border-[#304357] transition"
            title="Reset parameters to adequate defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#13B8A6] hover:bg-[#0FA08F] text-[#062622] text-xs font-semibold transition shadow-xs"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save Trial</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#223447] hover:bg-[#304357] text-[#F2F5F8] text-xs font-medium border border-[#304357] transition"
          >
            <Download className="w-3.5 h-3.5 text-[#13B8A6]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Aliasing Indicator / Scientific Banner */}
      <AliasingCard
        f={config.f1}
        fs={config.samplingRate}
        onSetAdequateFs={(suggestedFs) => {
          setConfig((prev) => ({ ...prev, samplingRate: suggestedFs }));
          showToast(`Sampling frequency updated to ${suggestedFs} Hz (Nyquist limit: ${suggestedFs / 2} Hz)`);
        }}
      />

      {/* Signal Generator Controls */}
      <SignalControls
        config={config}
        onChange={setConfig}
        onApplyPreset={handleApplyPreset}
      />

      {/* Main Charts Grid: Waveform & Frequency Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Time-Domain Waveform */}
        <WaveformChart
          continuousSamples={continuous}
          sampledPoints={sampled}
          title="Time-Domain Signal x(t) & x[n]"
          sourceLabel="Acceleration (m/s²)"
          effectiveFs={config.samplingRate}
          height={280}
        />

        {/* Frequency Spectrum FFT */}
        <SpectrumChart
          spectrum={spectrum}
          targetFundamental={config.f1}
          height={280}
        />
      </div>

      {/* Scientific Metrics Panel */}
      <MetricsPanel metrics={metrics} isDetrended={config.detrend} />

      {/* Save Trial Modal */}
      <SaveTrialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={(trial) => {
          onSaveTrial(trial);
          showToast(`Trial "${trial.title}" successfully saved to local database!`);
        }}
        source="synthetic"
        config={config}
        metrics={metrics}
        samples={sampled}
      />
    </div>
  );
};
