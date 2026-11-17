import React, { useState, useEffect, useMemo } from 'react';
import { TrialRecord } from '../types/dsp';
import { getAllTrials, deleteTrial, clearAllTrials, saveTrial } from '../services/storage';
import { generateSamplesCSV, triggerCSVDownload } from '../dsp/dsp';
import {
  FolderArchive,
  Search,
  Trash2,
  Download,
  Eye,
  CheckSquare,
  Square,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Layers,
  Sparkles,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface ExperimentsViewProps {
  onLoadTrialIntoLab?: (trial: TrialRecord) => void;
}

export const ExperimentsView: React.FC<ExperimentsViewProps> = ({ onLoadTrialIntoLab }) => {
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'synthetic' | 'live_motion'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTrialModal, setActiveTrialModal] = useState<TrialRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  const loadTrials = async () => {
    const list = await getAllTrials();
    setTrials(list);
  };

  useEffect(() => {
    loadTrials();
  }, []);

  // Prepopulate seed experiments if empty
  const handleSeedTrials = async () => {
    const seed1: TrialRecord = {
      id: `seed_adequate_${Date.now()}`,
      timestamp: Date.now() - 3600000,
      title: 'Adequate Sampling Baseline (5 Hz @ 40 Hz)',
      source: 'synthetic',
      config: {
        waveform: 'sine',
        f1: 5.0,
        a1: 1.5,
        f2: 0,
        a2: 0,
        noise: 0.02,
        dcOffset: 0,
        duration: 1.5,
        samplingRate: 40,
        detrend: false,
      },
      metrics: {
        rms: 1.061,
        peak: 1.502,
        peakToPeak: 3.004,
        mean: 0.001,
        energy: 67.5,
        power: 1.125,
        sampleCount: 60,
        effectiveFs: 40,
        dominantFreq: 5.0,
        nyquistFreq: 20.0,
        df: 0.667,
        isAliased: false,
        predictedAlias: 5.0,
        statusMessage: 'Adequate Sampling (Nyquist satisfied)',
      },
      notes: 'Clean baseline verification. Peak detected at 5.0 Hz matching ground truth.',
      sampleCount: 60,
      duration: 1.5,
    };

    const seed2: TrialRecord = {
      id: `seed_aliased_${Date.now() + 1}`,
      timestamp: Date.now() - 1800000,
      title: 'Undersampled Aliasing Fold (15 Hz @ 20 Hz)',
      source: 'synthetic',
      config: {
        waveform: 'sine',
        f1: 15.0,
        a1: 1.5,
        f2: 0,
        a2: 0,
        noise: 0.02,
        dcOffset: 0,
        duration: 1.5,
        samplingRate: 20,
        detrend: false,
      },
      metrics: {
        rms: 1.059,
        peak: 1.498,
        peakToPeak: 2.996,
        mean: 0.002,
        energy: 33.6,
        power: 1.12,
        sampleCount: 30,
        effectiveFs: 20,
        dominantFreq: 5.0,
        nyquistFreq: 10.0,
        df: 0.667,
        isAliased: true,
        predictedAlias: 5.0,
        statusMessage: 'Aliasing Detected: 15.0 Hz folded to 5.0 Hz (Nyquist limit: 10.0 Hz)',
      },
      notes: 'Ground truth tone was 15 Hz. Because fs=20 Hz (fN=10 Hz), the FFT peak falsely appears at 5.0 Hz.',
      sampleCount: 30,
      duration: 1.5,
    };

    await saveTrial(seed1);
    await saveTrial(seed2);
    await loadTrials();
  };

  // Filtered trials
  const filteredTrials = useMemo(() => {
    return trials.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSource = sourceFilter === 'all' || t.source === sourceFilter;
      return matchSearch && matchSource;
    });
  }, [trials, searchTerm, sourceFilter]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredTrials.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTrials.map((t) => t.id));
    }
  };

  // Delete trial
  const handleDelete = async (id: string) => {
    await deleteTrial(id);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    setDeleteConfirmId(null);
    await loadTrials();
  };

  // Export Combined Experiment Summary CSV
  const handleExportSummaryCSV = () => {
    if (trials.length === 0) return;
    const lines: string[] = [];
    lines.push('# VibeLab Experiments History Summary');
    lines.push(`# Generated At: ${new Date().toISOString()}`);
    lines.push(
      'Trial_ID,Timestamp,Title,Source,SamplingRate_Hz,Nyquist_Hz,DominantFreq_Hz,RMS_m_per_s2,Peak_m_per_s2,Is_Aliased,Predicted_Alias_Hz,Sample_Count,Notes'
    );

    for (const t of trials) {
      const dateStr = new Date(t.timestamp).toISOString();
      const safeTitle = `"${t.title.replace(/"/g, '""')}"`;
      const safeNotes = `"${t.notes.replace(/"/g, '""')}"`;
      lines.push(
        `${t.id},${dateStr},${safeTitle},${t.source},${t.metrics.effectiveFs},${t.metrics.nyquistFreq},${t.metrics.dominantFreq},${t.metrics.rms},${t.metrics.peak},${t.metrics.isAliased},${t.metrics.predictedAlias},${t.sampleCount},${safeNotes}`
      );
    }

    const csvContent = lines.join('\n');
    triggerCSVDownload(csvContent, `vibelab_all_experiments_${Date.now()}.csv`);
  };

  // Export single trial CSV
  const handleExportSingle = (trial: TrialRecord) => {
    if (trial.samples && trial.samples.length > 0) {
      const csvData = generateSamplesCSV(trial.samples, {
        source: trial.title,
        samplingRate: trial.metrics.effectiveFs,
        units: 'm/s^2',
        dominantFreq: trial.metrics.dominantFreq,
        nyquist: trial.metrics.nyquistFreq,
        rms: trial.metrics.rms,
      });
      triggerCSVDownload(csvData, `${trial.title.replace(/\s+/g, '_')}.csv`);
    } else {
      // Summary CSV line
      const line = `Trial: ${trial.title}\nSource: ${trial.source}\nfs: ${trial.metrics.effectiveFs}\nRMS: ${trial.metrics.rms}\nDominant Freq: ${trial.metrics.dominantFreq}\nNotes: ${trial.notes}`;
      triggerCSVDownload(line, `${trial.title.replace(/\s+/g, '_')}_summary.txt`);
    }
  };

  // Selected trials for side-by-side comparison
  const comparedTrials = useMemo(() => {
    return trials.filter((t) => selectedIds.includes(t.id));
  }, [trials, selectedIds]);

  return (
    <div className="flex-1 p-3 sm:p-5 space-y-4 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="bg-[#1B2B3B] border border-[#304357] p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-[#13B8A6]" />
            <h1 className="text-base sm:text-lg font-bold text-[#F2F5F8] tracking-tight">
              Experiment Trials & History
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-[#0B1118] text-[#13B8A6] font-mono border border-[#304357]">
              {trials.length} saved
            </span>
          </div>
          <p className="text-xs text-[#A5B2C0] mt-0.5">
            Structured local trial snapshots stored in IndexedDB. Compare sampling rates, alias foldings, and export CSVs.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {trials.length === 0 && (
            <button
              onClick={handleSeedTrials}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#13B8A6] hover:bg-[#0FA08F] text-[#062622] text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Seed Experiments</span>
            </button>
          )}

          {selectedIds.length >= 2 && (
            <button
              onClick={() => setIsComparing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-bold transition shadow-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Compare Selected ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={handleExportSummaryCSV}
            disabled={trials.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#223447] hover:bg-[#304357] disabled:opacity-40 text-[#F2F5F8] text-xs font-medium border border-[#304357] transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#13B8A6]" />
            <span>Export Summary CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#1B2B3B] border border-[#304357] p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[#A5B2C0] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search trials by title or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1118] border border-[#304357] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F2F5F8] focus:border-[#13B8A6] outline-hidden"
          />
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#A5B2C0]" />
          <span className="text-[#A5B2C0] text-[11px]">Source:</span>
          <div className="flex items-center rounded bg-[#0B1118] p-0.5 border border-[#304357]">
            {(['all', 'synthetic', 'live_motion'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSourceFilter(mode)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                  sourceFilter === mode
                    ? 'bg-[#13B8A6] text-[#062622] font-bold'
                    : 'text-[#A5B2C0] hover:text-white'
                }`}
              >
                {mode === 'all' ? 'All' : mode === 'synthetic' ? 'Synthetic' : 'Live Sensor'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trials Table */}
      {filteredTrials.length === 0 ? (
        <div className="bg-[#1B2B3B] border border-[#304357] rounded-lg p-10 text-center space-y-3">
          <FolderArchive className="w-10 h-10 text-[#304357] mx-auto" />
          <h3 className="text-sm font-semibold text-[#F2F5F8]">No experiment trials found</h3>
          <p className="text-xs text-[#A5B2C0] max-w-sm mx-auto">
            {searchTerm || sourceFilter !== 'all'
              ? 'Try adjusting your search criteria or filter.'
              : 'Save trials from the Signal Laboratory or Live Sensor, or load seed experiments to begin.'}
          </p>
          {trials.length === 0 && (
            <button
              onClick={handleSeedTrials}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#13B8A6] text-[#062622] font-semibold text-xs hover:bg-[#0FA08F] transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load 2 Preset Experiments</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#1B2B3B] border border-[#304357] rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1118] text-[#A5B2C0] uppercase font-semibold text-[10px] tracking-wider border-b border-[#304357]">
                <tr>
                  <th className="p-3 w-10">
                    <button onClick={selectAll} className="text-[#A5B2C0] hover:text-white">
                      {selectedIds.length === filteredTrials.length && filteredTrials.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#13B8A6]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Trial / Title</th>
                  <th className="p-3">Source</th>
                  <th className="p-3 font-mono">Sampling (fs)</th>
                  <th className="p-3 font-mono">Nyquist (fN)</th>
                  <th className="p-3 font-mono">Peak Freq</th>
                  <th className="p-3 font-mono">RMS</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#304357]/60 text-[#F2F5F8]">
                {filteredTrials.map((t) => {
                  const isSelected = selectedIds.includes(t.id);
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-[#223447]/60 transition ${
                        isSelected ? 'bg-[#223447]/40' : ''
                      }`}
                    >
                      <td className="p-3">
                        <button
                          onClick={() => toggleSelect(t.id)}
                          className="text-[#A5B2C0] hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#13B8A6]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-[#F2F5F8]">{t.title}</div>
                        <div className="text-[10px] text-[#A8B7C7] truncate max-w-xs">
                          {t.notes || new Date(t.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-mono capitalize px-2 py-0.5 rounded bg-[#0B1118] border border-[#304357] text-[#A5B2C0]">
                          {t.source === 'synthetic' ? 'Synthetic' : 'Live Sensor'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[#13B8A6]">
                        {t.metrics.effectiveFs} Hz
                      </td>
                      <td className="p-3 font-mono text-[#F59E0B]">
                        {t.metrics.nyquistFreq} Hz
                      </td>
                      <td className="p-3 font-mono text-[#F2F5F8]">
                        {t.metrics.dominantFreq.toFixed(1)} Hz
                      </td>
                      <td className="p-3 font-mono text-[#F2F5F8]">
                        {t.metrics.rms.toFixed(3)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            t.metrics.isAliased
                              ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                              : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                          }`}
                        >
                          {t.metrics.isAliased ? 'Aliased' : 'Adequate'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveTrialModal(t)}
                            className="p-1.5 rounded text-[#A5B2C0] hover:text-white hover:bg-[#0B1118] transition"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleExportSingle(t)}
                            className="p-1.5 rounded text-[#13B8A6] hover:text-[#0FA08F] hover:bg-[#0B1118] transition"
                            title="Export CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(t.id)}
                            className="p-1.5 rounded text-[#EF4444] hover:text-red-400 hover:bg-[#0B1118] transition"
                            title="Delete trial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#1B2B3B] border border-[#304357] rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-[#EF4444]">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-sm text-[#F2F5F8]">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-[#A5B2C0] mt-2">
              Are you sure you want to delete this trial record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#304357]">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded text-xs text-[#A5B2C0] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded bg-[#EF4444] text-white text-xs font-semibold hover:bg-red-600 transition"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trial Details Modal */}
      {activeTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#1B2B3B] border border-[#304357] rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#304357]">
              <div className="flex items-center gap-2 text-[#13B8A6]">
                <FolderArchive className="w-5 h-5" />
                <h3 className="font-semibold text-sm text-[#F2F5F8]">{activeTrialModal.title}</h3>
              </div>
              <button
                onClick={() => setActiveTrialModal(null)}
                className="p-1 rounded text-[#A5B2C0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-[#A5B2C0]">
              <div className="flex justify-between">
                <span>Timestamp:</span>
                <span className="font-mono text-[#F2F5F8]">
                  {new Date(activeTrialModal.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Source:</span>
                <span className="font-mono text-[#13B8A6] capitalize">
                  {activeTrialModal.source}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sampling Rate (fs):</span>
                <span className="font-mono text-[#13B8A6]">
                  {activeTrialModal.metrics.effectiveFs} Hz
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nyquist Limit (fN):</span>
                <span className="font-mono text-[#F59E0B]">
                  {activeTrialModal.metrics.nyquistFreq} Hz
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dominant Frequency:</span>
                <span className="font-mono text-[#F2F5F8]">
                  {activeTrialModal.metrics.dominantFreq.toFixed(2)} Hz
                </span>
              </div>
              <div className="flex justify-between">
                <span>RMS Acceleration:</span>
                <span className="font-mono text-[#F2F5F8]">
                  {activeTrialModal.metrics.rms.toFixed(3)} m/s²
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span
                  className={
                    activeTrialModal.metrics.isAliased ? 'text-[#EF4444]' : 'text-[#10B981]'
                  }
                >
                  {activeTrialModal.metrics.statusMessage}
                </span>
              </div>
            </div>

            {activeTrialModal.notes && (
              <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60 text-xs">
                <span className="text-[10px] text-[#A5B2C0] uppercase font-semibold block mb-1">
                  Observations:
                </span>
                <p className="text-[#F2F5F8] leading-relaxed">{activeTrialModal.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#304357]">
              <button
                onClick={() => handleExportSingle(activeTrialModal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#13B8A6] text-[#062622] font-semibold text-xs hover:bg-[#0FA08F] transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {isComparing && comparedTrials.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#1B2B3B] border border-[#304357] rounded-xl max-w-4xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#304357]">
              <div className="flex items-center gap-2 text-[#F59E0B]">
                <Layers className="w-5 h-5" />
                <h3 className="font-bold text-base text-[#F2F5F8]">
                  Side-by-Side Trial Comparison ({comparedTrials.length} Trials)
                </h3>
              </div>
              <button
                onClick={() => setIsComparing(false)}
                className="p-1 rounded text-[#A5B2C0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0B1118] text-[#A5B2C0] uppercase text-[10px] tracking-wider border-b border-[#304357]">
                  <tr>
                    <th className="p-2.5">Parameter / Metric</th>
                    {comparedTrials.map((t) => (
                      <th key={t.id} className="p-2.5 font-semibold text-[#13B8A6]">
                        {t.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#304357]/60 text-[#F2F5F8]">
                  <tr>
                    <td className="p-2.5 text-[#A5B2C0] font-medium">Source</td>
                    {comparedTrials.map((t) => (
                      <td key={t.id} className="p-2.5 font-mono capitalize">
                        {t.source}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#A5B2C0] font-medium">Sampling Rate (fs)</td>
                    {comparedTrials.map((t) => (
                      <td key={t.id} className="p-2.5 font-mono font-bold text-[#13B8A6]">
                        {t.metrics.effectiveFs} Hz
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#A5B2C0] font-medium">Nyquist Limit (fN)</td>
                    {comparedTrials.map((t) => (
                      <td key={t.id} className="p-2.5 font-mono font-bold text-[#F59E0B]">
                        {t.metrics.nyquistFreq} Hz
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#A5B2C0] font-medium">Dominant / Detected Freq</td>
                    {comparedTrials.map((t) => (
                      <td key={t.id} className="p-2.5 font-mono font-bold">
                        {t.metrics.dominantFreq.toFixed(2)} Hz
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#A5B2C0] font-medium">RMS Value</td>
                    {comparedTrials.map((t) => (
                      <td key={t.id} className="p-2.5 font-mono">
                        {t.metrics.rms.toFixed(3)} m/s²
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#A5B2C0] font-medium">Peak Amplitude</td>
                    {comparedTrials.map((t) => (
                      <td key={t.id} className="p-2.5 font-mono">
                        {t.metrics.peak.toFixed(3)} m/s²
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#A5B2C0] font-medium">Energy (E)</td>
                    {comparedTrials.map((t) => (
                      <td key={t.id} className="p-2.5 font-mono">
                        {t.metrics.energy.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#A5B2C0] font-medium">Aliasing Status</td>
                    {comparedTrials.map((t) => (
                      <td key={t.id} className="p-2.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            t.metrics.isAliased
                              ? 'bg-[#EF4444]/20 text-[#EF4444]'
                              : 'bg-[#10B981]/20 text-[#10B981]'
                          }`}
                        >
                          {t.metrics.isAliased ? 'Aliasing In Effect' : 'Adequate'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
