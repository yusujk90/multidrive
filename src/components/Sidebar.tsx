import React from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  FolderOpen,
  RefreshCw,
  BarChart3,
  Sparkles,
  Bot,
  Upload,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { StoragePoolSummary, DriveAccount } from '../types';
import { formatBytes } from '../services/storagePoolManager';

export type TabType = 'overview' | 'explorer' | 'sync' | 'analytics' | 'ai';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  poolSummary: StoragePoolSummary;
  accounts: DriveAccount[];
  onOpenConnectModal: () => void;
  onTriggerRebalance: () => void;
  onOpenFileUpload?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  poolSummary,
  accounts,
  onOpenConnectModal,
  onTriggerRebalance,
  onOpenFileUpload,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'overview' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Ringkasan Multi-Drive',
    },
    {
      id: 'explorer' as TabType,
      label: 'Connected Drives',
      icon: FolderOpen,
      desc: 'Jelajah Berkas Gabungan',
    },
    {
      id: 'sync' as TabType,
      label: 'Sync History & Rules',
      icon: RefreshCw,
      desc: 'Sinkronisasi Otomatis',
    },
    {
      id: 'analytics' as TabType,
      label: 'Capacity Analytics',
      icon: BarChart3,
      desc: 'Distribusi & Penyeimbang',
    },
    {
      id: 'ai' as TabType,
      label: 'Gemini AI Assistant',
      icon: Bot,
      desc: 'Audit & Multi-Turn Chat',
      isSpecial: true,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200/80 p-5 flex flex-col gap-6 shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Storage Pool Mini Widget */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-1"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Storage Pool
            </h3>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
              Active
            </span>
          </div>
          
          <div className="p-3.5 bg-gradient-to-br from-indigo-50/90 to-purple-50/60 rounded-2xl border border-indigo-100/90 shadow-xs hover:shadow-sm transition-all">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-indigo-600" />
                Total Pool
              </span>
              <span className="text-indigo-700 font-bold">
                {poolSummary.usedPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, poolSummary.usedPercentage)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full"
              />
            </div>
            <p className="text-[11px] text-indigo-900 font-semibold mt-2.5">
              {formatBytes(poolSummary.totalUsed)} / {formatBytes(poolSummary.totalLimit)} used
            </p>
            <p className="text-[10px] text-indigo-600/90 font-medium mt-0.5">
              +{formatBytes(poolSummary.totalAvailable)} sisa bebas
            </p>

            {/* Quick Action Buttons */}
            <div className="mt-3.5 pt-2.5 border-t border-indigo-100 flex items-center gap-2">
              {onOpenFileUpload && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  id="sidebar-upload-btn"
                  onClick={() => {
                    onOpenFileUpload();
                    onCloseMobile?.();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-1.5 px-2.5 text-[11px] font-semibold shadow-xs transition-all"
                >
                  <Upload className="h-3 w-3" />
                  <span>Unggah</span>
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                id="sidebar-rebalance-btn"
                onClick={() => {
                  onTriggerRebalance();
                  onCloseMobile?.();
                }}
                className="inline-flex items-center justify-center gap-1 bg-white hover:bg-indigo-50/80 text-indigo-700 border border-indigo-200/80 rounded-xl py-1.5 px-2.5 text-[11px] font-semibold shadow-2xs transition-all"
                title="Buka Smart Auto-Balancer"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Balancing</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                id={`nav-${item.id}-btn`}
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left relative overflow-hidden ${
                  isActive
                    ? item.isSpecial
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold shadow-md shadow-indigo-500/25'
                      : 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100/80 shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3 truncate z-10">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isActive ? (item.isSpecial ? 'text-white' : 'text-indigo-600') : 'text-gray-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.isSpecial && !isActive && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">
                    AI
                  </span>
                )}
                {isActive && !item.isSpecial && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="w-1.5 h-4 rounded-full bg-indigo-600"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Connected Drives Quick Indicators */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Drives ({accounts.length})
            </h4>
            <button
              id="sidebar-add-drive-btn"
              onClick={onOpenConnectModal}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
            >
              + Hubungkan
            </button>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {accounts.map((acc, accIdx) => {
              const usagePct = acc.storageLimit > 0 ? (acc.storageUsed / acc.storageLimit) * 100 : 0;
              return (
                <motion.div
                  key={acc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: accIdx * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 text-[11px] hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center gap-2 truncate max-w-[130px]">
                    <span
                      className="h-2 w-2 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: acc.color }}
                    />
                    <span className="truncate font-semibold text-gray-800">{acc.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono font-medium">
                    {usagePct.toFixed(0)}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom AI Assistant Feature Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="mt-auto p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-2xl text-white shadow-lg border border-indigo-900/50 relative overflow-hidden"
        >
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            <p className="text-xs font-bold text-gray-100">Gemini 3 Intelligence</p>
          </div>
          <p className="text-[10px] mt-1.5 text-slate-300 leading-relaxed">
            Didukung Flash-Lite berlatensi rendah, Search Grounding Google, & High Thinking mode.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            id="sidebar-open-ai-btn"
            onClick={() => setActiveTab('ai')}
            className="w-full mt-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            Buka AI Assistant
          </motion.button>
        </motion.div>
      </aside>
    </>
  );
};
