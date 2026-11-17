import React from 'react';
import { SignalMetrics } from '../types/dsp';
import { Gauge, Zap, BarChart, Sliders } from 'lucide-react';

interface MetricsPanelProps {
  metrics: SignalMetrics;
  isDetrended?: boolean;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics, isDetrended }) => {
  return (
    <div className="bg-[#1B2B3B] border border-[#304357] rounded-lg p-3 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#304357]/60">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#13B8A6]" />
          <h3 className="text-sm font-semibold text-[#F2F5F8] tracking-wide uppercase">
            Signal Metrics & Statistics
          </h3>
        </div>
        {isDetrended && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#223447] text-[#13B8A6] font-mono border border-[#304357]">
            Detrended (Zero-Mean)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {/* RMS */}
        <div className="bg-[#0B1118] p-2.5 rounded border border-[#304357]/40">
          <div className="flex items-center justify-between text-[10px] text-[#A5B2C0] uppercase font-semibold">
            <span>RMS</span>
            <span className="text-[9px] lowercase font-normal">m/s²</span>
          </div>
          <div className="text-lg font-mono font-bold text-[#F2F5F8] mt-0.5">
            {metrics.rms.toFixed(3)}
          </div>
          <div className="text-[9px] text-[#A8B7C7] truncate">Root-mean-square</div>
        </div>

        {/* Peak Amplitude */}
        <div className="bg-[#0B1118] p-2.5 rounded border border-[#304357]/40">
          <div className="flex items-center justify-between text-[10px] text-[#A5B2C0] uppercase font-semibold">
            <span>Peak |x|</span>
            <span className="text-[9px] lowercase font-normal">m/s²</span>
          </div>
          <div className="text-lg font-mono font-bold text-[#13B8A6] mt-0.5">
            {metrics.peak.toFixed(3)}
          </div>
          <div className="text-[9px] text-[#A8B7C7] truncate">Max absolute</div>
        </div>

        {/* Peak-to-Peak */}
        <div className="bg-[#0B1118] p-2.5 rounded border border-[#304357]/40">
          <div className="flex items-center justify-between text-[10px] text-[#A5B2C0] uppercase font-semibold">
            <span>Peak-to-Peak</span>
            <span className="text-[9px] lowercase font-normal">m/s²</span>
          </div>
          <div className="text-lg font-mono font-bold text-[#F2F5F8] mt-0.5">
            {metrics.peakToPeak.toFixed(3)}
          </div>
          <div className="text-[9px] text-[#A8B7C7] truncate">Max - Min span</div>
        </div>

        {/* Mean / DC */}
        <div className="bg-[#0B1118] p-2.5 rounded border border-[#304357]/40">
          <div className="flex items-center justify-between text-[10px] text-[#A5B2C0] uppercase font-semibold">
            <span>Mean (DC)</span>
            <span className="text-[9px] lowercase font-normal">m/s²</span>
          </div>
          <div className="text-lg font-mono font-bold text-[#A5B2C0] mt-0.5">
            {metrics.mean.toFixed(3)}
          </div>
          <div className="text-[9px] text-[#A8B7C7] truncate">Average level</div>
        </div>

        {/* Window Energy */}
        <div className="bg-[#0B1118] p-2.5 rounded border border-[#304357]/40">
          <div className="flex items-center justify-between text-[10px] text-[#A5B2C0] uppercase font-semibold">
            <span>Energy (E)</span>
            <span className="text-[9px] font-normal text-[#13B8A6]">Σ|x[n]|²</span>
          </div>
          <div className="text-lg font-mono font-bold text-[#F59E0B] mt-0.5">
            {metrics.energy.toFixed(1)}
          </div>
          <div className="text-[9px] text-[#A8B7C7] truncate">Window sum</div>
        </div>

        {/* Average Power */}
        <div className="bg-[#0B1118] p-2.5 rounded border border-[#304357]/40">
          <div className="flex items-center justify-between text-[10px] text-[#A5B2C0] uppercase font-semibold">
            <span>Power (P)</span>
            <span className="text-[9px] font-normal text-[#13B8A6]">1/N Σ|x|²</span>
          </div>
          <div className="text-lg font-mono font-bold text-[#F2F5F8] mt-0.5">
            {metrics.power.toFixed(3)}
          </div>
          <div className="text-[9px] text-[#A8B7C7] truncate">Average power</div>
        </div>
      </div>

      {/* Sampling Parameters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-[#304357]/40 text-xs text-[#A5B2C0]">
        <div className="flex items-center gap-4">
          <div>
            Samples (N): <strong className="text-[#F2F5F8] font-mono">{metrics.sampleCount}</strong>
          </div>
          <div>
            Effective fs: <strong className="text-[#13B8A6] font-mono">{metrics.effectiveFs} Hz</strong>
          </div>
          <div>
            Frequency Res (Δf): <strong className="text-[#F2F5F8] font-mono">{metrics.df.toFixed(3)} Hz</strong>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#A8B7C7]">Status:</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
              metrics.isAliased
                ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
            }`}
          >
            {metrics.statusMessage}
          </span>
        </div>
      </div>
    </div>
  );
};
