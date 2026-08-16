import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  X,
  Zap,
  HardDrive,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  FolderUp,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image,
  Video,
  Music,
  File,
} from 'lucide-react';
import { DriveAccount, AllocationStrategy } from '../types';
import { formatBytes, selectTargetDrive, getFileCategory } from '../services/storagePoolManager';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: DriveAccount[];
  onUploadSubmit: (
    files: File[],
    strategy: AllocationStrategy,
    manualAccountId?: string
  ) => Promise<void>;
  preloadedFiles?: FileList | null;
  defaultAccountId?: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onUploadSubmit,
  preloadedFiles,
  defaultAccountId,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [strategy, setStrategy] = useState<AllocationStrategy>(
    defaultAccountId ? 'manual' : 'max_free_space'
  );
  const [manualAccountId, setManualAccountId] = useState<string>(
    defaultAccountId || accounts[0]?.id || ''
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preloadedFiles && preloadedFiles.length > 0) {
      setSelectedFiles(Array.from(preloadedFiles));
    }
  }, [preloadedFiles]);

  useEffect(() => {
    if (defaultAccountId) {
      setManualAccountId(defaultAccountId);
      setStrategy('manual');
    }
  }, [defaultAccountId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  // Compute preview destination for each file based on the chosen strategy
  const previewAllocation = selectedFiles.map((file, idx) => {
    try {
      const { targetAccount, reason } = selectTargetDrive(
        accounts,
        strategy,
        file.size,
        strategy === 'manual' ? manualAccountId : undefined,
        idx
      );
      return {
        file,
        targetAccount,
        reason,
      };
    } catch {
      return {
        file,
        targetAccount: accounts[0],
        reason: 'Default Drive',
      };
    }
  });

  const getFileIcon = (file: File) => {
    const cat = getFileCategory(file.type || '', file.name);
    switch (cat) {
      case 'image':
        return <Image className="h-3.5 w-3.5 text-purple-600 shrink-0" />;
      case 'video':
        return <Video className="h-3.5 w-3.5 text-red-500 shrink-0" />;
      case 'audio':
        return <Music className="h-3.5 w-3.5 text-pink-500 shrink-0" />;
      case 'archive':
        return <FileArchive className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
      case 'document':
        if (file.name.match(/\.(xlsx|xls|csv)$/i) || file.type.includes('sheet')) {
          return <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
        }
        return <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />;
      default:
        return <File className="h-3.5 w-3.5 text-gray-500 shrink-0" />;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 90 ? p + 20 : p));
      }, 300);

      await onUploadSubmit(
        selectedFiles,
        strategy,
        strategy === 'manual' ? manualAccountId : undefined
      );

      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        onClose();
        setSelectedFiles([]);
      }, 600);
    } catch (err: any) {
      setIsUploading(false);
      alert(`Gagal mengunggah berkas: ${err.message || err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Unggah Berkas ke Multi-Drive Storage Pool
              </h3>
              <p className="text-xs text-gray-500">
                Smart Balancer secara cerdas mendistribusikan berkas ke Google Drive terbaik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1 text-xs">
          {/* File & Folder Pick Buttons / Drag Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-all ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                : selectedFiles.length === 0
                ? 'border-gray-200 bg-gray-50/80 hover:border-indigo-400 hover:bg-indigo-50/30'
                : 'border-gray-200 bg-white'
            }`}
          >
            {selectedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Seret & Jatuhkan Berkas ke Sini
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    atau gunakan tombol di bawah untuk memilih berkas atau folder utuh
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-98 transition-all"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Pilih Berkas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 active:scale-98 transition-all"
                  >
                    <FolderUp className="h-3.5 w-3.5 text-amber-500" />
                    <span>Unggah Folder</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-900">
                      {selectedFiles.length} Berkas Siap Diunggah
                    </span>
                    <span className="text-gray-400 font-mono text-[11px] ml-2">
                      (Total: {formatBytes(totalBytes)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      + Tambah Berkas
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllFiles}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>

                {/* Selected Files List with Allocation Destination */}
                <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-gray-50/50 text-left">
                  {previewAllocation.map(({ file, targetAccount, reason }, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 text-xs hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-sm">
                        {getFileIcon(file)}
                        <span className="font-medium text-gray-900 truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-gray-400 font-mono text-[10px] shrink-0">
                          {formatBytes(file.size)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white font-medium shadow-2xs text-[10px]"
                            style={{ backgroundColor: targetAccount?.color || '#4f46e5' }}
                          >
                            <HardDrive className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[90px]">
                              {targetAccount?.name.split(' ')[0] || 'Drive'}
                            </span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                          className="rounded-md p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden Inputs */}
            <input
              ref={fileInputRef}
              id="file-upload-input"
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              id="folder-upload-input"
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderChange}
              className="hidden"
            />
          </div>

          {/* Allocation Strategy Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-gray-800">
              Strategi Alokasi Penyimpanan (Load Balancing)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Max Free Space */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  strategy === 'max_free_space'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value="max_free_space"
                  checked={strategy === 'max_free_space'}
                  onChange={() => setStrategy('max_free_space')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>Ruang Kosong Terbanyak</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">
                    Otomatis menyimpan di Google Drive dengan sisa kuota gigabyte terbesar.
                  </p>
                </div>
              </label>

              {/* Option 2: Percentage / Balanced Fill */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  strategy === 'balanced_fill'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value="balanced_fill"
                  checked={strategy === 'balanced_fill'}
                  onChange={() => setStrategy('balanced_fill')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Penyeimbang Persentase</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">
                    Menyeimbangkan persentase (%) penggunaan di setiap drive secara merata.
                  </p>
                </div>
              </label>

              {/* Option 3: Round Robin */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  strategy === 'round_robin'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value="round_robin"
                  checked={strategy === 'round_robin'}
                  onChange={() => setStrategy('round_robin')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                    <Layers className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Distribusi Bergantian</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">
                    Membagi berkas secara bergiliran (round-robin) ke setiap akun drive.
                  </p>
                </div>
              </label>

              {/* Option 4: Manual Specific Account */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  strategy === 'manual'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value="manual"
                  checked={strategy === 'manual'}
                  onChange={() => setStrategy('manual')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                    <HardDrive className="h-3.5 w-3.5 text-gray-600" />
                    <span>Pilih Akun Manual</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">
                    Tentukan akun Google Drive tertentu secara manual.
                  </p>
                </div>
              </label>
            </div>

            {/* Manual Account Selector */}
            {strategy === 'manual' && (
              <div className="pt-2 rounded-xl bg-gray-50 border border-gray-200 p-3">
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Pilih Akun Tujuan:
                </label>
                <select
                  value={manualAccountId}
                  onChange={(e) => setManualAccountId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.email}) — Sisa {formatBytes(acc.storageAvailable)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2 rounded-xl bg-indigo-50 border border-indigo-100 p-4">
              <div className="flex justify-between text-xs font-semibold text-indigo-950">
                <span>Mengunggah dan mendistribusikan berkas...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-200">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-indigo-700">
                Smart Balancer memverifikasi kuota dan menyinkronkan ke Google Drive...
              </p>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Otomatis sinkron ke storage pool terpadu</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                id="file-upload-submit-btn"
                type="submit"
                disabled={selectedFiles.length === 0 || isUploading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-98 disabled:opacity-50 transition-all"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>
                  {isUploading
                    ? 'Sedang Mengunggah...'
                    : `Unggah Sekarang (${selectedFiles.length} Berkas)`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
