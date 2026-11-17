import React from 'react';
import { SignalConfig, SignalWaveformType } from '../types/dsp';
import { Sliders, Sparkles, RefreshCw, Zap } from 'lucide-react';

interface SignalControlsProps {
  config: SignalConfig;
  onChange: (newConfig: SignalConfig) => void;
  onApplyPreset: (presetKey: string) => void;
}

export const SignalControls: React.FC<SignalControlsProps> = ({
  config,
  onChange,
  onApplyPreset,
}) => {
  const updateField = <K extends keyof SignalConfig>(key: K, value: SignalConfig[K]) => {
    onChange({
      ...config,
      [key]: value,
    });
  };

  return (
    <div className="bg-[#1B2B3B] border border-[#304357] rounded-lg p-3.5 sm:p-4 shadow-sm flex flex-col gap-4">
      {/* Top Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#304357]/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#13B8A6]" />
          <h3 className="text-sm font-semibold text-[#F2F5F8] tracking-wide uppercase">
            Signal Generator & Sampling Controls
          </h3>
        </div>

        {/* Quick Presets bar */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-[#A5B2C0] flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-[#F59E0B]" /> Presets:
          </span>
          <button
            onClick={() => onApplyPreset('adequate')}
            className="px-2 py-1 rounded bg-[#223447] hover:bg-[#13B8A6]/20 hover:text-[#13B8A6] text-[#F2F5F8] text-[11px] border border-[#304357] transition"
            title="5 Hz tone @ 40 Hz sampling rate (Adequate)"
          >
            Adequate (5Hz@40Hz)
          </button>
          <button
            onClick={() => onApplyPreset('aliasing')}
            className="px-2 py-1 rounded bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/30 text-[11px] font-medium border border-[#F59E0B]/40 transition"
            title="15 Hz tone @ 20 Hz sampling rate (Folded to 5 Hz)"
          >
            Aliasing Demo (15Hz@20Hz)
          </button>
          <button
            onClick={() => onApplyPreset('near_nyquist')}
            className="px-2 py-1 rounded bg-[#223447] hover:bg-[#304357] text-[#F2F5F8] text-[11px] border border-[#304357] transition"
            title="10 Hz tone @ 25 Hz sampling rate"
          >
            Near Nyquist (10Hz@25Hz)
          </button>
          <button
            onClick={() => onApplyPreset('composite')}
            className="px-2 py-1 rounded bg-[#223447] hover:bg-[#304357] text-[#F2F5F8] text-[11px] border border-[#304357] transition"
            title="Multi-frequency vibration"
          >
            Composite (4Hz+12Hz)
          </button>
        </div>
      </div>

      {/* Waveform Selector */}
      <div>
        <label className="text-xs text-[#A5B2C0] font-semibold uppercase tracking-wider block mb-1.5">
          Waveform Type
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['sine', 'square', 'triangle', 'composite'] as SignalWaveformType[]).map((wf) => (
            <button
              key={wf}
              onClick={() => updateField('waveform', wf)}
              className={`py-1.5 px-2 rounded text-xs font-medium uppercase tracking-wider transition border ${
                config.waveform === wf
                  ? 'bg-[#13B8A6] text-[#062622] border-[#13B8A6] font-bold shadow-sm'
                  : 'bg-[#0B1118] text-[#A5B2C0] border-[#304357] hover:border-[#13B8A6]/50 hover:text-white'
              }`}
            >
              {wf}
            </button>
          ))}
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Sampling Rate fs */}
        <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[#F2F5F8]">Sampling Rate (fs)</span>
            <span className="font-mono text-[#13B8A6] font-bold bg-[#1B2B3B] px-2 py-0.5 rounded border border-[#304357]">
              {config.samplingRate} Hz
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="100"
            step="1"
            value={config.samplingRate}
            onChange={(e) => updateField('samplingRate', Number(e.target.value))}
            className="w-full accent-[#13B8A6] cursor-pointer mt-2"
          />
          <div className="flex justify-between text-[10px] text-[#A8B7C7] mt-1">
            <span>2 Hz (Under)</span>
            <span>Nyquist limit: {(config.samplingRate / 2).toFixed(1)} Hz</span>
            <span>100 Hz</span>
          </div>
        </div>

        {/* Fundamental Frequency f1 */}
        <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[#F2F5F8]">Fundamental Freq (f1)</span>
            <span className="font-mono text-[#F59E0B] font-bold bg-[#1B2B3B] px-2 py-0.5 rounded border border-[#304357]">
              {config.f1.toFixed(1)} Hz
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="0.5"
            value={config.f1}
            onChange={(e) => updateField('f1', Number(e.target.value))}
            className="w-full accent-[#F59E0B] cursor-pointer mt-2"
          />
          <div className="flex justify-between text-[10px] text-[#A8B7C7] mt-1">
            <span>1.0 Hz</span>
            <span>T = {(1 / config.f1).toFixed(3)} s</span>
            <span>30.0 Hz</span>
          </div>
        </div>

        {/* Primary Amplitude a1 */}
        <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[#F2F5F8]">Primary Amplitude (A1)</span>
            <span className="font-mono text-[#F2F5F8] font-bold bg-[#1B2B3B] px-2 py-0.5 rounded border border-[#304357]">
              {config.a1.toFixed(2)} m/s²
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={config.a1}
            onChange={(e) => updateField('a1', Number(e.target.value))}
            className="w-full accent-[#13B8A6] cursor-pointer mt-2"
          />
          <div className="flex justify-between text-[10px] text-[#A8B7C7] mt-1">
            <span>0.1 m/s²</span>
            <span>Theoretical RMS: {(config.a1 / Math.SQRT2).toFixed(2)}</span>
            <span>3.0 m/s²</span>
          </div>
        </div>

        {/* Secondary Frequency f2 (Active for Composite) */}
        <div
          className={`bg-[#0B1118] p-3 rounded border border-[#304357]/60 flex flex-col justify-between ${
            config.waveform !== 'composite' ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[#F2F5F8]">2nd Harmonic (f2)</span>
            <span className="font-mono text-[#06B6D4] font-bold bg-[#1B2B3B] px-2 py-0.5 rounded border border-[#304357]">
              {config.f2.toFixed(1)} Hz
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={config.f2}
            onChange={(e) => updateField('f2', Number(e.target.value))}
            className="w-full accent-[#06B6D4] cursor-pointer mt-2"
          />
          <div className="flex justify-between text-[10px] text-[#A8B7C7] mt-1">
            <span>0 Hz</span>
            <span>Amplitude A2: {config.a2.toFixed(1)} m/s²</span>
            <span>30 Hz</span>
          </div>
        </div>

        {/* Noise Level */}
        <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[#F2F5F8]">Gaussian Noise (σ)</span>
            <span className="font-mono text-[#F2F5F8] font-bold bg-[#1B2B3B] px-2 py-0.5 rounded border border-[#304357]">
              {config.noise.toFixed(2)} m/s²
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.02"
            value={config.noise}
            onChange={(e) => updateField('noise', Number(e.target.value))}
            className="w-full accent-[#13B8A6] cursor-pointer mt-2"
          />
          <div className="flex justify-between text-[10px] text-[#A8B7C7] mt-1">
            <span>0 (Pure)</span>
            <span>SNR simulation</span>
            <span>0.5 m/s²</span>
          </div>
        </div>

        {/* Duration & Options */}
        <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[#F2F5F8]">Duration Window</span>
            <span className="font-mono text-[#F2F5F8] font-bold bg-[#1B2B3B] px-2 py-0.5 rounded border border-[#304357]">
              {config.duration.toFixed(1)} s
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="4.0"
            step="0.5"
            value={config.duration}
            onChange={(e) => updateField('duration', Number(e.target.value))}
            className="w-full accent-[#13B8A6] cursor-pointer mt-2"
          />
          <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-[#304357]/40">
            <label className="flex items-center gap-1.5 cursor-pointer text-[#F2F5F8]">
              <input
                type="checkbox"
                checked={config.detrend}
                onChange={(e) => updateField('detrend', e.target.checked)}
                className="rounded accent-[#13B8A6]"
              />
              <span>Detrend (Remove Mean)</span>
            </label>
            <span className="text-[#A5B2C0]">
              Total N: {Math.round(config.duration * config.samplingRate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
