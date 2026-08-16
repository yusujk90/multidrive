import React, { useState } from 'react';
import {
  Zap,
  RefreshCw,
  ArrowRightLeft,
  ShieldCheck,
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Layers,
  Sparkles,
  Sliders,
  Database,
  ArrowRight,
} from 'lucide-react';
import { SyncRule, SyncLogEntry, DriveAccount, UnifiedFile } from '../types';
import { formatBytes } from '../services/storagePoolManager';

interface SyncManagerProps {
  accounts: DriveAccount[];
  syncRules: SyncRule[];
  syncLogs: SyncLogEntry[];
  autoSyncEnabled: boolean;
  onToggleAutoSync: () => void;
  syncInterval: number; // in seconds
  onChangeSyncInterval: (seconds: number) => void;
  onRunRuleNow: (ruleId: string) => void;
  onToggleRuleStatus: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onAddRule: (rule: Omit<SyncRule, 'id' | 'syncedFileCount'>) => void;
  onTriggerRebalance: () => void;
  onClearLogs: () => void;
  isRebalancing: boolean;
}

export const SyncManager: React.FC<SyncManagerProps> = ({
  accounts,
  syncRules,
  syncLogs,
  autoSyncEnabled,
  onToggleAutoSync,
  syncInterval,
  onChangeSyncInterval,
  onRunRuleNow,
  onToggleRuleStatus,
  onDeleteRule,
  onAddRule,
  onTriggerRebalance,
  onClearLogs,
  isRebalancing,
}) => {
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [targetAccountId, setTargetAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [ruleType, setRuleType] = useState<SyncRule['ruleType']>('mirror');
  const [thresholdPercent, setThresholdPercent] = useState(80);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'running' | 'failed'>('all');

  const filteredLogs = syncLogs.filter((log) => {
    if (logFilter === 'all') return true;
    return log.status === logFilter;
  });

  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !sourceAccountId || !targetAccountId) return;
    if (sourceAccountId === targetAccountId && ruleType !== 'auto_balance') {
      alert('Akun asal dan akun tujuan harus berbeda untuk sinkronisasi antar akun.');
      return;
    }

    onAddRule({
      name: newRuleName.trim(),
      sourceAccountId,
      targetAccountId,
      ruleType,
      status: 'active',
      fileTypes: ['all'],
      thresholdPercent,
      lastRun: new Date().toISOString(),
    });

    setNewRuleName('');
    setShowAddRuleModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Sync Engine & Multi-Drive Automation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Otomatisasi replikasi berkas dan pencegahan kuota penuh antar Google Drive
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddRuleModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-98 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Aturan Sync</span>
          </button>
        </div>
      </div>

      {/* Auto-Sync Engine Overview Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  Status Engine Sinkronisasi Otomatis
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                    autoSyncEnabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {autoSyncEnabled ? '● Aktif Berjalan' : 'Dijeda'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 max-w-xl leading-relaxed">
                Menjaga cadangan berkas tetap tersinkronisasi dan otomatis mendistribusikan beban penyimpanan saat kuota drive melewati ambang batas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Interval:</span>
              <select
                value={syncInterval}
                onChange={(e) => onChangeSyncInterval(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white py-1.5 px-2.5 text-xs text-gray-800 focus:border-indigo-500 focus:outline-hidden"
              >
                <option value={60}>Setiap 1 menit</option>
                <option value={300}>Setiap 5 menit</option>
                <option value={900}>Setiap 15 menit</option>
                <option value={3600}>Setiap 1 jam</option>
              </select>
            </div>

            <button
              onClick={onToggleAutoSync}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                autoSyncEnabled
                  ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {autoSyncEnabled ? 'Jeda Engine' : 'Aktifkan Engine'}
            </button>
          </div>
        </div>
      </div>

      {/* Sync Rules List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Aturan Sinkronisasi Aktif</h3>
            <p className="text-[11px] text-gray-500">Kaidah replikasi dan transfer antar akun cloud</p>
          </div>
          <span className="text-xs text-gray-500 font-medium">{syncRules.length} Aturan</span>
        </div>

        <div className="divide-y divide-gray-100">
          {syncRules.map((rule) => {
            const sourceAcc = accounts.find((a) => a.id === rule.sourceAccountId);
            const targetAcc = accounts.find((a) => a.id === rule.targetAccountId);
            const isActive = rule.status === 'active';

            return (
              <div
                key={rule.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 text-sm">{rule.name}</h4>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isActive ? 'Aktif' : 'Dijeda'}
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                      {rule.ruleType === 'mirror'
                        ? 'Mirror Backup'
                        : rule.ruleType === 'high_quota_offload'
                        ? 'Auto-Offload Kuota'
                        : 'Smart Balancer'}
                    </span>
                  </div>

                  {/* Flow description */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium text-gray-800">{sourceAcc?.name || 'Drive A'}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                    <span className="font-medium text-gray-800">{targetAcc?.name || 'Drive B'}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{rule.syncedFileCount} berkas tersinkron</span>
                  </div>
                </div>

                {/* Rule Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRunRuleNow(rule.id)}
                    title="Jalankan Sekarang"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Play className="h-3 w-3 text-indigo-600" />
                    <span>Jalankan</span>
                  </button>

                  <button
                    onClick={() => onToggleRuleStatus(rule.id)}
                    title={isActive ? 'Jeda Aturan' : 'Aktifkan Aturan'}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  >
                    {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>

                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    title="Hapus Aturan"
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Activity Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Riwayat & Log Sinkronisasi Real-Time</h3>
            <p className="text-[11px] text-gray-500">Pencatatan setiap operasi transfer dan penyeimbangan berkas</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearLogs}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium"
            >
              Bersihkan Log
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-400 text-[11px] uppercase tracking-wider bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="py-3 px-6 font-semibold">Waktu</th>
                <th className="py-3 px-6 font-semibold">Tindakan & Berkas</th>
                <th className="py-3 px-6 font-semibold">Status</th>
                <th className="py-3 px-6 font-semibold">Detail Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {filteredLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 px-6 text-gray-400 font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-6 font-medium text-gray-900 truncate max-w-xs">
                    {log.fileName}
                  </td>
                  <td className="py-3 px-6 whitespace-nowrap">
                    {log.status === 'success' ? (
                      <span className="text-green-600 font-semibold flex items-center gap-1 text-[11px]">
                        ● <span>Complete</span>
                      </span>
                    ) : log.status === 'running' ? (
                      <span className="text-indigo-600 font-semibold flex items-center gap-1 text-[11px]">
                        🔄 <span>Syncing</span>
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold flex items-center gap-1 text-[11px]">
                        ● <span>Error</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-gray-500 text-xs truncate max-w-sm">
                    {log.message}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 text-xs">
                    Belum ada riwayat log sinkronisasi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-200 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Tambah Aturan Sinkronisasi Baru</h3>
            <form onSubmit={handleAddRuleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Nama Aturan
                </label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="Misal: Backup Otomatis Drive Utama ke Kampus"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Akun Asal (Source)
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Akun Tujuan (Target)
                  </label>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Tipe Aturan
                </label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="mirror">Mirror Backup (Duplikasi otomatis semua berkas baru)</option>
                  <option value="overflow">Auto-Offload (Alihkan berkas bila kuota &gt; 80%)</option>
                  <option value="auto_balance">Smart Balancer (Penyeimbang beban dinamis)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
                >
                  Simpan Aturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
