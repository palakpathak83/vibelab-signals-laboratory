import React, { useState, useMemo } from 'react';
import { SpectrumResult } from '../types/dsp';
import { Activity, BarChart2 } from 'lucide-react';

interface SpectrumChartProps {
  spectrum: SpectrumResult;
  targetFundamental?: number;
  height?: number;
}

export const SpectrumChart: React.FC<SpectrumChartProps> = ({
  spectrum,
  targetFundamental,
  height = 260,
}) => {
  const [scaleMode, setScaleMode] = useState<'linear' | 'log'>('linear');
  const [hoveredBin, setHoveredBin] = useState<{ freq: number; mag: number; psd: number; x: number; y: number } | null>(null);

  const { frequencies, magnitudes, psd, dominantFreq, dominantMagnitude, nyquist, df } = spectrum;

  const padding = { top: 24, right: 30, bottom: 36, left: 55 };
  const width = 800;

  // Filter up to Nyquist limit
  const visibleData = useMemo(() => {
    const list: { freq: number; mag: number; psd: number }[] = [];
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] <= nyquist * 1.05) {
        list.push({
          freq: frequencies[i],
          mag: magnitudes[i],
          psd: psd[i],
        });
      }
    }
    return list;
  }, [frequencies, magnitudes, psd, nyquist]);

  const maxFreq = nyquist > 0 ? nyquist : 25;
  const maxMag = useMemo(() => {
    let m = 0.1;
    for (const d of visibleData) {
      if (d.mag > m) m = d.mag;
    }
    return m * 1.25; // 25% headroom
  }, [visibleData]);

  const scaleX = (f: number) => {
    if (maxFreq <= 0) return padding.left;
    return padding.left + (f / maxFreq) * (width - padding.left - padding.right);
  };

  const scaleY = (m: number) => {
    if (scaleMode === 'log') {
      const minLog = -40; // dB relative to max
      const safeM = Math.max(1e-4, m);
      const db = 20 * Math.log10(safeM / Math.max(1e-3, dominantMagnitude));
      const clampedDb = Math.max(minLog, Math.min(0, db));
      const frac = (clampedDb - minLog) / -minLog;
      return height - padding.bottom - frac * (height - padding.top - padding.bottom);
    }
    const range = maxMag;
    if (range <= 0) return height - padding.bottom;
    return height - padding.bottom - (m / range) * (height - padding.top - padding.bottom);
  };

  // Build spectrum path
  const spectrumPath = useMemo(() => {
    if (visibleData.length === 0) return '';
    let d = `M ${scaleX(0).toFixed(1)} ${scaleY(0).toFixed(1)}`;
    for (let i = 0; i < visibleData.length; i++) {
      const x = scaleX(visibleData[i].freq);
      const y = scaleY(visibleData[i].mag);
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    // close along bottom
    d += ` L ${scaleX(visibleData[visibleData.length - 1].freq).toFixed(1)} ${scaleY(0).toFixed(1)} Z`;
    return d;
  }, [visibleData, maxFreq, maxMag, scaleMode]);

  // Frequency ticks
  const fTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = maxFreq <= 20 ? 5 : maxFreq <= 50 ? 10 : 20;
    for (let f = 0; f <= maxFreq; f += step) {
      ticks.push(f);
    }
    if (!ticks.includes(maxFreq)) ticks.push(maxFreq);
    return ticks;
  }, [maxFreq]);

  // Magnitude ticks
  const magTicks = useMemo(() => {
    if (scaleMode === 'log') {
      return [0, -10, -20, -30, -40]; // dB
    }
    return [0, maxMag * 0.25, maxMag * 0.5, maxMag * 0.75, maxMag];
  }, [scaleMode, maxMag]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - svgRect.left;
    const svgX = (clientX / svgRect.width) * width;

    if (visibleData.length === 0) return;

    let closest = visibleData[0];
    let minDiff = Infinity;
    for (let i = 0; i < visibleData.length; i++) {
      const p = visibleData[i];
      const diff = Math.abs(scaleX(p.freq) - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }

    if (minDiff < 30) {
      setHoveredBin({
        freq: closest.freq,
        mag: closest.mag,
        psd: closest.psd,
        x: scaleX(closest.freq),
        y: scaleY(closest.mag),
      });
    } else {
      setHoveredBin(null);
    }
  };

  const nyquistX = scaleX(nyquist);

  return (
    <div className="bg-[#1B2B3B] border border-[#304357] rounded-lg p-3 sm:p-4 relative flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[#304357]/60">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#13B8A6]" />
          <h3 className="text-sm font-semibold text-[#F2F5F8] tracking-wide uppercase">
            Frequency Spectrum (FFT)
          </h3>
          <span className="text-xs px-2 py-0.5 rounded bg-[#223447] text-[#A5B2C0] font-mono border border-[#304357]">
            Δf = {df.toFixed(3)} Hz
          </span>
        </div>

        {/* Controls & Peak indicator */}
        <div className="flex items-center gap-2 text-xs">
          {dominantFreq > 0 && (
            <span className="px-2 py-0.5 rounded bg-[#13B8A6]/20 text-[#13B8A6] font-mono font-medium border border-[#13B8A6]/40">
              Peak: {dominantFreq.toFixed(2)} Hz ({dominantMagnitude.toFixed(2)} m/s²)
            </span>
          )}

          <div className="flex items-center rounded bg-[#223447] p-0.5 border border-[#304357]">
            <button
              onClick={() => setScaleMode('linear')}
              className={`px-2 py-0.5 rounded transition ${
                scaleMode === 'linear' ? 'bg-[#13B8A6] text-[#062622] font-semibold' : 'text-[#A5B2C0] hover:text-white'
              }`}
            >
              Lin
            </button>
            <button
              onClick={() => setScaleMode('log')}
              className={`px-2 py-0.5 rounded transition ${
                scaleMode === 'log' ? 'bg-[#13B8A6] text-[#062622] font-semibold' : 'text-[#A5B2C0] hover:text-white'
              }`}
            >
              dB
            </button>
          </div>
        </div>
      </div>

      {/* SVG Spectrum */}
      <div className="relative w-full overflow-hidden bg-[#0B1118] rounded border border-[#304357]/60">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredBin(null)}
        >
          {/* Horizontal Mag Ticks */}
          {magTicks.map((val, idx) => {
            const y = scaleMode === 'log'
              ? height - padding.bottom - ((val - (-40)) / 40) * (height - padding.top - padding.bottom)
              : scaleY(val);
            return (
              <g key={`mag-tick-${idx}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth={0.8}
                  strokeDasharray="3,3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                >
                  {scaleMode === 'log' ? `${val} dB` : val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Vertical Freq Ticks */}
          {fTicks.map((val, idx) => {
            const x = scaleX(val);
            return (
              <g key={`f-tick-${idx}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#1E293B"
                  strokeWidth={0.8}
                  strokeDasharray="3,3"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                >
                  {val.toFixed(0)} Hz
                </text>
              </g>
            );
          })}

          {/* Y Axis Label */}
          <text
            x={14}
            y={height / 2}
            transform={`rotate(-90 14 ${height / 2})`}
            textAnchor="middle"
            fill="#A5B2C0"
            fontSize="10"
            fontWeight="500"
          >
            {scaleMode === 'log' ? 'Rel. Power (dB)' : 'Magnitude |X(f)| (m/s²)'}
          </text>

          {/* X Axis Label */}
          <text
            x={width / 2}
            y={height - 6}
            textAnchor="middle"
            fill="#A5B2C0"
            fontSize="10"
            fontWeight="500"
          >
            Frequency f (Hz)
          </text>

          {/* Spectrum Area Fill and Stroke */}
          {spectrumPath && (
            <path
              d={spectrumPath}
              fill="url(#spectrumGrad)"
              stroke="#13B8A6"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          )}

          {/* Nyquist Frequency Marker */}
          {nyquist > 0 && nyquist <= maxFreq && (
            <g>
              <line
                x1={nyquistX}
                y1={padding.top}
                x2={nyquistX}
                y2={height - padding.bottom}
                stroke="#F59E0B"
                strokeWidth="1.6"
                strokeDasharray="4,3"
              />
              <rect
                x={nyquistX - 40}
                y={padding.top - 18}
                width={80}
                height={16}
                rx={3}
                fill="#F59E0B"
              />
              <text
                x={nyquistX}
                y={padding.top - 6}
                textAnchor="middle"
                fill="#000000"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="JetBrains Mono"
              >
                fN = {nyquist.toFixed(1)} Hz
              </text>
            </g>
          )}

          {/* Expected fundamental marker if provided */}
          {targetFundamental && targetFundamental <= maxFreq && (
            <g>
              <line
                x1={scaleX(targetFundamental)}
                y1={padding.top + 20}
                x2={scaleX(targetFundamental)}
                y2={height - padding.bottom}
                stroke="#06B6D4"
                strokeWidth="1.0"
                strokeDasharray="2,2"
                opacity={0.6}
              />
            </g>
          )}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="spectrumGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#13B8A6" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#13B8A6" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#13B8A6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Hover indicator */}
          {hoveredBin && (
            <g>
              <line
                x1={hoveredBin.x}
                y1={padding.top}
                x2={hoveredBin.x}
                y2={height - padding.bottom}
                stroke="#F2F5F8"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />
              <circle
                cx={hoveredBin.x}
                cy={hoveredBin.y}
                r="4.5"
                fill="#F2F5F8"
                stroke="#13B8A6"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover info overlay */}
        {hoveredBin && (
          <div className="absolute top-2 right-2 bg-[#1B2B3B]/90 backdrop-blur border border-[#304357] px-2.5 py-1.5 rounded text-xs font-mono text-[#F2F5F8] pointer-events-none shadow">
            <div>f: <span className="text-[#13B8A6]">{hoveredBin.freq.toFixed(2)} Hz</span></div>
            <div>|X(f)|: <span className="text-[#F59E0B]">{hoveredBin.mag.toFixed(3)} m/s²</span></div>
            <div>PSD: <span className="text-[#94A3B8]">{hoveredBin.psd.toFixed(4)} (m/s²)²/Hz</span></div>
          </div>
        )}
      </div>
    </div>
  );
};
