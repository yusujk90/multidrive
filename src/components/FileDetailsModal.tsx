import React, { useState } from 'react';
import {
  X,
  File,
  Download,
  ExternalLink,
  Copy,
  Trash2,
  HardDrive,
  Calendar,
  Cloud,
  CheckCircle2,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';
import { UnifiedFile, DriveAccount } from '../types';
import { formatBytes, getFileCategory } from '../services/storagePoolManager';

interface FileDetailsModalProps {
  file: UnifiedFile | null;
  accounts: DriveAccount[];
  onClose: () => void;
  onDownload: (file: UnifiedFile) => void;
  onDelete: (file: UnifiedFile) => void;
  onCrossDriveCopy: (file: UnifiedFile, targetAccountId: string) => void;
}

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({
  file,
  accounts,
  onClose,
  onDownload,
  onDelete,
  onCrossDriveCopy,
}) => {
  const [selectedTargetAccountId, setSelectedTargetAccountId] = useState(
    accounts.find((a) => a.id !== file?.accountId)?.id || accounts[0]?.id || ''
  );
  const [isCopying, setIsCopying] = useState(false);

  if (!file) return null;

  const otherAccounts = accounts.filter((a) => a.id !== file.accountId);

  const handleCopyClick = async () => {
    if (!selectedTargetAccountId) return;
    setIsCopying(true);
    try {
      await onCrossDriveCopy(file, selectedTargetAccountId);
      setTimeout(() => {
        setIsCopying(false);
        onClose();
      }, 500);
    } catch (err) {
      setIsCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-md">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0 shadow-xs">
              <File className="h-4 w-4" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-gray-900 truncate" title={file.name}>
                {file.name}
              </h3>
              <p className="text-[11px] text-gray-500">Detail Berkas & Operasi Multi-Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          
          {/* Metadata Grid */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ukuran Berkas</span>
              <p className="mt-0.5 font-bold text-gray-800 font-mono">
                {file.size ? formatBytes(file.size) : '0 B'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tipe Format</span>
              <p className="mt-0.5 font-medium text-gray-800 truncate" title={file.mimeType}>
                {file.mimeType}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Disimpan di Google Drive</span>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: file.accountColor }}
                />
                <span className="font-semibold text-gray-900 truncate">
                  {file.accountName}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Terakhir Dimodifikasi</span>
              <p className="mt-0.5 text-gray-700">
                {new Date(file.modifiedTime).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Cross-Drive Replication & Transfer Box */}
          {otherAccounts.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
                <span>Salin Berkas ke Google Drive Lain (Cross-Drive Copy)</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Duplikasi berkas ini langsung ke akun Google Drive Anda yang lain untuk membuat cadangan tanpa perlu unduh-unggah manual.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <select
                  value={selectedTargetAccountId}
                  onChange={(e) => setSelectedTargetAccountId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-indigo-500 focus:outline-hidden"
                >
                  {otherAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatBytes(acc.storageAvailable)} sisa)
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleCopyClick}
                  disabled={isCopying}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-98 disabled:opacity-50 transition-all shadow-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{isCopying ? 'Menyalin...' : 'Salin Sekarang'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onDownload(file)}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <Download className="h-4 w-4 text-gray-600" />
              <span>Unduh Berkas</span>
            </button>

            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-2xs"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Buka di Google Drive</span>
              </a>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 bg-gray-50">
          <button
            onClick={() => {
              onDelete(file);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Hapus Berkas</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
