import React from 'react';
import {
  PieChart,
  HardDrive,
  BarChart3,
  Sparkles,
  Zap,
  TrendingUp,
  FileText,
  Image,
  Video,
  FileArchive,
  Music,
  File,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { DriveAccount, UnifiedFile, StoragePoolSummary } from '../types';
import { formatBytes, getFileCategory } from '../services/storagePoolManager';

interface StorageAnalyticsProps {
  accounts: DriveAccount[];
  files: UnifiedFile[];
  poolSummary: StoragePoolSummary;
  onTriggerRebalance: () => void;
  onSelectAccountFilter: (accountId: string) => void;
}

export const StorageAnalytics: React.FC<StorageAnalyticsProps> = ({
  accounts,
  files,
  poolSummary,
  onTriggerRebalance,
  onSelectAccountFilter,
}) => {
  // Aggregate file sizes by category
  const categoryStats = files.reduce(
    (acc, f) => {
      const cat = getFileCategory(f.mimeType, f.name);
      if (!acc[cat]) {
        acc[cat] = { count: 0, totalSize: 0 };
      }
      acc[cat].count += 1;
      acc[cat].totalSize += f.size || 0;
      return acc;
    },
    {} as Record<string, { count: number; totalSize: number }>
  );

  const categories = [
    { id: 'document', label: 'Dokumen & Spreadsheet', icon: FileText, color: '#4f46e5' },
    { id: 'image', label: 'Foto & Gambar', icon: Image, color: '#7c3aed' },
    { id: 'video', label: 'Video & Media', icon: Video, color: '#dc2626' },
    { id: 'archive', label: 'Arsip & Zip', icon: FileArchive, color: '#059669' },
    { id: 'audio', label: 'Audio & Musik', icon: Music, color: '#db2777' },
    { id: 'other', label: 'Format Lainnya', icon: File, color: '#64748b' },
  ];

  // Calculate balance deviation
  const usages = accounts.map((a) => (a.storageUsed / (a.storageLimit || 1)) * 100);
  const maxUsage = Math.max(...usages, 0);
  const minUsage = Math.min(...usages, 0);
  const isImbalanced = maxUsage - minUsage > 40;

  return (
    <div className="space-y-6">
      
      {/* Top Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Capacity & Storage Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Wawasan komprehensif distribusi format data dan efisiensi kuota pool
        </p>
      </div>

      {/* Smart Balancer Advisor Box */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  Smart Storage Advisor & Optimasi Beban
                </h3>
                {isImbalanced ? (
                  <span className="rounded-full bg-yellow-100 text-yellow-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                    Beban Belum Rata
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                    Distribusi Optimal
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 max-w-xl leading-relaxed">
                {isImbalanced
                  ? `Ditemukan selisih pemakaian ${(maxUsage - minUsage).toFixed(0)}% antar akun Google Drive. Klik tombol untuk menyeimbangkan kuota secara otomatis.`
                  : 'Distribusi berkas antar akun Google Drive Anda berada dalam status sangat seimbang dan optimal.'}
              </p>
            </div>
          </div>

          <button
            onClick={onTriggerRebalance}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-98 transition-all"
          >
            <Zap className="h-4 w-4 text-amber-300" />
            <span>Jalankan Auto-Balancer</span>
          </button>
        </div>
      </div>

      {/* Grid: File Format Breakdown & Storage Distribution per Drive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: File Categories Distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900">Komposisi Format Berkas</h3>
            </div>
            <span className="text-[11px] font-medium text-gray-400">Total: {files.length} Berkas</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {categories.map((cat) => {
              const stat = categoryStats[cat.id] || { count: 0, totalSize: 0 };
              const totalSizeAll = poolSummary.totalUsed || 1;
              const pct = (stat.totalSize / totalSizeAll) * 100;
              const IconComp = cat.icon;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <IconComp className="h-3.5 w-3.5" style={{ color: cat.color }} />
                      <span className="font-semibold text-gray-800">{cat.label}</span>
                      <span className="text-[11px] text-gray-400">({stat.count} berkas)</span>
                    </div>
                    <div className="font-mono text-xs font-medium text-gray-700">
                      {formatBytes(stat.totalSize)} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Per-Drive Utilization & Quota Comparison */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900">Perbandingan Kuota per Akun Drive</h3>
            </div>
            <span className="text-[11px] font-medium text-gray-400">{accounts.length} Akun</span>
          </div>

          <div className="space-y-3 pt-1">
            {accounts.map((acc) => {
              const usagePct = acc.storageLimit > 0 ? (acc.storageUsed / acc.storageLimit) * 100 : 0;
              const fileCount = files.filter((f) => f.accountId === acc.id).length;

              return (
                <div
                  key={acc.id}
                  className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-xs space-y-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: acc.color }}
                      />
                      <span className="font-bold text-gray-900">{acc.name}</span>
                      <span className="text-[11px] text-gray-400 font-mono">({acc.email})</span>
                    </div>

                    <button
                      onClick={() => onSelectAccountFilter(acc.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {fileCount} Berkas ➔
                    </button>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, usagePct)}%`,
                        backgroundColor: acc.color,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Terpakai: <strong className="text-gray-700">{formatBytes(acc.storageUsed)}</strong> / {formatBytes(acc.storageLimit)}</span>
                    <span className="font-medium text-green-700">Sisa {formatBytes(acc.storageAvailable)} ({usagePct.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
