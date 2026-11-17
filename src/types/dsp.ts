export interface Sample {
  t: number; // seconds
  y: number; // m/s^2 (synthetic acceleration or live motion)
}

export type SignalWaveformType = 'sine' | 'square' | 'triangle' | 'composite';

export interface SignalConfig {
  waveform: SignalWaveformType;
  f1: number; // Fundamental frequency in Hz (1 - 30 Hz)
  a1: number; // Primary amplitude in m/s^2 (0.1 - 3.0)
  f2: number; // Secondary frequency in Hz (0 - 30 Hz)
  a2: number; // Secondary amplitude in m/s^2 (0 - 3.0)
  noise: number; // Gaussian noise std deviation (0 - 0.5 m/s^2)
  dcOffset: number; // DC offset (-2.0 - 2.0 m/s^2)
  duration: number; // seconds (0.5 - 5.0 s)
  samplingRate: number; // Analysis sampling rate fs in Hz (2 - 100 Hz)
  detrend: boolean; // Subtract mean before spectral analysis
}

export type ReconstructionMethod = 'sinc' | 'zoh' | 'foh';

export interface SpectrumResult {
  frequencies: number[]; // Hz (0 to fs/2)
  magnitudes: number[]; // Amplitude (m/s^2)
  psd: number[]; // Power spectral density ((m/s^2)^2 / Hz)
  dominantFreq: number; // Frequency with peak magnitude
  dominantMagnitude: number;
  nyquist: number; // fs / 2
  df: number; // Frequency resolution fs / N
  nFft: number; // FFT size
}

export interface SignalMetrics {
  rms: number; // Root Mean Square
  peak: number; // Peak absolute amplitude
  peakToPeak: number; // Max - min
  mean: number; // Average
  energy: number; // Finite-window energy E = sum |x[n]|^2
  power: number; // Finite-window average power P = (1/N) * sum |x[n]|^2
  sampleCount: number;
  effectiveFs: number; // Effective sampling rate
  dominantFreq: number;
  nyquistFreq: number;
  df: number;
  isAliased: boolean;
  predictedAlias: number;
  statusMessage: string;
}

export interface TrialRecord {
  id: string;
  timestamp: number;
  title: string;
  source: 'synthetic' | 'live_motion';
  config: Partial<SignalConfig>;
  metrics: SignalMetrics;
  notes: string;
  sampleCount: number;
  duration: number;
  samples?: Sample[];
}

export interface PresetExperiment {
  id: string;
  name: string;
  category: 'Adequate' | 'Marginal' | 'Aliased' | 'Composite' | 'Noisy';
  description: string;
  config: SignalConfig;
  learningFocus: string;
}
