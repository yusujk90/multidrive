import React, { useState } from 'react';
import {
  X,
  Plus,
  HardDrive,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { DriveAccount } from '../types';
import { formatBytes } from '../services/storagePoolManager';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: DriveAccount[];
  onConnectRealAccount: () => Promise<void>;
  onAddDemoAccount: (name: string, email: string) => void;
  isConnecting: boolean;
}

export const AccountManagerModal: React.FC<AccountManagerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onConnectRealAccount,
  onAddDemoAccount,
  isConnecting,
}) => {
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnectClick = async () => {
    setErrorMsg(null);
    try {
      await onConnectRealAccount();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyambungkan akun Google.');
    }
  };

  const handleAddDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName.trim() || !demoEmail.trim()) return;
    onAddDemoAccount(demoName.trim(), demoEmail.trim());
    setDemoName('');
    setDemoEmail('');
    setShowDemoForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Hubungkan Akun Google Drive</h3>
              <p className="text-[11px] text-gray-500">Dapatkan +15 GB kuota gratis untuk setiap akun</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Promo Benefit Box */}
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-xs text-indigo-950 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-indigo-900">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Multi-Account Free Storage Pooling</span>
            </div>
            <p className="leading-relaxed text-[11px] text-indigo-800">
              Setiap akun Google yang Anda hubungkan menambahkan <strong>15 GB penyimpanan cloud gratis</strong> ke dalam pool terpadu ini. Sambungkan 3 akun = <strong>45 GB</strong>, 5 akun = <strong>75 GB</strong> gratis!
            </p>
          </div>

          {/* Official Google Sign In Button */}
          <div className="space-y-2 text-center pt-1">
            <p className="text-xs font-semibold text-gray-700">
              Masuk dengan akun Google Anda:
            </p>

            <button
              id="google-sign-in-btn"
              onClick={handleConnectClick}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-300 active:scale-98 transition-all disabled:opacity-50"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              <span>{isConnecting ? 'Membuka Google OAuth Popup...' : 'Sign in with Google'}</span>
            </button>

            {errorMsg && (
              <div className="flex items-center gap-1.5 rounded-lg bg-red-50 p-2.5 text-[11px] text-red-700 text-left border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Connected Accounts Quick List */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Akun yang sudah terhubung ({accounts.length}):
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 p-2 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: acc.color }}
                    />
                    <div className="truncate">
                      <span className="font-semibold text-gray-800">{acc.name}</span>
                      <span className="text-gray-400 text-[11px] ml-1 font-mono">({acc.email})</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-green-700 shrink-0">
                    +{formatBytes(acc.storageLimit)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sandbox Demo Account Accordion */}
          <div className="pt-2 border-t border-gray-100">
            {!showDemoForm ? (
              <button
                type="button"
                onClick={() => setShowDemoForm(true)}
                className="w-full text-center text-xs text-gray-500 hover:text-indigo-600 font-medium py-1 transition-colors"
              >
                + Tambah Akun Sandbox / Simulasi Tambahan
              </button>
            ) : (
              <form onSubmit={handleAddDemoSubmit} className="space-y-3 rounded-xl bg-gray-50 p-3.5 text-xs border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">Simulasi Akun Google Baru (+15 GB)</span>
                  <button
                    type="button"
                    onClick={() => setShowDemoForm(false)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Tutup
                  </button>
                </div>
                <div>
                  <input
                    type="text"
                    required
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    placeholder="Nama Akun (misal: Akun Drive Kampus)"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    required
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    placeholder="Email (misal: kampus.drive@gmail.com)"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-gray-900 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 shadow-xs"
                >
                  Tambahkan Akun Simulasi (+15 GB)
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5 bg-gray-50">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            <span>Koneksi aman via Google OAuth 2.0</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
