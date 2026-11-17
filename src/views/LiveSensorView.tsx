import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  sensorManager,
  MotionDataPoint,
  AxisSelection,
} from '../services/sensor';
import { Sample, SpectrumResult, SignalMetrics, TrialRecord } from '../types/dsp';
import {
  computeFFTSpectrum,
  calculateSignalMetrics,
  resampleNonuniform,
  generateSamplesCSV,
  triggerCSVDownload,
  computeNyquist,
} from '../dsp/dsp';
import { WaveformChart } from '../components/WaveformChart';
import { SpectrumChart } from '../components/SpectrumChart';
import { MetricsPanel } from '../components/MetricsPanel';
import { SaveTrialModal } from '../components/SaveTrialModal';
import {
  Smartphone,
  Play,
  Square,
  RefreshCw,
  Download,
  BookmarkPlus,
  ShieldAlert,
  Info,
  Activity,
  Layers,
  Radio,
} from 'lucide-react';

interface LiveSensorViewProps {
  onSaveTrial: (trial: TrialRecord) => void;
}

export const LiveSensorView: React.FC<LiveSensorViewProps> = ({ onSaveTrial }) => {
  const [isAcquiring, setIsAcquiring] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [selectedAxis, setSelectedAxis] = useState<AxisSelection>('magnitude');
  const [targetFs, setTargetFs] = useState<number>(50); // Uniform resample target
  const [detrend, setDetrend] = useState<boolean>(true);
  const [observedHz, setObservedHz] = useState<number>(0);
  const [currentReading, setCurrentReading] = useState<{
    x: number;
    y: number;
    z: number;
    mag: number;
  }>({ x: 0, y: 0, z: 0, mag: 0 });

  const [buffer, setBuffer] = useState<MotionDataPoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const { isSupported, isSecure, needsPermission } = useMemo(
    () => sensorManager.checkSupport(),
    []
  );

  // Periodic update timer to throttle React state updates to 20 fps for silky smooth rendering
  useEffect(() => {
    let interval: number;
    if (isAcquiring) {
      interval = window.setInterval(() => {
        const rawPoints = sensorManager.getBuffer();
        setBuffer(rawPoints.slice(-400)); // display last 400 points
        setObservedHz(sensorManager.getObservedFrequency());
        setIsSimulated(sensorManager.isSimulated());

        if (rawPoints.length > 0) {
          const latest = rawPoints[rawPoints.length - 1];
          setCurrentReading({
            x: latest.x,
            y: latest.y,
            z: latest.z,
            mag: latest.magnitude,
          });
        }
      }, 50);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAcquiring]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      sensorManager.stopAcquisition();
    };
  }, []);

  const handleStart = async (forceSim: boolean = false) => {
    if (needsPermission && !forceSim) {
      const granted = await sensorManager.requestPermission();
      if (!granted) {
        setInfoMessage('Sensor permission not granted. Launching test motion stream.');
        sensorManager.startAcquisition(() => {}, true);
        setIsAcquiring(true);
        setIsSimulated(true);
        return;
      }
    }

    sensorManager.startAcquisition(() => {}, forceSim);
    setIsAcquiring(true);
    setIsSimulated(sensorManager.isSimulated());
    setInfoMessage(
      forceSim
        ? 'Running Realistic Motion Generator (multi-component shake & resonance).'
        : 'Acquiring live accelerometer events from browser.'
    );
  };

  const handleStop = () => {
    sensorManager.stopAcquisition();
    setIsAcquiring(false);
  };

  // Convert buffer to selected axis samples
  const rawAxisSamples: Sample[] = useMemo(() => {
    return buffer.map((p) => ({
      t: p.t,
      y: selectedAxis === 'magnitude' ? p.magnitude : p[selectedAxis],
    }));
  }, [buffer, selectedAxis]);

  // Resample onto uniform time grid for mathematical FFT validity
  const uniformSamples: Sample[] = useMemo(() => {
    return resampleNonuniform(rawAxisSamples, targetFs);
  }, [rawAxisSamples, targetFs]);

  // Compute FFT Spectrum
  const spectrum: SpectrumResult = useMemo(() => {
    return computeFFTSpectrum(uniformSamples, targetFs, 'hann', detrend);
  }, [uniformSamples, targetFs, detrend]);

  // Compute metrics
  const metrics: SignalMetrics = useMemo(() => {
    const m = calculateSignalMetrics(uniformSamples, targetFs);
    m.dominantFreq = spectrum.dominantFreq;
    return m;
  }, [uniformSamples, targetFs, spectrum.dominantFreq]);

  // Export CSV
  const handleExport = () => {
    if (rawAxisSamples.length === 0) return;
    const csvData = generateSamplesCSV(uniformSamples, {
      source: isSimulated ? 'Simulated Sensor Test Stream' : 'Live Device Accelerometer',
      samplingRate: targetFs,
      units: 'm/s^2',
      dominantFreq: spectrum.dominantFreq,
      nyquist: computeNyquist(targetFs),
      rms: metrics.rms,
    });
    const filename = `vibelab_motion_${selectedAxis}_${Date.now()}.csv`;
    triggerCSVDownload(csvData, filename);
  };

  return (
    <div className="flex-1 p-3 sm:p-5 space-y-4 max-w-7xl mx-auto w-full">
      {/* Top Banner & Control */}
      <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#13B8A6]" />
            <h1 className="text-base sm:text-lg font-bold text-[#F2F5F8] tracking-tight">
              Live Motion & Accelerometer Capture
            </h1>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                isSimulated
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50'
                  : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50'
              }`}
            >
              {isSimulated ? 'Test Stream' : 'Hardware Sensor'}
            </span>
          </div>
          <p className="text-xs text-[#A5B2C0] mt-0.5">
            Capture device acceleration, track nonuniform timestamps, and resample onto a uniform grid for spectral analysis.
          </p>
        </div>

        {/* Start / Stop & Save Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {!isAcquiring ? (
            <>
              <button
                onClick={() => handleStart(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#13B8A6] hover:bg-[#0FA08F] text-[#062622] font-semibold text-xs transition shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Live Capture</span>
              </button>
              <button
                onClick={() => handleStart(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-[#223447] hover:bg-[#304357] text-[#F2F5F8] font-medium text-xs border border-[#304357] transition"
                title="Use realistic simulated vibration stream if physical motion sensor is unavailable"
              >
                <Radio className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Simulate Test Motion</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleStop}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white font-semibold text-xs transition shadow-sm"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Acquisition</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={uniformSamples.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-[#223447] hover:bg-[#304357] disabled:opacity-40 text-[#F2F5F8] text-xs font-medium border border-[#304357] transition"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-[#13B8A6]" />
            <span>Save Trial</span>
          </button>

          <button
            onClick={handleExport}
            disabled={uniformSamples.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-[#223447] hover:bg-[#304357] disabled:opacity-40 text-[#F2F5F8] text-xs font-medium border border-[#304357] transition"
          >
            <Download className="w-3.5 h-3.5 text-[#13B8A6]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scientific Limitation & Sensor Info Notice */}
      <div className="bg-[#223447]/50 border border-[#304357] rounded-lg p-3 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#13B8A6] shrink-0 mt-0.5" />
        <div className="space-y-1 text-[#A5B2C0]">
          <p>
            <strong className="text-[#F2F5F8]">Measurement Note:</strong> Consumer smartphone MEMS accelerometers are
            uncalibrated and subject to browser event loop scheduling jitter. Live device events arrive with nonuniform
            time gaps. VibeLab interpolates raw samples onto a uniform time grid ($f_s = {targetFs}$ Hz) before executing
            FFT analysis to preserve mathematical validity.
          </p>
        </div>
      </div>

      {/* Real-time 3-Axis Readout & Settings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {/* X Axis */}
        <div className="bg-[#1B2B3B] p-2.5 rounded border border-[#304357] flex flex-col justify-between">
          <span className="text-[10px] text-[#A5B2C0] uppercase font-semibold">X-Axis Acceleration</span>
          <div className="text-lg font-mono font-bold text-[#F2F5F8] mt-1">
            {currentReading.x.toFixed(2)}{' '}
            <span className="text-xs font-normal text-[#A5B2C0]">m/s²</span>
          </div>
        </div>

        {/* Y Axis */}
        <div className="bg-[#1B2B3B] p-2.5 rounded border border-[#304357] flex flex-col justify-between">
          <span className="text-[10px] text-[#A5B2C0] uppercase font-semibold">Y-Axis Acceleration</span>
          <div className="text-lg font-mono font-bold text-[#F2F5F8] mt-1">
            {currentReading.y.toFixed(2)}{' '}
            <span className="text-xs font-normal text-[#A5B2C0]">m/s²</span>
          </div>
        </div>

        {/* Z Axis */}
        <div className="bg-[#1B2B3B] p-2.5 rounded border border-[#304357] flex flex-col justify-between">
          <span className="text-[10px] text-[#A5B2C0] uppercase font-semibold">Z-Axis Acceleration</span>
          <div className="text-lg font-mono font-bold text-[#F2F5F8] mt-1">
            {currentReading.z.toFixed(2)}{' '}
            <span className="text-xs font-normal text-[#A5B2C0]">m/s²</span>
          </div>
        </div>

        {/* Magnitude */}
        <div className="bg-[#1B2B3B] p-2.5 rounded border border-[#304357] flex flex-col justify-between">
          <span className="text-[10px] text-[#13B8A6] uppercase font-semibold">Total Magnitude |a|</span>
          <div className="text-lg font-mono font-bold text-[#13B8A6] mt-1">
            {currentReading.mag.toFixed(2)}{' '}
            <span className="text-xs font-normal text-[#A5B2C0]">m/s²</span>
          </div>
        </div>

        {/* Observed Event Rate */}
        <div className="bg-[#1B2B3B] p-2.5 rounded border border-[#304357] flex flex-col justify-between">
          <span className="text-[10px] text-[#A5B2C0] uppercase font-semibold">Observed Event Rate</span>
          <div className="text-lg font-mono font-bold text-[#F59E0B] mt-1">
            {observedHz.toFixed(1)}{' '}
            <span className="text-xs font-normal text-[#A5B2C0]">Hz</span>
          </div>
        </div>

        {/* Buffer Count */}
        <div className="bg-[#1B2B3B] p-2.5 rounded border border-[#304357] flex flex-col justify-between">
          <span className="text-[10px] text-[#A5B2C0] uppercase font-semibold">Captured Samples</span>
          <div className="text-lg font-mono font-bold text-[#F2F5F8] mt-1">
            {buffer.length}
          </div>
        </div>
      </div>

      {/* Axis Selection & Processing Bar */}
      <div className="bg-[#1B2B3B] border border-[#304357] p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#A5B2C0] font-semibold uppercase tracking-wider text-[11px]">
            Analysis Axis:
          </span>
          <div className="flex items-center rounded bg-[#0B1118] p-0.5 border border-[#304357]">
            {(['magnitude', 'x', 'y', 'z'] as AxisSelection[]).map((axis) => (
              <button
                key={axis}
                onClick={() => setSelectedAxis(axis)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                  selectedAxis === axis
                    ? 'bg-[#13B8A6] text-[#062622] font-bold'
                    : 'text-[#A5B2C0] hover:text-white'
                }`}
              >
                {axis}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#A5B2C0] text-[11px]">Target Uniform fs:</span>
            <select
              value={targetFs}
              onChange={(e) => setTargetFs(Number(e.target.value))}
              className="bg-[#0B1118] border border-[#304357] rounded px-2 py-1 text-xs text-[#13B8A6] font-mono font-bold outline-hidden"
            >
              <option value="25">25 Hz (fN = 12.5 Hz)</option>
              <option value="50">50 Hz (fN = 25.0 Hz)</option>
              <option value="100">100 Hz (fN = 50.0 Hz)</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[#F2F5F8]">
            <input
              type="checkbox"
              checked={detrend}
              onChange={(e) => setDetrend(e.target.checked)}
              className="rounded accent-[#13B8A6]"
            />
            <span>Detrend (Subtract Gravity/DC)</span>
          </label>
        </div>
      </div>

      {/* Charts: Live Waveform & FFT Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WaveformChart
          continuousSamples={rawAxisSamples}
          sampledPoints={uniformSamples}
          title={`Motion Waveform (${selectedAxis.toUpperCase()} Axis)`}
          sourceLabel="Acceleration (m/s²)"
          effectiveFs={targetFs}
          height={280}
        />

        <SpectrumChart
          spectrum={spectrum}
          height={280}
        />
      </div>

      {/* Metrics */}
      <MetricsPanel metrics={metrics} isDetrended={detrend} />

      {/* Save Modal */}
      <SaveTrialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={onSaveTrial}
        source="live_motion"
        config={{ samplingRate: targetFs, detrend }}
        metrics={metrics}
        samples={uniformSamples}
      />
    </div>
  );
};
