import { Sample, SignalConfig, ReconstructionMethod, SpectrumResult, SignalMetrics } from '../types/dsp';

/**
 * Computes the Nyquist frequency for a given sampling rate.
 * f_Nyquist = fs / 2
 */
export function computeNyquist(fs: number): number {
  if (fs <= 0) return 0;
  return fs / 2;
}

/**
 * Calculates the exact folded alias frequency for a sinusoid of frequency f
 * sampled at frequency fs.
 * f_alias = |((f + fs/2) mod fs) - fs/2|
 */
export function calculateAliasFrequency(f: number, fs: number): number {
  if (fs <= 0) return 0;
  const halfFs = fs / 2;
  let modVal = (f + halfFs) % fs;
  if (modVal < 0) modVal += fs;
  const alias = Math.abs(modVal - halfFs);
  // Round to 4 decimal places to prevent floating point inaccuracies
  return Math.round(alias * 10000) / 10000;
}

/**
 * Determines whether a given signal frequency experiences aliasing at rate fs.
 * A component aliases if its frequency exceeds the Nyquist limit (fs / 2).
 */
export function isFrequencyAliased(f: number, fs: number): boolean {
  if (fs <= 0) return false;
  return f > (fs / 2) + 1e-6;
}

/**
 * Generates continuous synthetic reference signal and discrete sampled points.
 */
export function generateSyntheticSignal(
  config: SignalConfig,
  continuousSampleRate: number = 2000
): { continuous: Sample[]; sampled: Sample[] } {
  const { waveform, f1, a1, f2, a2, noise, dcOffset, duration, samplingRate } = config;
  const dur = Math.max(0.1, duration);
  const fs = Math.max(1, samplingRate);

  // 1. Generate high-resolution "continuous" reference (e.g. 2000 Hz)
  const numCont = Math.round(dur * continuousSampleRate);
  const continuous: Sample[] = new Array(numCont);

  // Pseudo-random Gaussian generator (Box-Muller) with seeded seed for determinism or random
  let seed = 42;
  const randomGauss = () => {
    if (noise <= 0) return 0;
    // Simple deterministic PRNG for stable simulation view
    seed = (seed * 9301 + 49297) % 233280;
    const u1 = seed / 233280;
    seed = (seed * 9301 + 49297) % 233280;
    const u2 = seed / 233280;
    const z0 = Math.sqrt(-2.0 * Math.log(u1 + 1e-12)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * noise;
  };

  const evaluateIdealAt = (t: number): number => {
    let val = 0;
    switch (waveform) {
      case 'sine':
        val = a1 * Math.sin(2 * Math.PI * f1 * t);
        break;
      case 'square':
        val = a1 * Math.sign(Math.sin(2 * Math.PI * f1 * t));
        break;
      case 'triangle': {
        const p = 1 / f1;
        const phase = (t % p) / p;
        val = a1 * (4 * Math.abs(phase - 0.5) - 1);
        break;
      }
      case 'composite':
        val = a1 * Math.sin(2 * Math.PI * f1 * t) + (a2 > 0 ? a2 * Math.sin(2 * Math.PI * f2 * t) : 0);
        break;
    }
    return val + dcOffset;
  };

  for (let i = 0; i < numCont; i++) {
    const t = i / continuousSampleRate;
    continuous[i] = {
      t,
      y: evaluateIdealAt(t) + randomGauss(),
    };
  }

  // 2. Generate discrete sampled points at analysis rate fs
  const numSampled = Math.floor(dur * fs) + 1;
  const sampled: Sample[] = new Array(numSampled);

  for (let n = 0; n < numSampled; n++) {
    const t = n / fs;
    sampled[n] = {
      t,
      y: evaluateIdealAt(t) + randomGauss(),
    };
  }

  return { continuous, sampled };
}

/**
 * Removes the DC offset / mean from an array of samples.
 */
export function detrendSignal(samples: Sample[]): Sample[] {
  if (samples.length === 0) return [];
  const mean = samples.reduce((acc, s) => acc + s.y, 0) / samples.length;
  return samples.map((s) => ({ t: s.t, y: s.y - mean }));
}

/**
 * Calculates essential scientific signal metrics.
 */
export function calculateSignalMetrics(
  samples: Sample[],
  effectiveFs: number,
  fundamentalFreq?: number
): SignalMetrics {
  const N = samples.length;
  if (N === 0) {
    return {
      rms: 0,
      peak: 0,
      peakToPeak: 0,
      mean: 0,
      energy: 0,
      power: 0,
      sampleCount: 0,
      effectiveFs,
      dominantFreq: 0,
      nyquistFreq: computeNyquist(effectiveFs),
      df: 0,
      isAliased: false,
      predictedAlias: 0,
      statusMessage: 'No samples available',
    };
  }

  let sum = 0;
  let sumSq = 0;
  let min = samples[0].y;
  let max = samples[0].y;
  let peak = Math.abs(samples[0].y);

  for (let i = 0; i < N; i++) {
    const v = samples[i].y;
    sum += v;
    sumSq += v * v;
    if (v < min) min = v;
    if (v > max) max = v;
    const absV = Math.abs(v);
    if (absV > peak) peak = absV;
  }

  const mean = sum / N;
  const rms = Math.sqrt(sumSq / N);
  const peakToPeak = max - min;
  const energy = sumSq; // E = sum |x[n]|^2
  const power = sumSq / N; // P = 1/N * sum |x[n]|^2
  const nyquistFreq = computeNyquist(effectiveFs);
  const df = N > 0 ? effectiveFs / N : 0;

  const fTarget = fundamentalFreq ?? 0;
  const isAliased = fTarget > 0 && isFrequencyAliased(fTarget, effectiveFs);
  const predictedAlias = fTarget > 0 ? calculateAliasFrequency(fTarget, effectiveFs) : 0;

  let statusMessage = 'Adequate Sampling (Nyquist satisfied)';
  if (isAliased) {
    statusMessage = `Aliasing Detected: ${fTarget.toFixed(1)} Hz folded to ${predictedAlias.toFixed(1)} Hz (Nyquist limit: ${nyquistFreq.toFixed(1)} Hz)`;
  } else if (fTarget > 0 && Math.abs(fTarget - nyquistFreq) < 1.0) {
    statusMessage = `Marginal: Frequency is very close to Nyquist limit (${nyquistFreq.toFixed(1)} Hz)`;
  }

  return {
    rms: Math.round(rms * 1000) / 1000,
    peak: Math.round(peak * 1000) / 1000,
    peakToPeak: Math.round(peakToPeak * 1000) / 1000,
    mean: Math.round(mean * 1000) / 1000,
    energy: Math.round(energy * 100) / 100,
    power: Math.round(power * 1000) / 1000,
    sampleCount: N,
    effectiveFs: Math.round(effectiveFs * 100) / 100,
    dominantFreq: 0, // Filled after FFT
    nyquistFreq: Math.round(nyquistFreq * 100) / 100,
    df: Math.round(df * 1000) / 1000,
    isAliased,
    predictedAlias: Math.round(predictedAlias * 1000) / 1000,
    statusMessage,
  };
}

/**
 * Radix-2 Cooley-Tukey In-Place FFT
 */
function radix2FFT(re: Float64Array, im: Float64Array, n: number): void {
  // Bit reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = re[i];
      re[i] = re[j];
      re[j] = tempR;
      const tempI = im[i];
      im[i] = im[j];
      im[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey iterations
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2.0 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wr = 1.0;
      let wi = 0.0;
      for (let k = 0; k < halfLen; k++) {
        const uR = re[i + k];
        const uI = im[i + k];
        const vR = re[i + k + halfLen] * wr - im[i + k + halfLen] * wi;
        const vI = re[i + k + halfLen] * wi + im[i + k + halfLen] * wr;

        re[i + k] = uR + vR;
        im[i + k] = uI + vI;
        re[i + k + halfLen] = uR - vR;
        im[i + k + halfLen] = uI - vI;

        const nextWr = wr * wStepR - wi * wStepI;
        wi = wr * wStepI + wi * wStepR;
        wr = nextWr;
      }
    }
  }
}

/**
 * Computes single-sided magnitude spectrum and PSD using Hann windowed FFT.
 */
export function computeFFTSpectrum(
  samples: Sample[],
  fs: number,
  windowType: 'hann' | 'rectangular' = 'hann',
  detrend: boolean = false
): SpectrumResult {
  const N = samples.length;
  if (N < 2 || fs <= 0) {
    return {
      frequencies: [],
      magnitudes: [],
      psd: [],
      dominantFreq: 0,
      dominantMagnitude: 0,
      nyquist: computeNyquist(fs),
      df: 0,
      nFft: 0,
    };
  }

  // Optionally detrend (remove DC)
  const processed = detrend ? detrendSignal(samples) : samples;

  // Find next power of 2 for FFT (at least N, min 64, max 2048)
  let nFft = 1;
  while (nFft < N) nFft <<= 1;
  nFft = Math.max(64, nFft);

  const re = new Float64Array(nFft);
  const im = new Float64Array(nFft);

  let windowWeightSum = 0;
  let windowPowerSum = 0;

  for (let i = 0; i < N; i++) {
    let w = 1.0;
    if (windowType === 'hann') {
      // Hann window: 0.5 * (1 - cos(2*pi*i / (N-1)))
      w = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (N - 1)));
    }
    re[i] = processed[i].y * w;
    im[i] = 0.0;
    windowWeightSum += w;
    windowPowerSum += w * w;
  }

  // Zero-pad remainder
  for (let i = N; i < nFft; i++) {
    re[i] = 0.0;
    im[i] = 0.0;
  }

  radix2FFT(re, im, nFft);

  // Single-sided spectrum: bins 0 to nFft/2
  const numBins = Math.floor(nFft / 2) + 1;
  const frequencies = new Array<number>(numBins);
  const magnitudes = new Array<number>(numBins);
  const psd = new Array<number>(numBins);

  const df = fs / nFft;
  let dominantFreq = 0;
  let dominantMagnitude = 0;

  // Window normalization factor for amplitude:
  // For amplitude, coherent gain correction is 2 / windowWeightSum (or 1/windowWeightSum for DC)
  const coherentGain = windowWeightSum > 0 ? 1 / windowWeightSum : 1 / N;

  for (let k = 0; k < numBins; k++) {
    frequencies[k] = Math.round(k * df * 100) / 100;
    const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);

    // Scale single-sided amplitude:
    // DC (k=0) and Nyquist (k=nFft/2) have weight 1; all other positive frequencies have factor 2
    const scaleFactor = (k === 0 || k === nFft / 2) ? 1.0 : 2.0;
    const peakAmp = mag * coherentGain * scaleFactor;
    magnitudes[k] = Math.round(peakAmp * 1000) / 1000;

    // Power Spectral Density (PSD) in (units)^2 / Hz
    const psdVal = (mag * mag) / (fs * (windowPowerSum > 0 ? windowPowerSum : N));
    psd[k] = Math.round(psdVal * 10000) / 10000;

    // Detect dominant frequency (ignoring DC bin if k=0)
    if (k > 0 && magnitudes[k] > dominantMagnitude) {
      dominantMagnitude = magnitudes[k];
      dominantFreq = frequencies[k];
    }
  }

  return {
    frequencies,
    magnitudes,
    psd,
    dominantFreq,
    dominantMagnitude: Math.round(dominantMagnitude * 1000) / 1000,
    nyquist: computeNyquist(fs),
    df: Math.round(df * 1000) / 1000,
    nFft,
  };
}

/**
 * Reconstructs a continuous signal from discrete samples using chosen method:
 * - 'sinc': Ideal Whittaker-Shannon interpolation formula: xr(t) = sum x[n] * sinc((t - n*Ts)/Ts)
 * - 'zoh': Zero-Order Hold (step staircase: hold value until next sample)
 * - 'foh': First-Order Hold (linear interpolation between adjacent samples)
 */
export function reconstructSignal(
  sampled: Sample[],
  method: ReconstructionMethod,
  targetTimes: number[],
  fs: number
): Sample[] {
  const N = sampled.length;
  if (N === 0) return targetTimes.map((t) => ({ t, y: 0 }));
  if (N === 1) return targetTimes.map((t) => ({ t, y: sampled[0].y }));

  const Ts = 1 / fs;
  const result: Sample[] = new Array(targetTimes.length);

  if (method === 'zoh') {
    // Zero-Order Hold: Piecewise constant
    for (let i = 0; i < targetTimes.length; i++) {
      const t = targetTimes[i];
      let val = sampled[0].y;
      for (let n = 0; n < N; n++) {
        if (sampled[n].t <= t) {
          val = sampled[n].y;
        } else {
          break;
        }
      }
      result[i] = { t, y: val };
    }
  } else if (method === 'foh') {
    // First-Order Hold: Linear interpolation
    for (let i = 0; i < targetTimes.length; i++) {
      const t = targetTimes[i];
      if (t <= sampled[0].t) {
        result[i] = { t, y: sampled[0].y };
      } else if (t >= sampled[N - 1].t) {
        result[i] = { t, y: sampled[N - 1].y };
      } else {
        // Find segment [n, n+1]
        let n = 0;
        while (n < N - 1 && sampled[n + 1].t < t) {
          n++;
        }
        const t0 = sampled[n].t;
        const t1 = sampled[n + 1].t;
        const y0 = sampled[n].y;
        const y1 = sampled[n + 1].y;
        const frac = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
        result[i] = { t, y: y0 + frac * (y1 - y0) };
      }
    }
  } else {
    // Ideal Sinc Reconstruction (Whittaker-Shannon)
    // xr(t) = sum_{n=0}^{N-1} x[n] * sinc((t - t_n) / Ts)
    for (let i = 0; i < targetTimes.length; i++) {
      const t = targetTimes[i];
      let sum = 0;
      for (let n = 0; n < N; n++) {
        const u = (t - sampled[n].t) / Ts;
        let sincVal = 1.0;
        if (Math.abs(u) > 1e-7) {
          const piU = Math.PI * u;
          sincVal = Math.sin(piU) / piU;
        }
        sum += sampled[n].y * sincVal;
      }
      result[i] = { t, y: sum };
    }
  }

  return result;
}

/**
 * Calculates Root Mean Squared Error (RMSE) between a reference signal and reconstructed signal.
 */
export function calculateRMSE(reference: Sample[], reconstructed: Sample[]): number {
  const len = Math.min(reference.length, reconstructed.length);
  if (len === 0) return 0;
  let sumSqErr = 0;
  for (let i = 0; i < len; i++) {
    const err = reference[i].y - reconstructed[i].y;
    sumSqErr += err * err;
  }
  return Math.round(Math.sqrt(sumSqErr / len) * 1000) / 1000;
}

/**
 * Resamples nonuniformly spaced samples (e.g. from live DeviceMotionEvent timestamps)
 * onto a strictly uniform time grid via linear interpolation.
 */
export function resampleNonuniform(
  rawSamples: { t: number; y: number }[],
  targetFs: number
): Sample[] {
  if (rawSamples.length < 2 || targetFs <= 0) return [];

  const tStart = rawSamples[0].t;
  const tEnd = rawSamples[rawSamples.length - 1].t;
  const totalDuration = tEnd - tStart;
  if (totalDuration <= 0) return [];

  const dt = 1 / targetFs;
  const numUniform = Math.floor(totalDuration / dt) + 1;
  const uniformSamples: Sample[] = new Array(numUniform);

  let rawIdx = 0;
  for (let i = 0; i < numUniform; i++) {
    const targetT = tStart + i * dt;

    // Advance raw index
    while (rawIdx < rawSamples.length - 2 && rawSamples[rawIdx + 1].t < targetT) {
      rawIdx++;
    }

    const s0 = rawSamples[rawIdx];
    const s1 = rawSamples[rawIdx + 1];

    if (!s1 || s1.t === s0.t) {
      uniformSamples[i] = { t: i * dt, y: s0.y };
    } else {
      const frac = Math.max(0, Math.min(1, (targetT - s0.t) / (s1.t - s0.t)));
      const interpolatedY = s0.y + frac * (s1.y - s0.y);
      uniformSamples[i] = { t: i * dt, y: interpolatedY };
    }
  }

  return uniformSamples;
}

/**
 * Exports samples to a properly formatted CSV string with metadata headers.
 */
export function generateSamplesCSV(
  samples: Sample[],
  metadata?: {
    source: string;
    samplingRate: number;
    units: string;
    dominantFreq?: number;
    nyquist?: number;
    rms?: number;
  }
): string {
  const lines: string[] = [];
  lines.push('# VibeLab — Signals & Systems Laboratory Export');
  lines.push(`# Export Timestamp: ${new Date().toISOString()}`);
  if (metadata) {
    lines.push(`# Signal Source: ${metadata.source}`);
    lines.push(`# Sampling Rate (fs): ${metadata.samplingRate} Hz`);
    lines.push(`# Units: ${metadata.units}`);
    if (metadata.nyquist) lines.push(`# Nyquist Limit (fN): ${metadata.nyquist} Hz`);
    if (metadata.dominantFreq) lines.push(`# Dominant Frequency: ${metadata.dominantFreq} Hz`);
    if (metadata.rms) lines.push(`# RMS: ${metadata.rms}`);
  }
  lines.push('Index,Time_s,Amplitude_m_per_s2');

  for (let i = 0; i < samples.length; i++) {
    lines.push(`${i},${samples[i].t.toFixed(5)},${samples[i].y.toFixed(5)}`);
  }

  return lines.join('\n');
}

/**
 * Triggers a browser file download of CSV content with auto-revoke.
 */
export function triggerCSVDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
