import React, { useState, useMemo } from 'react';
import { Sample, ReconstructionMethod } from '../types/dsp';
import { reconstructSignal, calculateRMSE } from '../dsp/dsp';
import { Cpu, Info, Check, RefreshCw } from 'lucide-react';

interface ReconstructionChartProps {
  continuousReference: Sample[];
  sampledPoints: Sample[];
  fs: number;
}

export const ReconstructionChart: React.FC<ReconstructionChartProps> = ({
  continuousReference,
  sampledPoints,
  fs,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ReconstructionMethod | 'all'>('all');

  const padding = { top: 20, right: 24, bottom: 36, left: 50 };
  const width = 800;
  const height = 260;

  // Evaluation points matching continuous times
  const evalTimes = useMemo(() => {
    return continuousReference.map((s) => s.t);
  }, [continuousReference]);

  // Compute reconstructions
  const sincSignal = useMemo(() => {
    return reconstructSignal(sampledPoints, 'sinc', evalTimes, fs);
  }, [sampledPoints, evalTimes, fs]);

  const zohSignal = useMemo(() => {
    return reconstructSignal(sampledPoints, 'zoh', evalTimes, fs);
  }, [sampledPoints, evalTimes, fs]);

  const fohSignal = useMemo(() => {
    return reconstructSignal(sampledPoints, 'foh', evalTimes, fs);
  }, [sampledPoints, evalTimes, fs]);

  // Compute RMSE
  const sincRMSE = useMemo(() => calculateRMSE(continuousReference, sincSignal), [continuousReference, sincSignal]);
  const zohRMSE = useMemo(() => calculateRMSE(continuousReference, zohSignal), [continuousReference, zohSignal]);
  const fohRMSE = useMemo(() => calculateRMSE(continuousReference, fohSignal), [continuousReference, fohSignal]);

  // Coordinate scales
  const bounds = useMemo(() => {
    let minT = 0;
    let maxT = 1;
    let minY = -1;
    let maxY = 1;
    for (const p of continuousReference) {
      if (p.t > maxT) maxT = p.t;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const margin = Math.max(0.2, (maxY - minY) * 0.15);
    return { minT, maxT, minY: minY - margin, maxY: maxY + margin };
  }, [continuousReference]);

  const scaleX = (t: number) => {
    const range = bounds.maxT - bounds.minT;
    if (range <= 0) return padding.left;
    return padding.left + ((t - bounds.minT) / range) * (width - padding.left - padding.right);
  };

  const scaleY = (y: number) => {
    const range = bounds.maxY - bounds.minY;
    if (range <= 0) return height / 2;
    return height - padding.bottom - ((y - bounds.minY) / range) * (height - padding.top - padding.bottom);
  };

  const makePath = (samples: Sample[]) => {
    if (samples.length === 0) return '';
    let d = `M ${scaleX(samples[0].t).toFixed(1)} ${scaleY(samples[0].y).toFixed(1)}`;
    for (let i = 1; i < samples.length; i++) {
      d += ` L ${scaleX(samples[i].t).toFixed(1)} ${scaleY(samples[i].y).toFixed(1)}`;
    }
    return d;
  };

  const refPath = useMemo(() => makePath(continuousReference), [continuousReference, bounds]);
  const sincPath = useMemo(() => makePath(sincSignal), [sincSignal, bounds]);
  const zohPath = useMemo(() => makePath(zohSignal), [zohSignal, bounds]);
  const fohPath = useMemo(() => makePath(fohSignal), [fohSignal, bounds]);

  return (
    <div className="bg-[#1B2B3B] border border-[#304357] rounded-lg p-3.5 sm:p-4 shadow-sm flex flex-col gap-3">
      {/* Header and selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#304357]/60">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#13B8A6]" />
          <h3 className="text-sm font-semibold text-[#F2F5F8] tracking-wide uppercase">
            Signal Reconstruction & Hold Analysis
          </h3>
        </div>

        {/* Method selector */}
        <div className="flex items-center rounded bg-[#223447] p-0.5 border border-[#304357] text-xs">
          <button
            onClick={() => setSelectedMethod('all')}
            className={`px-2.5 py-1 rounded transition ${
              selectedMethod === 'all' ? 'bg-[#13B8A6] text-[#062622] font-bold' : 'text-[#A5B2C0] hover:text-white'
            }`}
          >
            Compare All
          </button>
          <button
            onClick={() => setSelectedMethod('sinc')}
            className={`px-2.5 py-1 rounded transition ${
              selectedMethod === 'sinc' ? 'bg-[#06B6D4] text-black font-bold' : 'text-[#A5B2C0] hover:text-white'
            }`}
          >
            Ideal Sinc
          </button>
          <button
            onClick={() => setSelectedMethod('foh')}
            className={`px-2.5 py-1 rounded transition ${
              selectedMethod === 'foh' ? 'bg-[#F59E0B] text-black font-bold' : 'text-[#A5B2C0] hover:text-white'
            }`}
          >
            First-Order (FOH)
          </button>
          <button
            onClick={() => setSelectedMethod('zoh')}
            className={`px-2.5 py-1 rounded transition ${
              selectedMethod === 'zoh' ? 'bg-[#EC4899] text-white font-bold' : 'text-[#A5B2C0] hover:text-white'
            }`}
          >
            Zero-Order (ZOH)
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden bg-[#0B1118] rounded border border-[#304357]/60">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none block">
          {/* Grid lines */}
          {[-1, -0.5, 0, 0.5, 1].map((tick) => {
            const y = scaleY(tick);
            return (
              <line
                key={tick}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={tick === 0 ? '#475569' : '#1E293B'}
                strokeWidth={tick === 0 ? 1.0 : 0.6}
                strokeDasharray={tick === 0 ? undefined : '3,3'}
              />
            );
          })}

          {/* Reference Signal (Muted White/Gray Dashed) */}
          <path
            d={refPath}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.2"
            strokeDasharray="4,3"
            opacity={0.6}
          />

          {/* Zero-Order Hold (Staircase Pink/Magenta) */}
          {(selectedMethod === 'all' || selectedMethod === 'zoh') && (
            <path
              d={zohPath}
              fill="none"
              stroke="#EC4899"
              strokeWidth="1.8"
              opacity={selectedMethod === 'zoh' ? 1.0 : 0.75}
            />
          )}

          {/* First-Order Hold (Linear Amber) */}
          {(selectedMethod === 'all' || selectedMethod === 'foh') && (
            <path
              d={fohPath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.0"
              opacity={selectedMethod === 'foh' ? 1.0 : 0.8}
            />
          )}

          {/* Ideal Sinc Interpolation (Cyan/Teal) */}
          {(selectedMethod === 'all' || selectedMethod === 'sinc') && (
            <path
              d={sincPath}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="2.2"
              opacity={selectedMethod === 'sinc' ? 1.0 : 0.9}
            />
          )}

          {/* Sample impulses */}
          {sampledPoints.map((p, idx) => (
            <circle
              key={idx}
              cx={scaleX(p.t)}
              cy={scaleY(p.y)}
              r="3.5"
              fill="#F59E0B"
              stroke="#101820"
              strokeWidth="1.5"
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-3 bg-[#101820]/85 backdrop-blur px-2.5 py-1 rounded border border-[#304357]/60 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-[#94A3B8]">
            <span className="w-3 h-0.5 border-t border-dashed border-[#94A3B8] inline-block"></span>
            Ideal Reference
          </span>
          <span className="flex items-center gap-1.5 text-[#06B6D4]">
            <span className="w-3 h-0.5 bg-[#06B6D4] inline-block"></span>
            Sinc Interpolation
          </span>
          <span className="flex items-center gap-1.5 text-[#F59E0B]">
            <span className="w-3 h-0.5 bg-[#F59E0B] inline-block"></span>
            FOH (Linear)
          </span>
          <span className="flex items-center gap-1.5 text-[#EC4899]">
            <span className="w-3 h-0.5 bg-[#EC4899] inline-block"></span>
            ZOH (Staircase)
          </span>
        </div>
      </div>

      {/* RMSE Error Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        {/* Sinc Card */}
        <div
          className={`p-2.5 rounded border transition ${
            selectedMethod === 'sinc' || selectedMethod === 'all'
              ? 'bg-[#0B1118] border-[#06B6D4]/50'
              : 'bg-[#0B1118]/50 border-[#304357]/40 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[#06B6D4] font-semibold">
            <span>Ideal Sinc (Whittaker-Shannon)</span>
            <span className="font-mono text-xs">RMSE: {sincRMSE.toFixed(4)}</span>
          </div>
          <p className="text-[11px] text-[#A8B7C7] mt-1 leading-snug">
            Bandlimited sinc kernel interpolation: perfectly recovers bandlimited signals when fs &gt; 2 · f_max.
          </p>
        </div>

        {/* FOH Card */}
        <div
          className={`p-2.5 rounded border transition ${
            selectedMethod === 'foh' || selectedMethod === 'all'
              ? 'bg-[#0B1118] border-[#F59E0B]/50'
              : 'bg-[#0B1118]/50 border-[#304357]/40 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[#F59E0B] font-semibold">
            <span>First-Order Hold (FOH)</span>
            <span className="font-mono text-xs">RMSE: {fohRMSE.toFixed(4)}</span>
          </div>
          <p className="text-[11px] text-[#A8B7C7] mt-1 leading-snug">
            Piecewise linear connection between samples; simple but produces triangular slope discontinuities.
          </p>
        </div>

        {/* ZOH Card */}
        <div
          className={`p-2.5 rounded border transition ${
            selectedMethod === 'zoh' || selectedMethod === 'all'
              ? 'bg-[#0B1118] border-[#EC4899]/50'
              : 'bg-[#0B1118]/50 border-[#304357]/40 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[#EC4899] font-semibold">
            <span>Zero-Order Hold (ZOH)</span>
            <span className="font-mono text-xs">RMSE: {zohRMSE.toFixed(4)}</span>
          </div>
          <p className="text-[11px] text-[#A8B7C7] mt-1 leading-snug">
            Standard DAC staircase output holding constant value between clock periods; introduces high-frequency harmonics.
          </p>
        </div>
      </div>
    </div>
  );
};
