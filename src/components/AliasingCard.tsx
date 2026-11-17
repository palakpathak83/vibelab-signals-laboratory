import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { calculateAliasFrequency, computeNyquist, isFrequencyAliased } from '../dsp/dsp';

interface AliasingCardProps {
  f: number;
  fs: number;
  onSetAdequateFs?: (suggestedFs: number) => void;
}

export const AliasingCard: React.FC<AliasingCardProps> = ({ f, fs, onSetAdequateFs }) => {
  const nyquist = computeNyquist(fs);
  const alias = calculateAliasFrequency(f, fs);
  const isAliased = isFrequencyAliased(f, fs);
  const recommendedFs = Math.ceil(f * 2.5);

  return (
    <div
      className={`border rounded-lg p-3.5 sm:p-4 transition ${
        isAliased
          ? 'bg-[#1B2B3B] border-[#F59E0B]/80 text-[#F2F5F8]'
          : 'bg-[#1B2B3B] border-[#304357] text-[#F2F5F8]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isAliased ? (
            <div className="p-1.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-1.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase">
              {isAliased ? 'Aliasing In Effect' : 'Adequate Sampling Condition Met'}
            </h3>
            <p className="text-xs text-[#A5B2C0]">
              Nyquist-Shannon Sampling Criterion Analysis
            </p>
          </div>
        </div>

        <span
          className={`text-xs px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider ${
            isAliased
              ? 'bg-[#F59E0B] text-black'
              : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50'
          }`}
        >
          {isAliased ? 'f > fs/2' : 'fs > 2f'}
        </span>
      </div>

      {/* Numerical breakdown grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5 pt-3 border-t border-[#304357]/60">
        <div className="bg-[#0B1118] p-2 rounded border border-[#304357]/40">
          <div className="text-[10px] text-[#A5B2C0] uppercase tracking-wider font-semibold">
            Signal Freq (f)
          </div>
          <div className="text-base font-mono font-bold text-[#F2F5F8]">
            {f.toFixed(1)} <span className="text-xs font-normal text-[#A5B2C0]">Hz</span>
          </div>
        </div>

        <div className="bg-[#0B1118] p-2 rounded border border-[#304357]/40">
          <div className="text-[10px] text-[#A5B2C0] uppercase tracking-wider font-semibold">
            Sampling Rate (fs)
          </div>
          <div className="text-base font-mono font-bold text-[#13B8A6]">
            {fs.toFixed(1)} <span className="text-xs font-normal text-[#A5B2C0]">Hz</span>
          </div>
        </div>

        <div className="bg-[#0B1118] p-2 rounded border border-[#304357]/40">
          <div className="text-[10px] text-[#A5B2C0] uppercase tracking-wider font-semibold">
            Nyquist Limit (fN)
          </div>
          <div className="text-base font-mono font-bold text-[#F59E0B]">
            {nyquist.toFixed(1)} <span className="text-xs font-normal text-[#A5B2C0]">Hz</span>
          </div>
        </div>

        <div className="bg-[#0B1118] p-2 rounded border border-[#304357]/40">
          <div className="text-[10px] text-[#A5B2C0] uppercase tracking-wider font-semibold">
            Apparent / Folded (falias)
          </div>
          <div
            className={`text-base font-mono font-bold ${
              isAliased ? 'text-[#EF4444]' : 'text-[#10B981]'
            }`}
          >
            {alias.toFixed(1)} <span className="text-xs font-normal text-[#A5B2C0]">Hz</span>
          </div>
        </div>
      </div>

      {/* Folding Explanation & Formula */}
      <div className="bg-[#223447]/60 rounded p-3 text-xs leading-relaxed border border-[#304357]/40">
        <div className="flex items-center gap-1.5 text-[#13B8A6] font-semibold mb-1">
          <Info className="w-3.5 h-3.5" />
          <span>Folding Formula:</span>
          <span className="font-mono text-[#F2F5F8] ml-1 bg-[#101820] px-1.5 py-0.5 rounded">
            f_alias = |((f + fs/2) mod fs) - fs/2|
          </span>
        </div>

        {isAliased ? (
          <div className="space-y-1.5 mt-2 text-[#F2F5F8]">
            <p>
              Because the signal frequency <strong className="text-[#F59E0B]">{f} Hz</strong> exceeds the Nyquist limit{' '}
              <strong className="text-[#F59E0B]">{nyquist} Hz</strong>, the sampled discrete points cannot distinguish
              cycles between samples. The continuous tone aliases into a spurious lower frequency of{' '}
              <strong className="text-[#EF4444]">{alias} Hz</strong> in the spectrum.
            </p>
            <p className="text-[#A5B2C0]">
              In physical systems, this corruption is irreversible after discrete sampling. Hardware anti-aliasing low-pass
              filtering prior to ADC is essential.
            </p>
            {onSetAdequateFs && (
              <div className="pt-2">
                <button
                  onClick={() => onSetAdequateFs(recommendedFs)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#13B8A6] text-[#062622] font-semibold text-xs hover:bg-[#0FA08F] transition"
                >
                  <span>Resolve: Increase fs to {recommendedFs} Hz</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[#A5B2C0] mt-1">
            Condition <strong className="text-[#10B981]">fs &gt; 2 · f_max</strong> is satisfied. The discrete sequence
            faithfully retains the original frequency of <strong className="text-[#F2F5F8]">{f} Hz</strong> without
            spectral overlap into neighboring Nyquist zones.
          </p>
        )}
      </div>
    </div>
  );
};
