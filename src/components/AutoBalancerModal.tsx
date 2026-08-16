import React, { useState } from 'react';
import {
  Zap,
  X,
  ArrowRight,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  TrendingDown,
  Layers,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { DriveAccount, UnifiedFile } from '../types';
import {
  formatBytes,
  calculateRebalancePlan,
  RebalancePlan,
} from '../services/storagePoolManager';

interface AutoBalancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: DriveAccount[];
  files: UnifiedFile[];
  onExecuteRebalance: (plan: RebalancePlan) => Promise<void>;
  isRebalancing: boolean;
}

export const AutoBalancerModal: React.FC<AutoBalancerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  files,
  onExecuteRebalance,
  isRebalancing,
}) => {
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  const plan = calculateRebalancePlan(accounts, files);

  const handleApply = async () => {
    try {
      await onExecuteRebalance(plan);
      setCompleted(true);
      setTimeout(() => {
        setCompleted(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal menjalankan Auto-Balancer: ${err.message || err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Zap className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  Smart Storage Auto-Balancer
                </h3>
                {plan.isImbalanced ? (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold">
                    Perlu Optimasi
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
                    Kapasitas Optimal
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Meratakan beban penyimpanan antar akun Google Drive secara otomatis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRebalancing}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {/* Analysis Summary Banner */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Hasil Analisis Distribusi Kapasitas
              </span>
              <span className="text-[11px] font-semibold text-indigo-700">
                Selisih Beban: {plan.imbalanceDelta.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed">
              {plan.explanation}
            </p>
          </div>

          {/* Current vs Projected Storage Usage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-800">
              <span>Status Kuota Akun Drive</span>
              <span className="text-gray-400 font-normal">Saat Ini ➔ Prediksi Setelah Rebalance</span>
            </div>

            <div className="space-y-2.5">
              {accounts.map((account) => {
                const currentPct = (account.storageUsed / (account.storageLimit || 1)) * 100;
                const projected = plan.projectedAccounts.find((p) => p.id === account.id);
                const projPct = projected
                  ? (projected.storageUsed / (projected.storageLimit || 1)) * 100
                  : currentPct;

                return (
                  <div
                    key={account.id}
                    className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: account.color }}
                        />
                        <span className="font-semibold text-gray-900">{account.name}</span>
                        <span className="text-gray-400 text-[11px]">({account.email})</span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-gray-600 font-semibold">{currentPct.toFixed(0)}%</span>
                        {Math.abs(projPct - currentPct) > 0.5 && (
                          <>
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                            <span
                              className={`font-bold ${
                                projPct < currentPct ? 'text-emerald-600' : 'text-indigo-600'
                              }`}
                            >
                              {projPct.toFixed(0)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Comparison */}
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, currentPct)}%`,
                          backgroundColor: currentPct > 80 ? '#f59e0b' : account.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Planned Rebalance Migrations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-800">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                Daftar Relokasi Otomatis yang Direncanakan ({plan.actions.length})
              </span>
            </div>

            {plan.actions.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-gray-500">
                <ShieldCheck className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-medium text-xs text-gray-700">Semua Akun Sudah Dalam Batas Aman</p>
                <p className="text-[11px] text-gray-400">Tidak ada berkas yang perlu dipindahkan saat ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden max-h-48 overflow-y-auto">
                {plan.actions.map((act, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/80">
                    <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-sm">
                      <FileCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold text-gray-900 truncate">{act.file.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{formatBytes(act.file.size)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white truncate max-w-[90px]"
                        style={{ backgroundColor: act.fromAccount.color }}
                      >
                        {act.fromAccount.name.split(' ')[0]}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white truncate max-w-[90px]"
                        style={{ backgroundColor: act.toAccount.color }}
                      >
                        {act.toAccount.name.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Success state info */}
          {completed && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-xs">
                Auto-Balancer berhasil merelokasi berkas dan menyeimbangkan ruang penyimpanan pool!
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50">
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            <span>Aman & tanpa kehilangan data</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isRebalancing}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Tutup
            </button>
            <button
              id="execute-rebalance-btn"
              type="button"
              onClick={handleApply}
              disabled={isRebalancing || plan.actions.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-98 disabled:opacity-50 transition-all"
            >
              {isRebalancing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Merelokasi Berkas...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>Jalankan Auto-Balancer Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
