import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNyquist,
  calculateAliasFrequency,
  isFrequencyAliased,
  generateSyntheticSignal,
  calculateSignalMetrics,
  computeFFTSpectrum,
  reconstructSignal,
  resampleNonuniform,
} from './dsp';

test('Nyquist frequency is exactly half of sampling rate', () => {
  assert.equal(computeNyquist(40), 20);
  assert.equal(computeNyquist(20), 10);
  assert.equal(computeNyquist(100), 50);
  assert.equal(computeNyquist(0), 0);
});

test('Alias frequency calculation follows folded folding formula', () => {
  // Test case 1: 5 Hz sampled at 40 Hz (fs=40, Nyquist=20) -> Safe, folded to 5 Hz
  const aliasSafe = calculateAliasFrequency(5, 40);
  assert.equal(aliasSafe, 5);
  assert.equal(isFrequencyAliased(5, 40), false);

  // Test case 2: 15 Hz sampled at 20 Hz (fs=20, Nyquist=10) -> Folded to |((15+10)%20)-10| = |5-10| = 5 Hz
  const aliasFolded = calculateAliasFrequency(15, 20);
  assert.equal(aliasFolded, 5);
  assert.equal(isFrequencyAliased(15, 20), true);

  // Test case 3: 25 Hz sampled at 20 Hz -> Folded to |((25+10)%20)-10| = |15-10| = 5 Hz
  const alias25 = calculateAliasFrequency(25, 20);
  assert.equal(alias25, 5);
  assert.equal(isFrequencyAliased(25, 20), true);

  // Test case 4: Exactly at Nyquist: 10 Hz sampled at 20 Hz
  const aliasNyq = calculateAliasFrequency(10, 20);
  assert.equal(aliasNyq, 10);
  assert.equal(isFrequencyAliased(10, 20), false);
});

test('Sine wave RMS approaches Amplitude / sqrt(2) over integer cycles', () => {
  const amp = 2.0;
  const { continuous } = generateSyntheticSignal(
    {
      waveform: 'sine',
      f1: 5,
      a1: amp,
      f2: 0,
      a2: 0,
      noise: 0,
      dcOffset: 0,
      duration: 1.0, // exactly 5 cycles
      samplingRate: 100,
      detrend: false,
    },
    2000
  );

  const metrics = calculateSignalMetrics(continuous, 2000, 5);
  const expectedRMS = amp / Math.SQRT2; // 2 / 1.4142 = 1.4142
  assert.ok(
    Math.abs(metrics.rms - expectedRMS) < 0.05,
    `Expected RMS close to ${expectedRMS}, got ${metrics.rms}`
  );
  assert.equal(metrics.isAliased, false);
});

test('FFT identifies dominant peak at 5 Hz for 5 Hz tone sampled at 40 Hz', () => {
  const { sampled } = generateSyntheticSignal(
    {
      waveform: 'sine',
      f1: 5,
      a1: 1.5,
      f2: 0,
      a2: 0,
      noise: 0,
      dcOffset: 0,
      duration: 2.0,
      samplingRate: 40,
      detrend: false,
    },
    2000
  );

  const spectrum = computeFFTSpectrum(sampled, 40, 'hann', false);
  assert.equal(spectrum.nyquist, 20);
  assert.ok(
    Math.abs(spectrum.dominantFreq - 5.0) <= spectrum.df,
    `Dominant frequency ${spectrum.dominantFreq} should match 5 Hz within resolution ${spectrum.df}`
  );
});

test('Signal reconstruction produces valid output arrays without NaN for sinc, zoh, and foh', () => {
  const { sampled } = generateSyntheticSignal(
    {
      waveform: 'sine',
      f1: 4,
      a1: 1.0,
      f2: 0,
      a2: 0,
      noise: 0,
      dcOffset: 0,
      duration: 1.0,
      samplingRate: 20,
      detrend: false,
    },
    2000
  );

  const targetTimes = [0.05, 0.12, 0.25, 0.38, 0.5, 0.72, 0.95];

  const sincRecon = reconstructSignal(sampled, 'sinc', targetTimes, 20);
  const zohRecon = reconstructSignal(sampled, 'zoh', targetTimes, 20);
  const fohRecon = reconstructSignal(sampled, 'foh', targetTimes, 20);

  assert.equal(sincRecon.length, targetTimes.length);
  assert.equal(zohRecon.length, targetTimes.length);
  assert.equal(fohRecon.length, targetTimes.length);

  for (const s of sincRecon) {
    assert.ok(!Number.isNaN(s.y), 'Sinc reconstructed y must not be NaN');
  }
  for (const s of zohRecon) {
    assert.ok(!Number.isNaN(s.y), 'ZOH reconstructed y must not be NaN');
  }
  for (const s of fohRecon) {
    assert.ok(!Number.isNaN(s.y), 'FOH reconstructed y must not be NaN');
  }
});

test('Nonuniform resampling outputs strictly uniform time series', () => {
  const nonuniform = [
    { t: 0.0, y: 0.0 },
    { t: 0.021, y: 0.2 },
    { t: 0.038, y: 0.4 },
    { t: 0.062, y: 0.6 },
    { t: 0.081, y: 0.8 },
    { t: 0.105, y: 1.0 },
  ];

  const uniform = resampleNonuniform(nonuniform, 50); // dt = 0.02s
  assert.ok(uniform.length >= 4);
  const dt = 1 / 50;
  for (let i = 1; i < uniform.length; i++) {
    const step = uniform[i].t - uniform[i - 1].t;
    assert.ok(Math.abs(step - dt) < 1e-6, `Expected uniform step of ${dt}, got ${step}`);
  }
});
