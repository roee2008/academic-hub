import React, { useState } from 'react';
import {
  X,
  Wifi,
  Copy,
  Check,
  Download,
  Upload,
  ArrowLeftRight,
  Smartphone,
  Laptop,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Course, TimetableSlot } from '../../types';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  timetableSlots: TimetableSlot[];
  onRefreshData: () => Promise<void>;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  courses,
  timetableSlots,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'wifi' | 'code'>('wifi');
  const [pcAddress, setPcAddress] = useState<string>(() => {
    const saved = localStorage.getItem('nexus_sync_pc_address');
    if (saved) return saved;
    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    return host && host !== 'localhost' && host !== '127.0.0.1'
      ? `http://${host}:8000`
      : 'http://127.0.0.1:8000';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');

  if (!isOpen) return null;

  const handleWifiSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      localStorage.setItem('nexus_sync_pc_address', pcAddress.trim());
      const cleanAddress = pcAddress.trim().replace(/\/+$/, '');
      
      // 1. Fetch data from PC
      const res = await fetch(`${cleanAddress}/api/sync/device-export`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Failed to reach PC server (HTTP ${res.status}). Make sure both devices are on the same Wi-Fi.`);
      }
      const data = await res.json();
      
      // 2. Save into local offline store
      if (Array.isArray(data.courses)) {
        localStorage.setItem('nexus_cached_courses', JSON.stringify(data.courses));
      }
      if (Array.isArray(data.timetable_slots)) {
        localStorage.setItem('nexus_cached_timetable', JSON.stringify(data.timetable_slots));
      }

      await onRefreshData();
      setSyncMessage({
        type: 'success',
        text: `Successfully synced ${data.courses?.length || 0} courses and ${data.timetable_slots?.length || 0} timetable slots from your PC!`,
      });
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: err.message || 'Could not connect to PC. Ensure start_app.bat is running on your PC.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const generateSyncPayload = () => {
    return JSON.stringify({
      version: '1.0',
      exported_at: new Date().toISOString(),
      courses,
      timetable_slots: timetableSlots,
    });
  };

  const handleCopySyncCode = () => {
    const payload = generateSyncPayload();
    navigator.clipboard.writeText(payload);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadSyncFile = () => {
    const payload = generateSyncPayload();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_academic_sync_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCode = async () => {
    if (!importCodeInput.trim()) return;
    try {
      const parsed = JSON.parse(importCodeInput.trim());
      if (!parsed.courses || !parsed.timetable_slots) {
        throw new Error('Invalid sync code format. Missing courses or timetable data.');
      }
      localStorage.setItem('nexus_cached_courses', JSON.stringify(parsed.courses));
      localStorage.setItem('nexus_cached_timetable', JSON.stringify(parsed.timetable_slots));

      // If PC backend is reachable, post to backend as well
      const cleanAddress = pcAddress.trim().replace(/\/+$/, '');
      try {
        await fetch(`${cleanAddress}/api/sync/device-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courses: parsed.courses,
            timetable_slots: parsed.timetable_slots,
          }),
        });
      } catch (e) {
        // Standalone mode is fine
      }

      await onRefreshData();
      setSyncMessage({
        type: 'success',
        text: `Imported ${parsed.courses.length} courses and ${parsed.timetable_slots.length} timetable slots successfully!`,
      });
      setImportCodeInput('');
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: err.message || 'Failed to parse sync code.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-surface-1 border border-stroke rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stroke flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-indigo/20 border border-accent-indigo/30 flex items-center justify-center text-accent-indigo">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline font-semibold text-sm text-content-primary">
                Device Sync & Offline Mode
              </h3>
              <p className="text-[11px] text-content-dim">
                Sync courses & timetable between your PC and phone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-content-dim hover:text-content-primary hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stroke bg-canvas/30 px-6 pt-2">
          <button
            onClick={() => { setActiveTab('wifi'); setSyncMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
              activeTab === 'wifi'
                ? 'border-accent-indigo text-accent-indigo'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Wi-Fi Direct Sync</span>
          </button>
          <button
            onClick={() => { setActiveTab('code'); setSyncMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
              activeTab === 'code'
                ? 'border-accent-indigo text-accent-indigo'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sync Code / File</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Status Alert Banner */}
          {syncMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start space-x-2 border ${
                syncMessage.type === 'success'
                  ? 'bg-accent-emerald/15 border-accent-emerald/30 text-accent-emerald'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {syncMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{syncMessage.text}</span>
            </div>
          )}

          {activeTab === 'wifi' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-surface-2/40 border border-stroke flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-accent-indigo/15 flex items-center justify-center text-accent-indigo">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-content-primary">PC Server Address</div>
                    <div className="text-[11px] text-content-dim">Where your PC app is running</div>
                  </div>
                </div>
                <div className="flex items-center text-accent-emerald text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-accent-emerald mr-1.5 animate-pulse" />
                  Wi-Fi Ready
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-content-muted mb-1.5">
                  PC Backend URL
                </label>
                <input
                  type="text"
                  value={pcAddress}
                  onChange={(e) => setPcAddress(e.target.value)}
                  placeholder="http://192.168.16.44:8000"
                  className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary font-mono focus:outline-hidden focus:border-accent-indigo"
                />
                <p className="text-[11px] text-content-dim mt-1.5">
                  Enter your PC's local network IP. Both devices must be on the same home Wi-Fi.
                </p>
              </div>

              <button
                onClick={handleWifiSync}
                disabled={isSyncing}
                className="w-full py-2.5 rounded-lg bg-accent-indigo hover:bg-accent-indigo/90 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-subtle"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronizing Feeds...' : 'Sync Courses & Timetable from PC'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Export Section */}
              <div className="p-3.5 rounded-lg bg-surface-2/40 border border-stroke space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-content-primary">Export to Another Device</span>
                  <span className="text-[10px] font-mono text-content-dim">
                    {courses.length} Courses, {timetableSlots.length} Slots
                  </span>
                </div>
                <p className="text-[11px] text-content-dim">
                  Copy this device's courses and bell schedule to transfer to your phone or PC.
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopySyncCode}
                    className="flex-1 py-1.5 px-3 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs font-medium text-content-primary flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Sync Code'}</span>
                  </button>
                  <button
                    onClick={handleDownloadSyncFile}
                    className="py-1.5 px-3 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs font-medium text-content-primary flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                    title="Download JSON file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Import Section */}
              <div className="p-3.5 rounded-lg bg-surface-2/40 border border-stroke space-y-2.5">
                <span className="text-xs font-semibold text-content-primary block">Import from Another Device</span>
                <textarea
                  value={importCodeInput}
                  onChange={(e) => setImportCodeInput(e.target.value)}
                  placeholder="Paste sync code or JSON here..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-[11px] text-content-primary font-mono focus:outline-hidden focus:border-accent-indigo"
                />
                <button
                  onClick={handleImportCode}
                  disabled={!importCodeInput.trim()}
                  className="w-full py-2 rounded-md bg-accent-emerald/20 hover:bg-accent-emerald/30 border border-accent-emerald/40 text-accent-emerald font-medium text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Apply & Merge Sync</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-stroke bg-surface-2/20 flex items-center justify-between text-[11px] text-content-dim">
          <div className="flex items-center space-x-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Runs offline on your phone anytime</span>
          </div>
          <span>v1.0 Offline Engine</span>
        </div>
      </div>
    </div>
  );
};
