import React, { useRef, useState, useMemo } from 'react';
import { Sample } from '../types/dsp';
import { Maximize2, RotateCcw, Eye, Crosshair } from 'lucide-react';

interface WaveformChartProps {
  continuousSamples?: Sample[];
  sampledPoints?: Sample[];
  title?: string;
  sourceLabel?: string;
  effectiveFs?: number;
  height?: number;
}

export const WaveformChart: React.FC<WaveformChartProps> = ({
  continuousSamples = [],
  sampledPoints = [],
  title = 'Time-Domain Waveform',
  sourceLabel = 'Acceleration (m/s²)',
  effectiveFs,
  height = 280,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'both' | 'sampled' | 'continuous'>('both');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; t: number; val: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Determine bounds
  const bounds = useMemo(() => {
    let minT = Infinity;
    let maxT = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const list = continuousSamples.length > 0 ? continuousSamples : sampledPoints;

    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.t < minT) minT = p.t;
      if (p.t > maxT) maxT = p.t;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    if (minT === Infinity) {
      minT = 0;
      maxT = 1;
      minY = -1;
      maxY = 1;
    }

    // Apply zoom by narrowing maxT
    const visibleMaxT = minT + (maxT - minT) / zoomLevel;

    // Pad Y axis slightly for clean margins
    const yMargin = Math.max(0.2, (maxY - minY) * 0.15);
    return {
      minT,
      maxT: visibleMaxT,
      minY: minY - yMargin,
      maxY: maxY + yMargin,
    };
  }, [continuousSamples, sampledPoints, zoomLevel]);

  // Coordinate mapping
  const padding = { top: 24, right: 30, bottom: 36, left: 55 };
  const width = 800; // SVG viewBox width

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

  // Build SVG path for continuous line
  const continuousPath = useMemo(() => {
    if (viewMode === 'sampled' || continuousSamples.length === 0) return '';
    let d = '';
    for (let i = 0; i < continuousSamples.length; i++) {
      const p = continuousSamples[i];
      if (p.t > bounds.maxT) break;
      const x = scaleX(p.t);
      const y = scaleY(p.y);
      if (i === 0) d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      else d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }, [continuousSamples, viewMode, bounds]);

  // Filter visible sampled points
  const visibleSampled = useMemo(() => {
    if (viewMode === 'continuous') return [];
    return sampledPoints.filter((p) => p.t >= bounds.minT && p.t <= bounds.maxT);
  }, [sampledPoints, viewMode, bounds]);

  // Handle pointer hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - svgRect.left;
    const svgX = (clientX / svgRect.width) * width;

    // Find nearest point
    const activeList = sampledPoints.length > 0 ? sampledPoints : continuousSamples;
    if (activeList.length === 0) return;

    let closest = activeList[0];
    let minDiff = Infinity;
    for (let i = 0; i < activeList.length; i++) {
      const p = activeList[i];
      const diff = Math.abs(scaleX(p.t) - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }

    if (minDiff < 40) {
      setHoveredPoint({
        x: scaleX(closest.t),
        y: scaleY(closest.y),
        t: closest.t,
        val: closest.y,
      });
    } else {
      setHoveredPoint(null);
    }
  };

  // Generate grid ticks
  const yTicks = [
    bounds.minY,
    bounds.minY + (bounds.maxY - bounds.minY) * 0.25,
    bounds.minY + (bounds.maxY - bounds.minY) * 0.5,
    bounds.minY + (bounds.maxY - bounds.minY) * 0.75,
    bounds.maxY,
  ];

  const tTicks = [
    bounds.minT,
    bounds.minT + (bounds.maxT - bounds.minT) * 0.25,
    bounds.minT + (bounds.maxT - bounds.minT) * 0.5,
    bounds.minT + (bounds.maxT - bounds.minT) * 0.75,
    bounds.maxT,
  ];

  return (
    <div
      ref={containerRef}
      className="bg-[#1B2B3B] border border-[#304357] rounded-lg p-3 sm:p-4 relative flex flex-col shadow-sm"
    >
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[#304357]/60">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-[#13B8A6]" />
          <h3 className="text-sm font-semibold text-[#F2F5F8] tracking-wide uppercase">
            {title}
          </h3>
          {effectiveFs && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#223447] text-[#13B8A6] font-mono border border-[#304357]">
              fs = {effectiveFs} Hz
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex items-center rounded bg-[#223447] p-0.5 border border-[#304357]">
            <button
              onClick={() => setViewMode('both')}
              className={`px-2 py-0.5 rounded transition ${
                viewMode === 'both' ? 'bg-[#13B8A6] text-[#062622] font-semibold' : 'text-[#A5B2C0] hover:text-white'
              }`}
              title="Show both continuous reference and discrete samples"
            >
              Both
            </button>
            <button
              onClick={() => setViewMode('sampled')}
              className={`px-2 py-0.5 rounded transition ${
                viewMode === 'sampled' ? 'bg-[#F59E0B] text-black font-semibold' : 'text-[#A5B2C0] hover:text-white'
              }`}
              title="Show discrete sampled points only"
            >
              Samples
            </button>
            <button
              onClick={() => setViewMode('continuous')}
              className={`px-2 py-0.5 rounded transition ${
                viewMode === 'continuous' ? 'bg-[#13B8A6] text-[#062622] font-semibold' : 'text-[#A5B2C0] hover:text-white'
              }`}
              title="Show continuous curve only"
            >
              Wave
            </button>
          </div>

          <button
            onClick={() => setZoomLevel((z) => Math.min(4, z * 1.5))}
            className="p-1 rounded bg-[#223447] hover:bg-[#304357] text-[#A5B2C0] hover:text-white border border-[#304357]"
            title="Zoom in time"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {zoomLevel > 1 && (
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded bg-[#223447] hover:bg-[#304357] text-[#F59E0B] border border-[#304357]"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden bg-[#0B1118] rounded border border-[#304357]/60">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Horizontal Grid lines & Y axis ticks */}
          {yTicks.map((val, idx) => {
            const y = scaleY(val);
            const isZero = Math.abs(val) < 0.001;
            return (
              <g key={`y-tick-${idx}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={isZero ? '#475569' : '#1E293B'}
                  strokeWidth={isZero ? 1.2 : 0.8}
                  strokeDasharray={isZero ? undefined : '3,3'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                >
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid lines & X axis ticks */}
          {tTicks.map((val, idx) => {
            const x = scaleX(val);
            return (
              <g key={`t-tick-${idx}`}>
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
                  {val.toFixed(2)}s
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
            {sourceLabel}
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
            Time t (seconds)
          </text>

          {/* Continuous Reference Curve */}
          {continuousPath && (
            <path
              d={continuousPath}
              fill="none"
              stroke="#13B8A6"
              strokeWidth="2.0"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={viewMode === 'both' ? 0.75 : 1.0}
            />
          )}

          {/* Discrete Sampled Points (Amber Stems and Circles) */}
          {visibleSampled.map((p, idx) => {
            const cx = scaleX(p.t);
            const cy = scaleY(p.y);
            const zeroY = scaleY(0);
            return (
              <g key={`sample-${idx}`}>
                {/* Stem line from y=0 to sample point */}
                <line
                  x1={cx}
                  y1={zeroY}
                  x2={cx}
                  y2={cy}
                  stroke="#F59E0B"
                  strokeWidth="1.2"
                  opacity={0.8}
                />
                {/* Sample impulse point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.2"
                  fill="#F59E0B"
                  stroke="#101820"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}

          {/* Hover crosshair & interactive tooltip */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={height - padding.bottom}
                stroke="#F2F5F8"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill="#F2F5F8"
                stroke="#13B8A6"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Readout Overlay */}
        {hoveredPoint && (
          <div
            className="absolute top-2 right-2 bg-[#1B2B3B]/90 backdrop-blur border border-[#304357] px-2.5 py-1.5 rounded text-xs font-mono text-[#F2F5F8] pointer-events-none shadow"
          >
            <div>t: <span className="text-[#13B8A6]">{hoveredPoint.t.toFixed(4)} s</span></div>
            <div>y: <span className="text-[#F59E0B]">{hoveredPoint.val.toFixed(4)} m/s²</span></div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-2 left-16 flex items-center gap-3 text-[11px] font-medium text-[#A5B2C0] bg-[#101820]/80 px-2 py-0.5 rounded border border-[#304357]/40 pointer-events-none">
          {viewMode !== 'sampled' && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#13B8A6] inline-block rounded"></span>
              Reference x(t)
            </span>
          )}
          {viewMode !== 'continuous' && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block"></span>
              Samples x[n]
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
