import React, { useState } from 'react';
import { TrialRecord, SignalConfig, SignalMetrics, Sample } from '../types/dsp';
import { saveTrial } from '../services/storage';
import { Save, X, Check, BookmarkPlus } from 'lucide-react';

interface SaveTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (trial: TrialRecord) => void;
  source: 'synthetic' | 'live_motion';
  config: Partial<SignalConfig>;
  metrics: SignalMetrics;
  samples: Sample[];
}

export const SaveTrialModal: React.FC<SaveTrialModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  source,
  config,
  metrics,
  samples,
}) => {
  const [title, setTitle] = useState<string>(
    source === 'synthetic'
      ? `Synthetic Test (${config.f1 || 5} Hz @ ${config.samplingRate || 40} Hz)`
      : `Live Motion Capture (${new Date().toLocaleTimeString()})`
  );
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const trial: TrialRecord = {
        id: `trial_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        title: title.trim(),
        source,
        config,
        metrics,
        notes: notes.trim(),
        sampleCount: samples.length,
        duration: samples.length > 0 ? samples[samples.length - 1].t - samples[0].t : 0,
        samples: samples.slice(0, 1000), // persist up to 1000 samples for re-plotting
      };

      await saveTrial(trial);
      onSaved(trial);
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#1B2B3B] border border-[#304357] rounded-xl max-w-md w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#304357]">
          <div className="flex items-center gap-2 text-[#13B8A6]">
            <BookmarkPlus className="w-5 h-5" />
            <h3 className="font-semibold text-base text-[#F2F5F8]">Save Experiment Snapshot</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#A5B2C0] hover:text-white hover:bg-[#223447]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#A5B2C0] uppercase mb-1">
              Trial Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0B1118] border border-[#304357] rounded px-3 py-2 text-sm text-[#F2F5F8] focus:border-[#13B8A6] outline-hidden font-medium"
              placeholder="e.g. Aliasing demonstration with 15 Hz tone"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A5B2C0] uppercase mb-1">
              Research Notes / Lab Observations
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0B1118] border border-[#304357] rounded px-3 py-2 text-xs text-[#F2F5F8] focus:border-[#13B8A6] outline-hidden leading-relaxed"
              placeholder="e.g. Recorded folded peak at 5 Hz despite 15 Hz input due to undersampling..."
            />
          </div>

          {/* Quick Metrics Summary */}
          <div className="bg-[#0B1118] p-3 rounded border border-[#304357]/60 text-xs font-mono grid grid-cols-2 gap-2 text-[#A5B2C0]">
            <div>fs: <span className="text-[#13B8A6]">{metrics.effectiveFs} Hz</span></div>
            <div>Nyquist: <span className="text-[#F59E0B]">{metrics.nyquistFreq} Hz</span></div>
            <div>RMS: <span className="text-[#F2F5F8]">{metrics.rms} m/s²</span></div>
            <div>Peak: <span className="text-[#F2F5F8]">{metrics.peak} m/s²</span></div>
            <div className="col-span-2">
              Status: <span className={metrics.isAliased ? 'text-[#EF4444]' : 'text-[#10B981]'}>{metrics.statusMessage}</span>
            </div>
          </div>

          <p className="text-[11px] text-[#A8B7C7]">
            Saved snapshots are stored locally in your browser (IndexedDB). No cloud account required.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#304357]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded text-xs text-[#A5B2C0] hover:text-white hover:bg-[#223447] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#13B8A6] hover:bg-[#0FA08F] text-[#062622] font-semibold text-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Trial'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
