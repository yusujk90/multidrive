import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  Cpu,
  FileCode2,
  Zap,
  Lock,
  Unlock,
  Key,
  FileText,
  Tag,
  ArrowRightLeft,
  CheckCircle2,
  Sparkles,
  Terminal,
  Activity,
} from 'lucide-react';
import {
  processRustWasmVaultEncrypt,
  processRustWasmVaultDecrypt,
  parseDocumentWithPythonAi,
  dispatchGoTransferWorker,
  PythonAiParserResult,
  GoTransferTaskResult,
} from '../services/polyglotServices';
import { EncryptedVaultPayload, HashResult } from '../wasm/wasmCrypto';

interface PolyglotServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PolyglotServicesModal: React.FC<PolyglotServicesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'rust' | 'python' | 'go'>('rust');

  // Rust WASM State
  const [vaultText, setVaultText] = useState('OmniDrive Confidential Storage Vault Data - 2026');
  const [passphrase, setPassphrase] = useState('SecretKey2026!OmniDrive');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptedResult, setEncryptedResult] = useState<{
    payload: EncryptedVaultPayload;
    hash: HashResult;
  } | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);

  // Python FastAPI State
  const [docName, setDocName] = useState('Laporan_Strategis_Multi_Drive_2026.pdf');
  const [docContent, setDocContent] = useState(
    'Laporan proyek pengembangan OmniDrive Storage Pool. Pengelolaan 5 akun Google Drive dengan kapasitas total 75 GB, sinkronisasi otomatis, dan keamanan enkripsi AES-256.'
  );
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<PythonAiParserResult | null>(null);

  // Go Worker State
  const [transferFileName, setTransferFileName] = useState('Database_Backup_Cluster.tar.gz');
  const [transferFileSizeMB, setTransferFileSizeMB] = useState(120);
  const [sourceDrive, setSourceDrive] = useState('Google Drive Utama (15 GB)');
  const [targetDrive, setTargetDrive] = useState('Google Drive Cadangan 2 (15 GB)');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<GoTransferTaskResult | null>(null);

  if (!isOpen) return null;

  const handleRustEncrypt = async () => {
    setIsEncrypting(true);
    try {
      const res = await processRustWasmVaultEncrypt(vaultText, passphrase);
      setEncryptedResult(res);
      setDecryptedText(null);
    } catch (err: any) {
      alert(`WASM Error: ${err.message}`);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleRustDecrypt = async () => {
    if (!encryptedResult) return;
    try {
      const text = await processRustWasmVaultDecrypt(encryptedResult.payload, passphrase);
      setDecryptedText(text);
    } catch (err: any) {
      alert(`WASM Decryption Failed: ${err.message}`);
    }
  };

  const handlePythonParse = async () => {
    setIsParsing(true);
    try {
      const res = await parseDocumentWithPythonAi(docName, docContent);
      setParsedResult(res);
    } catch (err: any) {
      alert(`Python FastAPI Service Error: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleGoTransfer = async () => {
    setIsTransferring(true);
    try {
      const res = await dispatchGoTransferWorker({
        fileName: transferFileName,
        fileSize: transferFileSizeMB * 1024 * 1024,
        sourceDriveName: sourceDrive,
        targetDriveName: targetDrive,
      });
      setTransferResult(res);
    } catch (err: any) {
      alert(`Go Worker Error: ${err.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  OmniDrive Polyglot High-Performance Architecture
                </h2>
                <p className="text-xs text-slate-400">
                  Modul Terpisah Rust WASM, Python FastAPI AI Parser, & Go Transfer Workers
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2">
            <button
              onClick={() => setActiveSubTab('rust')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-xs transition-all ${
                activeSubTab === 'rust'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>1. Rust WASM Crypto Vault</span>
            </button>
            <button
              onClick={() => setActiveSubTab('python')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-xs transition-all ${
                activeSubTab === 'python'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <FileCode2 className="w-4 h-4 text-cyan-400" />
              <span>2. Python FastAPI AI Parser</span>
            </button>
            <button
              onClick={() => setActiveSubTab('go')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-xs transition-all ${
                activeSubTab === 'go'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>3. Go Goroutine Transfer Worker</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
            {activeSubTab === 'rust' && (
              <div className="space-y-6">
                <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-xs space-y-1 text-amber-200">
                  <div className="font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Modul Rust WASM: Encrypted Vault & SHA-256 Engine
                  </div>
                  <p className="text-amber-300/80">
                    Diproses langsung menggunakan WebAssembly (Rust cdylib crate) untuk kecepatan kriptografi native, menghasilkan AES-256-GCM ciphertext dan SHA-256 checksum lokal.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Teks / Berkas yang Akan Dienskripsi:
                    </label>
                    <textarea
                      value={vaultText}
                      onChange={(e) => setVaultText(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      Kunci Sandi Vault (Secret Passphrase):
                    </label>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                      onClick={handleRustEncrypt}
                      disabled={isEncrypting}
                      className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{isEncrypting ? 'Memproses WASM AES-256...' : 'Jalankan Rust WASM Encryption'}</span>
                    </button>
                  </div>
                </div>

                {encryptedResult && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Hasil Enkripsi WASM AES-256-GCM
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        WASM Processing Time: {encryptedResult.hash.durationMs} ms
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">SHA-256 Checksum:</span>
                      <div className="p-2 bg-slate-900 rounded-lg text-emerald-300 font-mono text-[11px] break-all">
                        {encryptedResult.hash.hashHex}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">Ciphertext (Base64 Payload):</span>
                      <div className="p-2 bg-slate-900 rounded-lg text-amber-200/90 font-mono text-[11px] break-all max-h-20 overflow-y-auto">
                        {encryptedResult.payload.ciphertextB64}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={handleRustDecrypt}
                        className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Uji Dekripsi Vault</span>
                      </button>
                      {decryptedText && (
                        <span className="text-xs text-emerald-400 font-medium">
                          ✓ Dekripsi Sukses: "{decryptedText}"
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'python' && (
              <div className="space-y-6">
                <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl text-xs space-y-1 text-cyan-200">
                  <div className="font-bold flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-cyan-400" />
                    Microservice Python FastAPI: AI Document Parser & Tagging
                  </div>
                  <p className="text-cyan-300/80">
                    Menghubungkan endpoint REST `/extract-text` Python FastAPI untuk mengekstrak teks PDF/DOCX dan menggenerasi Smart AI Tags melalui Gemini API.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1 block">Nama Berkas Dokumen:</label>
                      <input
                        type="text"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1 block">Service Endpoint:</label>
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-cyan-400 font-mono">
                        POST /services/ai-parser/extract-text
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Isi / Teks Sampel Dokumen:</label>
                    <textarea
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <button
                    onClick={handlePythonParse}
                    disabled={isParsing}
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isParsing ? 'Mengekstrak Teks & Tagging via Python FastAPI...' : 'Eksekusi Python AI Parser Microservice'}</span>
                  </button>
                </div>

                {parsedResult && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                      <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Hasil Parsing Microservice Python
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {parsedResult.engine} • {parsedResult.processing_time_ms} ms
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400">Smart AI Tags:</span>
                        {parsedResult.ai_tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px] font-medium flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="p-3 bg-slate-900 rounded-xl text-slate-300 text-xs">
                        <span className="font-bold text-slate-200 block mb-1">Ringkasan Otomatis:</span>
                        {parsedResult.summary}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'go' && (
              <div className="space-y-6">
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl text-xs space-y-1 text-indigo-200">
                  <div className="font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    Backend Service Go / Golang: Goroutine Parallel Transfer Worker
                  </div>
                  <p className="text-indigo-300/80">
                    Menangani antrean transfer berkas antar-akun Google Drive secara cepat menggunakan konkurensi native Go (8 active Goroutines worker pool).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Nama Berkas Transfer:</label>
                    <input
                      type="text"
                      value={transferFileName}
                      onChange={(e) => setTransferFileName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Ukuran Berkas (MB):</label>
                    <input
                      type="number"
                      value={transferFileSizeMB}
                      onChange={(e) => setTransferFileSizeMB(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Drive Sumber:</label>
                    <input
                      type="text"
                      value={sourceDrive}
                      onChange={(e) => setSourceDrive(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Drive Tujuan:</label>
                    <input
                      type="text"
                      value={targetDrive}
                      onChange={(e) => setTargetDrive(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGoTransfer}
                  disabled={isTransferring}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{isTransferring ? 'Mengirim Tugas ke Worker Go...' : 'Kirim Tugas Transfer ke Go Worker Pool'}</span>
                </button>

                {transferResult && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Status Go Goroutine Transfer Task
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        Task ID: {transferResult.task_id}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Transfer Status: <strong className="text-emerald-400 capitalize">{transferResult.task.status}</strong></span>
                        <span>Kecepatan: <strong className="text-indigo-300">{transferResult.task.speed_mbps} MB/s</strong></span>
                      </div>

                      <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${transferResult.task.progress_percent}%` }}
                        />
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono pt-1">
                        Engine: {transferResult.engine}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Status Banner */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>OmniDrive Multi-Language Core Architecture</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all cursor-pointer font-medium"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
