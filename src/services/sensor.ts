import { Sample } from '../types/dsp';

export interface MotionDataPoint {
  timestamp: number; // ms
  t: number; // s relative to start
  x: number; // m/s^2
  y: number; // m/s^2
  z: number; // m/s^2
  magnitude: number; // m/s^2
  includesGravity: boolean;
}

export type AxisSelection = 'x' | 'y' | 'z' | 'magnitude';

export interface SensorStatus {
  isSupported: boolean;
  isSecure: boolean;
  hasPermission: boolean | null; // null = unrequested
  permissionError: string | null;
  isAcquiring: boolean;
  isSimulatedFallback: boolean;
  observedHz: number;
  sampleCount: number;
}

export class MotionSensorManager {
  private isAcquiring: boolean = false;
  private isSimulatedFallback: boolean = false;
  private startTime: number = 0;
  private lastEventTime: number = 0;
  private eventTimes: number[] = [];
  private buffer: MotionDataPoint[] = [];
  private maxBufferSize: number = 3000;
  private onDataCallback: ((point: MotionDataPoint, allPoints: MotionDataPoint[]) => void) | null = null;
  private simulationInterval: number | null = null;
  private boundHandler: ((event: DeviceMotionEvent) => void) | null = null;

  public checkSupport(): { isSupported: boolean; isSecure: boolean; needsPermission: boolean } {
    const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
    const isSupported = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
    const needsPermission =
      isSupported &&
      typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function';

    return { isSupported, isSecure, needsPermission };
  }

  public async requestPermission(): Promise<boolean> {
    const { isSupported, needsPermission } = this.checkSupport();
    if (!isSupported) return false;

    if (needsPermission) {
      try {
        const reqFn = (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> })
          .requestPermission;
        const response = await reqFn();
        return response === 'granted';
      } catch (err) {
        console.warn('DeviceMotionEvent permission error:', err);
        return false;
      }
    }

    return true;
  }

  public startAcquisition(
    onData: (point: MotionDataPoint, allPoints: MotionDataPoint[]) => void,
    forceSimulation: boolean = false
  ): boolean {
    if (this.isAcquiring) return true;

    this.onDataCallback = onData;
    this.buffer = [];
    this.eventTimes = [];
    this.startTime = performance.now();
    this.lastEventTime = this.startTime;
    this.isAcquiring = true;

    const { isSupported, isSecure } = this.checkSupport();

    if (!isSupported || !isSecure || forceSimulation) {
      // Use Realistic Test Stream
      this.isSimulatedFallback = true;
      this.startSimulatedStream();
      return true;
    }

    this.isSimulatedFallback = false;
    this.boundHandler = this.handleDeviceMotion.bind(this);
    window.addEventListener('devicemotion', this.boundHandler, { passive: true });

    // Watchdog: If no real events arrive within 1200ms, fall back to simulated stream
    setTimeout(() => {
      if (this.isAcquiring && this.buffer.length === 0 && !this.isSimulatedFallback) {
        console.warn('No physical motion events received. Falling back to test motion generator.');
        this.stopHardwareListener();
        this.isSimulatedFallback = true;
        this.startSimulatedStream();
      }
    }, 1200);

    return true;
  }

  private handleDeviceMotion(event: DeviceMotionEvent): void {
    if (!this.isAcquiring) return;

    const now = performance.now();
    const t = (now - this.startTime) / 1000;

    // Track event intervals for observed Hz
    this.eventTimes.push(now);
    if (this.eventTimes.length > 30) this.eventTimes.shift();

    let x = 0;
    let y = 0;
    let z = 0;
    let includesGravity = false;

    if (event.acceleration && event.acceleration.x !== null) {
      x = event.acceleration.x || 0;
      y = event.acceleration.y || 0;
      z = event.acceleration.z || 0;
    } else if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.x !== null) {
      x = event.accelerationIncludingGravity.x || 0;
      y = event.accelerationIncludingGravity.y || 0;
      z = (event.accelerationIncludingGravity.z || 0) - 9.81; // basic gravity offset estimate
      includesGravity = true;
    } else {
      return; // No acceleration data present
    }

    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const point: MotionDataPoint = {
      timestamp: now,
      t: Math.round(t * 1000) / 1000,
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
      magnitude: Math.round(magnitude * 1000) / 1000,
      includesGravity,
    };

    this.buffer.push(point);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    if (this.onDataCallback) {
      this.onDataCallback(point, this.buffer);
    }
  }

  private startSimulatedStream(): void {
    const targetIntervalMs = 20; // 50 Hz simulated sensor
    let simTime = 0;

    this.simulationInterval = window.setInterval(() => {
      if (!this.isAcquiring) return;

      const now = performance.now();
      simTime += targetIntervalMs / 1000;

      this.eventTimes.push(now);
      if (this.eventTimes.length > 30) this.eventTimes.shift();

      // Realistic physical vibration simulation:
      // Multi-component handheld shake (3.5 Hz) + machine vibration (12 Hz) + noise
      const shake = 0.8 * Math.sin(2 * Math.PI * 3.5 * simTime);
      const vibration = 0.4 * Math.sin(2 * Math.PI * 12.0 * simTime);
      const noise = (Math.random() - 0.5) * 0.15;

      const x = Math.round((shake * 0.6 + noise) * 1000) / 1000;
      const y = Math.round((shake * 0.8 + vibration * 0.5 + noise) * 1000) / 1000;
      const z = Math.round((vibration + noise) * 1000) / 1000;
      const magnitude = Math.round(Math.sqrt(x * x + y * y + z * z) * 1000) / 1000;

      const point: MotionDataPoint = {
        timestamp: now,
        t: Math.round(simTime * 1000) / 1000,
        x,
        y,
        z,
        magnitude,
        includesGravity: false,
      };

      this.buffer.push(point);
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.shift();
      }

      if (this.onDataCallback) {
        this.onDataCallback(point, this.buffer);
      }
    }, targetIntervalMs);
  }

  private stopHardwareListener(): void {
    if (this.boundHandler) {
      window.removeEventListener('devicemotion', this.boundHandler);
      this.boundHandler = null;
    }
  }

  public stopAcquisition(): void {
    this.isAcquiring = false;
    this.stopHardwareListener();
    if (this.simulationInterval !== null) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  public getObservedFrequency(): number {
    if (this.eventTimes.length < 2) return 0;
    const dt = (this.eventTimes[this.eventTimes.length - 1] - this.eventTimes[0]) / (this.eventTimes.length - 1);
    if (dt <= 0) return 0;
    return Math.round((1000 / dt) * 10) / 10;
  }

  public getBuffer(): MotionDataPoint[] {
    return [...this.buffer];
  }

  public getSamplesForAxis(axis: AxisSelection): Sample[] {
    return this.buffer.map((p) => ({
      t: p.t,
      y: axis === 'magnitude' ? p.magnitude : p[axis],
    }));
  }

  public isSimulated(): boolean {
    return this.isSimulatedFallback;
  }

  public isRunning(): boolean {
    return this.isAcquiring;
  }
}

export const sensorManager = new MotionSensorManager();
