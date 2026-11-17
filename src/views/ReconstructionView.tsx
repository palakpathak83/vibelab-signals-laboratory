import React, { useState, useMemo } from 'react';
import { SignalConfig, Sample } from '../types/dsp';
import { generateSyntheticSignal } from '../dsp/dsp';
import { ReconstructionChart } from '../components/ReconstructionChart';
import { Cpu, BookOpen, Layers, CheckCircle2, ArrowRight } from 'lucide-react';

export const ReconstructionView: React.FC = () => {
  const [f, setF] = useState<number>(4.0);
  const [fs, setFs] = useState<number>(20.0);
  const [duration, setDuration] = useState<number>(1.2);

  const config: SignalConfig = useMemo(
    () => ({
      waveform: 'sine',
      f1: f,
      a1: 1.2,
      f2: 0,
      a2: 0,
      noise: 0,
      dcOffset: 0,
      duration,
      samplingRate: fs,
      detrend: false,
    }),
    [f, fs, duration]
  );

  const { continuous, sampled } = useMemo(() => {
    return generateSyntheticSignal(config, 2000);
  }, [config]);

  const nyquist = fs / 2;
  const isAliased = f > nyquist;

  return (
    <div className="flex-1 p-3 sm:p-5 space-y-4 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#13B8A6]" />
            <h1 className="text-base sm:text-lg font-bold text-[#F2F5F8] tracking-tight">
              Signal Reconstruction & Hold Comparison
            </h1>
          </div>
          <p className="text-xs text-[#A5B2C0] mt-0.5">
            Unit VI Laboratory: Whittaker-Shannon Sinc Interpolation vs Zero-Order Hold (ZOH) vs First-Order Hold (FOH).
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="bg-[#0B1118] px-2.5 py-1 rounded text-[#13B8A6] border border-[#304357]">
            f = {f.toFixed(1)} Hz
          </span>
          <span className="bg-[#0B1118] px-2.5 py-1 rounded text-[#F59E0B] border border-[#304357]">
            fs = {fs.toFixed(1)} Hz (fN = {nyquist.toFixed(1)} Hz)
          </span>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Signal Frequency */}
        <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60">
          <div className="flex items-center justify-between mb-1.5 font-semibold text-[#F2F5F8]">
            <span>Signal Frequency (f)</span>
            <span className="font-mono text-[#13B8A6]">{f.toFixed(1)} Hz</span>
          </div>
          <input
            type="range"
            min="1"
            max="15"
            step="0.5"
            value={f}
            onChange={(e) => setF(Number(e.target.value))}
            className="w-full accent-[#13B8A6] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#A8B7C7] mt-1">
            <span>1.0 Hz</span>
            <span>15.0 Hz</span>
          </div>
        </div>

        {/* Sampling Frequency */}
        <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60">
          <div className="flex items-center justify-between mb-1.5 font-semibold text-[#F2F5F8]">
            <span>Sampling Rate (fs)</span>
            <span className="font-mono text-[#F59E0B]">{fs.toFixed(1)} Hz</span>
          </div>
          <input
            type="range"
            min="4"
            max="40"
            step="1"
            value={fs}
            onChange={(e) => setFs(Number(e.target.value))}
            className="w-full accent-[#F59E0B] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#A8B7C7] mt-1">
            <span>4.0 Hz (Coarse)</span>
            <span>40.0 Hz (Dense)</span>
          </div>
        </div>

        {/* Observation Window */}
        <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60">
          <div className="flex items-center justify-between mb-1.5 font-semibold text-[#F2F5F8]">
            <span>Window Duration</span>
            <span className="font-mono text-[#F2F5F8]">{duration.toFixed(1)} s</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-[#13B8A6] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#A8B7C7] mt-1">
            <span>0.5 s</span>
            <span>Samples: {sampled.length}</span>
            <span>2.5 s</span>
          </div>
        </div>
      </div>

      {/* Main Reconstruction Chart */}
      <ReconstructionChart
        continuousReference={continuous}
        sampledPoints={sampled}
        fs={fs}
      />

      {/* Detailed Mathematical & Engineering Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Whittaker-Shannon Sinc */}
        <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-[#06B6D4]">
            <CheckCircle2 className="w-4 h-4" />
            <h3 className="font-semibold text-xs uppercase tracking-wider">
              1. Whittaker-Shannon Sinc
            </h3>
          </div>
          <div className="bg-[#0B1118] p-2 rounded text-[11px] font-mono text-[#A5B2C0] border border-[#304357]/60">
            x_r(t) = ∑ x[n] · sinc((t - n·Ts)/Ts)
          </div>
          <p className="text-xs text-[#A8B7C7] leading-relaxed">
            Mathematically represents filtering through an ideal brick-wall low-pass filter with cutoff at fN = fs/2.
            When fs &gt; 2 · f_max, the continuous bandlimited signal is reconstructed with theoretical zero error.
          </p>
          <div className="text-[11px] text-[#13B8A6] font-mono">
            Transfer: H(f) = Ts · rect(f / fs)
          </div>
        </div>

        {/* First-Order Hold (FOH) */}
        <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-[#F59E0B]">
            <CheckCircle2 className="w-4 h-4" />
            <h3 className="font-semibold text-xs uppercase tracking-wider">
              2. First-Order Hold (FOH)
            </h3>
          </div>
          <div className="bg-[#0B1118] p-2 rounded text-[11px] font-mono text-[#A5B2C0] border border-[#304357]/60">
            x_r(t) = x[n] + (t - tn)/Ts · (x[n+1] - x[n])
          </div>
          <p className="text-xs text-[#A8B7C7] leading-relaxed">
            Piecewise linear interpolation connecting adjacent samples with straight line segments. Triangular time-domain impulse response.
            Produces smoother curves than ZOH, but introduces slope discontinuities at sample vertices.
          </p>
          <div className="text-[11px] text-[#F59E0B] font-mono">
            Transfer: H(f) = Ts · (sinc(f·Ts))²
          </div>
        </div>

        {/* Zero-Order Hold (ZOH) */}
        <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-[#EC4899]">
            <CheckCircle2 className="w-4 h-4" />
            <h3 className="font-semibold text-xs uppercase tracking-wider">
              3. Zero-Order Hold (ZOH)
            </h3>
          </div>
          <div className="bg-[#0B1118] p-2 rounded text-[11px] font-mono text-[#A5B2C0] border border-[#304357]/60">
            x_r(t) = x[n]  for  n·Ts ≤ t &lt; (n+1)·Ts
          </div>
          <p className="text-xs text-[#A8B7C7] leading-relaxed">
            The standard practical Digital-to-Analog Converter (DAC) output. Holds each sample voltage constant until the next clock cycle.
            Introduces sharp staircase steps, phase lag, and high-frequency spectral replicas requiring analog smoothing filters.
          </p>
          <div className="text-[11px] text-[#EC4899] font-mono">
            Transfer: H(s) = (1 - e^(-s·Ts)) / s
          </div>
        </div>
      </div>
    </div>
  );
};
