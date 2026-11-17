import React from 'react';
import {
  FileText,
  Layers,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  Cpu,
} from 'lucide-react';

export const MethodologyView: React.FC = () => {
  const literature = [
    {
      topic: 'Sampling & Reconstruction',
      concept: 'Whittaker-Shannon Sampling Theorem & Sinc Interpolation',
      relevance: 'Provides mathematical guarantee for lossless discrete sampling when fs > 2 fmax.',
      citation: 'Shannon, C. E. (1949). "Communication in the presence of noise". Proc. IRE, 37(1), 10–21.',
      limitation: 'Assumes strictly bandlimited continuous signals and infinite sinc convolution kernels.',
    },
    {
      topic: 'Nyquist Rate',
      concept: 'Maximum Signaling Rate & Intersymbol Boundaries',
      relevance: 'Establishes minimum pulse rate fs = 2 B required to reconstruct continuous waveforms.',
      citation: 'Nyquist, H. (1928). "Certain topics in telegraph transmission theory". Trans. AIEE, 47, 617–644.',
      limitation: 'Does not account for non-ideal analog filter roll-off in practical anti-aliasing stages.',
    },
    {
      topic: 'Fast Fourier Transform',
      concept: 'Radix-2 Cooley-Tukey Divide-and-Conquer Algorithm',
      relevance: 'Computes Discrete Fourier Transform in O(N log N) enabling real-time browser spectrum calculation.',
      citation: 'Cooley, J. W., & Tukey, J. W. (1965). "An algorithm for the machine calculation of complex Fourier series". Math. Comput., 19(90), 297–301.',
      limitation: 'Requires sample lengths of power-of-two (N = 2^k) or zero-padding.',
    },
    {
      topic: 'Windowing & Leakage',
      concept: 'Discrete Window Functions & Coherent Gain Correction',
      relevance: 'Hann windowing suppresses spectral leakage caused by non-integer cycle truncation.',
      citation: 'Harris, F. J. (1978). "On the use of windows for harmonic analysis with the discrete Fourier transform". Proc. IEEE, 66(1), 51–83.',
      limitation: 'Windowing broadens the mainlobe width, slightly degrading effective frequency resolution Δf.',
    },
    {
      topic: 'Digital Signal Processing',
      concept: 'Discrete-Time Systems, DTFT & Frequency Analysis',
      relevance: 'Foundational framework for all metrics (RMS, Parseval energy, frequency-domain scaling).',
      citation: 'Oppenheim, A. V., & Schafer, R. W. (2009). Discrete-Time Signal Processing (3rd ed.). Prentice Hall.',
      limitation: 'Theoretical formulations assume infinite-precision floating point calculations.',
    },
    {
      topic: 'Browser Motion API',
      concept: 'W3C DeviceMotionEvent & Accelerometer Capture',
      relevance: 'Provides client-side access to smartphone 3-axis accelerometer data.',
      citation: 'W3C (2016). DeviceOrientation and DeviceMotion Event Specification. W3C Working Draft.',
      limitation: 'Subject to browser event scheduling jitter, non-uniform timestamps, and permission restrictions.',
    },
  ];

  return (
    <div className="flex-1 p-3 sm:p-5 space-y-4 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#13B8A6]" />
            <h1 className="text-base sm:text-lg font-bold text-[#F2F5F8] tracking-tight">
              Project Methodology & Academic Architecture
            </h1>
          </div>
          <p className="text-xs text-[#A5B2C0] mt-0.5">
            Academic report documentation for B.Tech Computer Science / Data Science & AI Signals and Systems Coursework.
          </p>
        </div>

        <span className="text-xs px-2.5 py-1 rounded bg-[#0B1118] text-[#13B8A6] font-mono border border-[#304357]">
          B.Tech S&S · Unit VI Spec
        </span>
      </div>

      {/* Problem Definition & System Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Problem Definition */}
        <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg space-y-2.5">
          <h2 className="text-sm font-bold text-[#F2F5F8] uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#13B8A6]" />
            <span>1. Problem Definition & Objectives</span>
          </h2>
          <p className="text-xs text-[#A8B7C7] leading-relaxed">
            Understanding the Nyquist-Shannon sampling theorem, aliasing mechanisms, and frequency-domain representations
            is often hindered by abstract blackboard equations. VibeLab bridges this gap by providing an interactive,
            computationally rigorous laboratory that unifies synthetic wave generation with real physical smartphone
            accelerometer motion.
          </p>
          <div className="space-y-1 text-xs text-[#F2F5F8]">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Rigorous client-side DSP with zero mock values</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Explicit aliasing folded frequency calculation: f_alias = |((f + fs/2) mod fs) - fs/2|</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Real-time Sinc, ZOH, and FOH reconstruction comparison with RMSE quantification</span>
            </div>
          </div>
        </div>

        {/* System Architecture */}
        <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg space-y-2.5">
          <h2 className="text-sm font-bold text-[#F2F5F8] uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#13B8A6]" />
            <span>2. System Architecture & Processing Pipeline</span>
          </h2>
          <div className="bg-[#0B1118] p-3 rounded-lg border border-[#304357]/60 text-[11px] font-mono text-[#A5B2C0] space-y-1.5">
            <div className="text-[#13B8A6]">Input Layer:</div>
            <div className="pl-3">↳ Synthetic Generator (Sine/Square/Triangle/Composite) OR DeviceMotionEvent</div>
            <div className="text-[#F59E0B]">DSP Preprocessing:</div>
            <div className="pl-3">↳ Nonuniform Timestamp Resampling → Mean Detrending → Hann Windowing</div>
            <div className="text-[#06B6D4]">Spectral Analysis Engine:</div>
            <div className="pl-3">↳ Cooley-Tukey Radix-2 FFT → Coherent Gain Correction → Single-Sided Spectrum</div>
            <div className="text-[#10B981]">Presentation & Persistence:</div>
            <div className="pl-3">↳ SVG Waveforms & Spectrum → IndexedDB Local Storage → CSV Serialization</div>
          </div>
        </div>
      </div>

      {/* Literature Review Table */}
      <div className="bg-[#1B2B3B] border border-[#304357] rounded-lg p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[#304357]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#13B8A6]" />
            <h2 className="text-sm font-bold text-[#F2F5F8] uppercase tracking-wider">
              3. Literature Review & Theoretical Foundations
            </h2>
          </div>
          <span className="text-[10px] text-[#A5B2C0]">Verifiable Academic Citations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0B1118] text-[#A5B2C0] uppercase text-[10px] tracking-wider border-b border-[#304357]">
              <tr>
                <th className="p-2.5">Domain</th>
                <th className="p-2.5">Core Concept</th>
                <th className="p-2.5">Relevance to VibeLab</th>
                <th className="p-2.5">Formal Source</th>
                <th className="p-2.5">Engineering Limitation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#304357]/60 text-[#F2F5F8]">
              {literature.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#223447]/60 transition">
                  <td className="p-2.5 font-semibold text-[#13B8A6]">{item.topic}</td>
                  <td className="p-2.5 text-[#F2F5F8]">{item.concept}</td>
                  <td className="p-2.5 text-[#A5B2C0] leading-snug">{item.relevance}</td>
                  <td className="p-2.5 font-mono text-[11px] text-[#94A3B8] italic">{item.citation}</td>
                  <td className="p-2.5 text-[11px] text-[#A8B7C7]">{item.limitation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scientific Limitations & Non-Certified Disclaimer */}
      <div className="bg-[#0B1118] border border-[#EF4444]/40 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-[#EF4444] font-bold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" />
          <span>4. Scientific Limitations & Non-Certified Instrument Disclaimer</span>
        </div>
        <div className="text-xs text-[#A5B2C0] space-y-1.5 leading-relaxed">
          <p>
            <strong className="text-[#F2F5F8]">Educational Prototype Status:</strong> VibeLab is engineered strictly
            for Signals & Systems academic education, laboratory demonstration, and signal-processing workflows. It is
            <strong> not</strong> a certified seismic instrument, industrial vibration monitoring tool, or structural
            health diagnostic system.
          </p>
          <p>
            <strong className="text-[#F2F5F8]">Hardware Limitations:</strong> Smartphone accelerometers use low-cost
            consumer MEMS chips with uncalibrated offset errors, cross-axis sensitivity, and unknown internal anti-aliasing
            filter profiles. Browser-level event listeners deliver data asynchronously on the main thread, introducing
            timing jitter. Resampling onto a uniform time grid mitigates but cannot eliminate underlying hardware timing
            variance.
          </p>
        </div>
      </div>
    </div>
  );
};
