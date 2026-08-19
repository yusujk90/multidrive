import React from 'react';
import { motion } from 'motion/react';
import {
  HardDrive,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRightLeft,
  Sparkles,
  Check,
  AlertCircle,
  Database,
  Cloud,
  FileText,
  Clock,
  ArrowUpRight,
  Upload,
  Activity,
  CheckCircle2,
  Layers,
  PieChart,
  HardDriveDownload,
} from 'lucide-react';
import { DriveAccount, StoragePoolSummary, UnifiedFile } from '../types';
import { formatBytes } from '../services/storagePoolManager';

interface StorageOverviewProps {
  accounts: DriveAccount[];
  poolSummary: StoragePoolSummary;
  files: UnifiedFile[];
  onOpenConnectModal: () => void;
  onRefreshAccount: (accountId: string) => void;
  onRemoveAccount: (accountId: string) => void;
  onSetPrimaryAccount: (accountId: string) => void;
  onSelectAccountFilter: (accountId: string) => void;
  onTriggerRebalance: () => void;
  onOpenFileUpload?: (accountId?: string) => void;
  onRelinkAccount?: (accountId: string) => void;
}

export const StorageOverview: React.FC<StorageOverviewProps> = ({
  accounts,
  poolSummary,
  files,
  onOpenConnectModal,
  onRefreshAccount,
  onRemoveAccount,
  onSetPrimaryAccount,
  onSelectAccountFilter,
  onTriggerRebalance,
  onOpenFileUpload,
  onRelinkAccount,
}) => {
  // Health calculations
  const highUsageAccounts = accounts.filter(
    (a) => a.storageLimit > 0 && (a.storageUsed / a.storageLimit) * 100 > 85
  );
  const expiredAccounts = accounts.filter((a) => a.status === 'expired');
  const isHealthy = highUsageAccounts.length === 0 && expiredAccounts.length === 0 && accounts.length > 0;
  const primaryAccount = accounts.find((a) => a.isPrimary) || accounts[0];

  // Recent files (last 6)
  const recentFiles = [...files]
    .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      
      {/* Expired Accounts Warning Banner */}
      {expiredAccounts.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-xl text-red-600 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-950">
                  {expiredAccounts.length} Akun Google Drive Memerlukan Otentikasi Ulang (401 UNAUTHENTICATED)
                </h4>
                <p className="text-xs text-red-700 mt-0.5">
                  Sesi Google OAuth untuk akun berikut telah berakhir. Klik tombol <strong>Hubungkan Ulang</strong> untuk memperbarui token akses.
                </p>
              </div>
            </div>
            {onRelinkAccount && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {expiredAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => onRelinkAccount(acc.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs active:scale-98 transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Re-link {acc.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Unified Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Mengelola {accounts.length} akun Google Drive dalam satu volume logis terpadu ({formatBytes(poolSummary.totalLimit)} total)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {onOpenFileUpload && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              id="overview-upload-btn"
              onClick={() => onOpenFileUpload()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-98 transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Unggah Berkas</span>
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            id="overview-rebalance-btn"
            onClick={onTriggerRebalance}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-98 transition-all"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Auto-Balancer</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenConnectModal}
            className="border border-gray-200/90 bg-white text-gray-700 hover:bg-gray-50 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98 transition-all"
          >
            <Plus className="h-4 w-4 text-indigo-600" />
            <span>Tambah Akun</span>
          </motion.button>
        </div>
      </div>

      {/* QUICK STATUS PANEL */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-indigo-500" />
            Quick Status & Health Summary
          </h3>
          <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Real-time Pool Monitor
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: System Health */}
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Kesehatan Pool</span>
              <div
                className={`p-1.5 rounded-xl ${
                  isHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}
              >
                {isHealthy ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                {isHealthy ? 'Optimal (100%)' : 'Perlu Penyeimbangan'}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isHealthy
                  ? 'Semua drive memiliki kapasitas aman'
                  : `${highUsageAccounts.length} drive mendekati batas >85%`}
              </p>
            </div>
          </motion.div>

          {/* Card 2: Total Pool Capacity */}
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Kapasitas Pool Terpadu</span>
              <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                <HardDrive className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-bold text-gray-900">
                {formatBytes(poolSummary.totalLimit)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 mt-0.5">
                <span>Terpakai {poolSummary.usedPercentage.toFixed(0)}%</span>
                <span className="font-semibold text-indigo-600">
                  {formatBytes(poolSummary.totalAvailable)} sisa
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Files & Density */}
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Total Berkas Terindeks</span>
              <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-bold text-gray-900">
                {files.length} <span className="text-xs font-normal text-gray-500">berkas</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Terdistribusi di {accounts.length} akun drive terhubung
              </p>
            </div>
          </motion.div>

          {/* Card 4: Primary Routing */}
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Rute Akun Utama</span>
              <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-base font-bold text-gray-900 truncate" title={primaryAccount?.name || 'None'}>
                {primaryAccount?.name || 'Belum dipilih'}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate" title={primaryAccount?.email}>
                {primaryAccount?.email || 'Tambahkan akun drive'}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Connected Cloud Accounts Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Connected Accounts & Quotas
          </h3>
          <span className="text-xs text-gray-500 font-medium">
            {accounts.length} Akun Terhubung
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const usagePct = account.storageLimit > 0
              ? (account.storageUsed / account.storageLimit) * 100
              : 0;
            const isHighUsage = usagePct > 85;
            const accountFiles = files.filter((f) => f.accountId === account.id);

            return (
              <div
                key={account.id}
                id={`account-card-${account.id}`}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold shadow-xs text-white"
                      style={{ backgroundColor: account.color }}
                    >
                      {account.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {account.isPrimary && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium uppercase border border-indigo-100">
                          Utama
                        </span>
                      )}
                      {account.status === 'expired' ? (
                        <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold uppercase border border-red-200 animate-pulse flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-red-600" />
                          <span>Expired (401)</span>
                        </span>
                      ) : account.status === 'demo' ? (
                        <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium uppercase">
                          Sandbox
                        </span>
                      ) : (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium uppercase">
                          Synced
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Email */}
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-gray-900 text-sm truncate" title={account.name}>
                      {account.name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate" title={account.email}>
                      {account.email}
                    </p>
                  </div>

                  {/* Expired warning prompt */}
                  {account.status === 'expired' && (
                    <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-red-900 font-bold text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                        <span>Sesi OAuth Berakhir (401)</span>
                      </div>
                      <p className="text-[11px] text-red-700 leading-tight">
                        Akses Google Drive untuk {account.email} memerlukan relink otentikasi.
                      </p>
                      {onRelinkAccount && (
                        <button
                          type="button"
                          onClick={() => onRelinkAccount(account.id)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs active:scale-98"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Hubungkan Ulang (Re-link)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Usage Info & Progress Bar */}
                  <div className="mt-4 flex justify-between text-[11px] mb-1.5">
                    <span className="text-gray-500 font-medium">
                      {formatBytes(account.storageUsed)} / {formatBytes(account.storageLimit)}
                    </span>
                    <span className={`font-semibold ${isHighUsage ? 'text-amber-600' : 'text-gray-700'}`}>
                      {usagePct.toFixed(0)}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, usagePct)}%`,
                        backgroundColor: isHighUsage ? '#f59e0b' : account.color,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                    <span>Sisa: <strong className="text-gray-700 font-medium">{formatBytes(account.storageAvailable)}</strong></span>
                    <span>{accountFiles.length} berkas</span>
                  </div>
                </div>

                {/* Footer action tools */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectAccountFilter(account.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Buka Berkas ➔
                    </button>
                    {onOpenFileUpload && (
                      <button
                        onClick={() => onOpenFileUpload(account.id)}
                        className="text-[11px] font-medium text-gray-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                        title="Unggah langsung ke akun drive ini"
                      >
                        <Upload className="h-3 w-3" />
                        <span>+ Unggah</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-gray-400">
                    <button
                      onClick={() => onRefreshAccount(account.id)}
                      title="Perbarui Kuota Drive"
                      className="p-1 rounded-md hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    {!account.isPrimary && (
                      <button
                        onClick={() => onSetPrimaryAccount(account.id)}
                        title="Jadikan Akun Utama"
                        className="p-1 rounded-md hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveAccount(account.id)}
                      title="Putuskan Sambungan"
                      className="p-1 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unified Storage Status & Load Balancer Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Aggregated Total Space Card */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Virtual Storage Pool Terpadu
                </h3>
                <p className="text-xs text-gray-500">
                  {accounts.length} Drive aktif digabungkan tanpa batas partisi
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-extrabold text-gray-900">
                {formatBytes(poolSummary.totalLimit)}
              </div>
              <span className="text-[10px] text-green-600 font-semibold uppercase bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                +{accounts.length * 15} GB Gratis
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-gray-600">
              <span>Terpakai: <strong className="text-gray-900">{formatBytes(poolSummary.totalUsed)}</strong> ({poolSummary.usedPercentage.toFixed(1)}%)</span>
              <span className="text-indigo-600 font-semibold">Tersedia: {formatBytes(poolSummary.totalAvailable)}</span>
            </div>

            {/* Segmented multi-drive progress */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 flex">
              {accounts.map((account) => {
                const pct = poolSummary.totalLimit > 0
                  ? (account.storageUsed / poolSummary.totalLimit) * 100
                  : 0;
                return (
                  <div
                    key={account.id}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: account.color,
                    }}
                    title={`${account.name}: ${formatBytes(account.storageUsed)}`}
                    className="h-full transition-all duration-500"
                  />
                );
              })}
            </div>

            {/* Legends */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-500">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color }}
                  />
                  <span className="truncate max-w-[120px] font-medium text-gray-700">{acc.name}</span>
                  <span className="text-gray-400 font-mono">({formatBytes(acc.storageUsed)})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Load Balancer Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Smart Balancer</h3>
              </div>
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium uppercase">
                Active
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Berkas baru secara otomatis dialokasikan ke akun Google Drive dengan sisa kuota terbanyak.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total Berkas: <strong className="text-gray-800">{files.length}</strong></span>
            <button
              onClick={onTriggerRebalance}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Jalankan Optimasi ➔
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activities & Syncs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Recent Activities & Syncs</h3>
            <p className="text-[11px] text-gray-500">Aktivitas penambahan berkas dan replikasi antar drive</p>
          </div>
          <button
            onClick={() => onSelectAccountFilter('')}
            className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
          >
            Lihat Semua Berkas
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-400 text-[11px] uppercase tracking-wider bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="py-3 px-6 font-semibold">Berkas</th>
                <th className="py-3 px-6 font-semibold">Akun Drive</th>
                <th className="py-3 px-6 font-semibold">Ukuran</th>
                <th className="py-3 px-6 font-semibold">Status</th>
                <th className="py-3 px-6 font-semibold">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {recentFiles.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-6 flex items-center gap-3 font-medium text-gray-900 truncate max-w-xs">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 shrink-0">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate" title={file.name}>{file.name}</span>
                  </td>
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: file.accountColor }}
                      />
                      <span className="truncate max-w-[140px] text-gray-600">{file.accountName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 font-mono text-gray-500">
                    {formatBytes(file.size)}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="text-green-600 font-medium flex items-center gap-1 text-xs">
                      ● <span className="text-[11px] font-semibold text-green-700">Complete</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-gray-400">
                    {new Date(file.modifiedTime).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                </tr>
              ))}
              {recentFiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                    Belum ada berkas yang diunggah ke Storage Pool.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
