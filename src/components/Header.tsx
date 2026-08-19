import React, { useEffect, useState } from 'react';
import {
  HardDrive,
  RefreshCw,
  Plus,
  Zap,
  FolderTree,
  SlidersHorizontal,
  Layers,
  Sparkles,
  CheckCircle2,
  Search,
  Cloud,
  Menu,
  Wifi,
  WifiOff,
  Upload,
} from 'lucide-react';
import { StoragePoolSummary, DriveAccount } from '../types';
import { TabType } from './Sidebar';
import { formatBytes } from '../services/storagePoolManager';
import { checkBackendConnectivity, ConnectivityStatus } from '../services/backendApi';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  poolSummary: StoragePoolSummary;
  accounts: DriveAccount[];
  isSyncing: boolean;
  onSyncAll: () => void;
  onOpenConnectModal: () => void;
  onOpenFileUpload?: () => void;
  autoSyncEnabled: boolean;
  onToggleAutoSync: () => void;
  onToggleMobileSidebar?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenPolyglotModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  poolSummary,
  accounts,
  isSyncing,
  onSyncAll,
  onOpenConnectModal,
  onOpenFileUpload,
  autoSyncEnabled,
  onToggleAutoSync,
  onToggleMobileSidebar,
  searchQuery = '',
  onSearchChange,
  onOpenPolyglotModal,
}) => {
  const [connStatus, setConnStatus] = useState<ConnectivityStatus | null>(null);

  useEffect(() => {
    const check = async () => {
      const st = await checkBackendConnectivity();
      setConnStatus(st);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 sticky top-0">
      {/* Left: Brand / Logo */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Buka Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs">
            <div className="w-4 h-4 border-2 border-white rounded-xs"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 tracking-tight">
                OmniDrive
              </span>
              <span className="hidden sm:inline-flex text-[10px] uppercase font-semibold tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                Storage Pool
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center / Search bar & Live Backend Status */}
      <div className="hidden md:flex items-center gap-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Cari berkas di semua Drive..."
            className="w-48 lg:w-72 bg-gray-100 border-none rounded-full py-1.5 px-4 pl-9 text-xs text-gray-700 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all"
          />
          <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Backend & Internet Connectivity Pill */}
        <div
          title={
            connStatus?.connected
              ? `Backend & Internet Terhubung (${connStatus.latencyMs}ms ke Google Drive API)`
              : 'Memeriksa koneksi internet / backend...'
          }
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
            connStatus?.connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}
        >
          {connStatus?.connected ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online • {connStatus.latencyMs ? `${connStatus.latencyMs}ms` : 'Google API'}</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
              <span>Koneksi...</span>
            </>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Auto Sync indicator badge */}
        <button
          id="header-toggle-autosync"
          onClick={onToggleAutoSync}
          title={autoSyncEnabled ? 'Auto-Sync Aktif' : 'Auto-Sync Dinonaktifkan'}
          className={`hidden lg:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
            autoSyncEnabled
              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          <span className="relative flex h-2 w-2">
            {autoSyncEnabled && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                autoSyncEnabled ? 'bg-green-500' : 'bg-gray-400'
              }`}
            ></span>
          </span>
          <span className="text-[11px]">{autoSyncEnabled ? 'Sync Aktif' : 'Sync Jeda'}</span>
        </button>

        {/* Sync Now Button */}
        <button
          id="header-sync-all-btn"
          onClick={onSyncAll}
          disabled={isSyncing || accounts.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 active:scale-98 transition-all disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-gray-500 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`}
          />
          <span className="hidden sm:inline">
            {isSyncing ? 'Menyinkronkan...' : 'Sinkron'}
          </span>
        </button>

        {/* Upload Button */}
        {onOpenPolyglotModal && (
          <button
            id="header-polyglot-btn"
            onClick={onOpenPolyglotModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 active:scale-98 transition-all"
            title="Polyglot Microservices (Rust WASM • Python AI • Go Worker)"
          >
            <Zap className="h-3.5 w-3.5 text-amber-600" />
            <span className="hidden xl:inline">Polyglot Core</span>
            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-full font-mono">
              WASM • Py • Go
            </span>
          </button>
        )}

        {onOpenFileUpload && (
          <button
            id="header-upload-btn"
            onClick={onOpenFileUpload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-98 transition-all"
          >
            <Upload className="h-3.5 w-3.5 text-indigo-600" />
            <span>Unggah Berkas</span>
          </button>
        )}

        {/* Add Account Button */}
        <button
          id="header-add-account-btn"
          onClick={onOpenConnectModal}
          className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-indigo-700 active:scale-98 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah Akun</span>
        </button>

        {/* User / Multi-Drive Avatar Cluster */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 overflow-hidden border border-gray-300">
            {accounts[0]?.photoUrl ? (
              <img
                src={accounts[0].photoUrl}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{accounts[0]?.name ? accounts[0].name.charAt(0).toUpperCase() : 'U'}</span>
            )}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-medium text-gray-900 truncate max-w-[100px]">
              {accounts[0]?.name || 'Storage Pool'}
            </div>
            <div className="text-[10px] text-gray-500">
              {accounts.length} Akun Drive
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
