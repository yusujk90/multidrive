import React, { useState, useMemo } from 'react';
import {
  Search,
  Grid,
  List,
  Upload,
  FolderPlus,
  Filter,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image,
  Video,
  Music,
  File,
  Folder,
  MoreVertical,
  ExternalLink,
  Download,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Layers,
  Sparkles,
  Cloud,
  ChevronDown,
} from 'lucide-react';
import { UnifiedFile, DriveAccount } from '../types';
import { formatBytes, getFileCategory } from '../services/storagePoolManager';

interface FileExplorerProps {
  files: UnifiedFile[];
  accounts: DriveAccount[];
  selectedAccountId: string | null;
  onSelectAccountId: (id: string | null) => void;
  onOpenFileUpload: () => void;
  onOpenFileDetails: (file: UnifiedFile) => void;
  onDownloadFile: (file: UnifiedFile) => void;
  onDeleteFile: (file: UnifiedFile) => void;
  onCrossDriveCopy: (file: UnifiedFile, targetAccountId: string) => void;
  onCreateFolder: (folderName: string, accountId: string) => void;
  onDropFilesUpload: (droppedFiles: FileList) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  accounts,
  selectedAccountId,
  onSelectAccountId,
  onOpenFileUpload,
  onOpenFileDetails,
  onDownloadFile,
  onDeleteFile,
  onCrossDriveCopy,
  onCreateFolder,
  onDropFilesUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified' | 'account'>('modified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeActionMenuFileId, setActiveActionMenuFileId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [targetFolderAccountId, setTargetFolderAccountId] = useState(accounts[0]?.id || '');

  // Filtered & Sorted files
  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        // Account filter
        if (selectedAccountId && file.accountId !== selectedAccountId) {
          return false;
        }
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = file.name.toLowerCase().includes(q);
          const matchAccount = file.accountName.toLowerCase().includes(q) || file.accountEmail.toLowerCase().includes(q);
          if (!matchName && !matchAccount) return false;
        }
        // Category filter
        if (categoryFilter !== 'all') {
          const cat = getFileCategory(file.mimeType, file.name);
          if (cat !== categoryFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'name') {
          cmp = a.name.localeCompare(b.name);
        } else if (sortBy === 'size') {
          cmp = (a.size || 0) - (b.size || 0);
        } else if (sortBy === 'modified') {
          cmp = new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime();
        } else if (sortBy === 'account') {
          cmp = a.accountName.localeCompare(b.accountName);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [files, selectedAccountId, searchQuery, categoryFilter, sortBy, sortOrder]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFilesUpload(e.dataTransfer.files);
    }
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    const category = getFileCategory(mimeType, fileName);
    switch (category) {
      case 'folder':
        return <Folder className="h-4 w-4 text-amber-500 fill-amber-100" />;
      case 'image':
        return <Image className="h-4 w-4 text-purple-600" />;
      case 'video':
        return <Video className="h-4 w-4 text-red-500" />;
      case 'audio':
        return <Music className="h-4 w-4 text-pink-500" />;
      case 'archive':
        return <FileArchive className="h-4 w-4 text-emerald-600" />;
      case 'document':
        if (fileName.match(/\.(xlsx|xls|csv)$/i) || mimeType.includes('sheet')) {
          return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
        }
        return <FileText className="h-4 w-4 text-indigo-600" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !targetFolderAccountId) return;
    onCreateFolder(newFolderName.trim(), targetFolderAccountId);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`space-y-6 transition-colors rounded-2xl ${
        isDragOver ? 'bg-indigo-50/50 outline-2 outline-dashed outline-indigo-400 p-2' : ''
      }`}
    >
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Unified File Explorer
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Semua berkas dari seluruh akun Google Drive Anda dalam satu direktori virtual terpadu
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="explorer-create-folder-btn"
            onClick={() => setShowNewFolderModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 active:scale-98 transition-all"
          >
            <FolderPlus className="h-4 w-4 text-gray-500" />
            <span>Buat Folder</span>
          </button>

          <button
            id="explorer-upload-btn"
            onClick={onOpenFileUpload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-98 transition-all"
          >
            <Upload className="h-4 w-4" />
            <span>Unggah Berkas</span>
          </button>
        </div>
      </div>

      {/* Account Switcher / Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSelectAccountId(null)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
            selectedAccountId === null
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Semua Drive ({files.length})
        </button>

        {accounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id;
          const count = files.filter((f) => f.accountId === acc.id).length;
          return (
            <button
              key={acc.id}
              onClick={() => onSelectAccountId(isSelected ? null : acc.id)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: acc.color }}
              />
              <span>{acc.name}</span>
              <span className="text-[11px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Main Filter & View Control Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search & Category Pills */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama berkas..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
            />
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'document', label: 'Dokumen' },
              { id: 'image', label: 'Foto' },
              { id: 'video', label: 'Video' },
              { id: 'archive', label: 'Arsip' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sorting & Layout Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-gray-200 bg-white py-1.5 px-2.5 text-xs text-gray-700 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="modified">Terbaru Dimodifikasi</option>
            <option value="name">Nama Berkas (A-Z)</option>
            <option value="size">Ukuran Berkas</option>
            <option value="account">Akun Drive</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title="Ubah Urutan"
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Display: Table or Grid */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 text-[11px] uppercase tracking-wider bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-5 font-semibold">Nama Berkas</th>
                  <th className="py-3 px-5 font-semibold">Disimpan di Google Drive</th>
                  <th className="py-3 px-5 font-semibold">Ukuran</th>
                  <th className="py-3 px-5 font-semibold">Terakhir Diubah</th>
                  <th className="py-3 px-5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-gray-50/60 transition-colors group cursor-pointer"
                    onClick={() => onOpenFileDetails(file)}
                  >
                    {/* File Name + Icon */}
                    <td className="py-3 px-5 font-medium text-gray-900 truncate max-w-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 shrink-0">
                          {getFileIcon(file.mimeType, file.name)}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-gray-900 truncate block" title={file.name}>
                            {file.name}
                          </span>
                          {file.syncStatus === 'replicated' && (
                            <span className="text-[10px] text-indigo-600 font-medium">
                              ● Replikasi Aktif
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Account Indicator */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: file.accountColor }}
                        />
                        <span className="text-gray-700 font-medium truncate max-w-[150px]">
                          {file.accountName}
                        </span>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-5 font-mono text-gray-500">
                      {file.isFolder ? '-' : formatBytes(file.size)}
                    </td>

                    {/* Modified Time */}
                    <td className="py-3 px-5 text-gray-400">
                      {new Date(file.modifiedTime).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onDownloadFile(file)}
                          title="Unduh Berkas"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            title="Buka di Drive"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => onDeleteFile(file)}
                          title="Hapus Berkas"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredFiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                      Tidak ada berkas yang sesuai dengan filter atau pencarian Anda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => onOpenFileDetails(file)}
              className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div>
                <div className="w-full h-24 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-indigo-50/50 transition-colors mb-2.5">
                  {getFileIcon(file.mimeType, file.name)}
                </div>

                <h4 className="text-xs font-bold text-gray-900 truncate" title={file.name}>
                  {file.name}
                </h4>

                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: file.accountColor }}
                  />
                  <span className="text-[10px] text-gray-500 truncate">{file.accountName}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>{file.isFolder ? 'Folder' : formatBytes(file.size)}</span>
                <span className="text-indigo-600 font-semibold group-hover:underline">Detail ➔</span>
              </div>
            </div>
          ))}

          {filteredFiles.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 text-xs bg-white rounded-xl border border-gray-200">
              Tidak ada berkas yang ditemukan.
            </div>
          )}
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Buat Folder Baru di Google Drive</h3>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nama Folder
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Misal: Dokumen Proyek 2026"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Simpan di Akun Google Drive:
                </label>
                <select
                  value={targetFolderAccountId}
                  onChange={(e) => setTargetFolderAccountId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatBytes(acc.storageAvailable)} bebas)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
                >
                  Buat Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
