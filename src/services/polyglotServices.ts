/**
 * OmniDrive Polyglot Services Bridge
 * Connects React UI to:
 * 1. Rust WASM Engine (Client-side Encrypted Vault & SHA-256 Hashing)
 * 2. Python FastAPI Microservice (Document Text Extraction & Smart Gemini Tagging)
 * 3. Go Transfer Worker Microservice (High-throughput Goroutine Parallel Transfer Engine)
 */

import {
  computeSha256,
  encryptVaultFile,
  decryptVaultFile,
  EncryptedVaultPayload,
  HashResult,
} from '../wasm/wasmCrypto';

export interface PythonAiParserResult {
  file_name: string;
  file_type: string;
  extracted_text: string;
  word_count: number;
  ai_tags: string[];
  suggested_category: string;
  summary: string;
  processing_time_ms: number;
  engine: string;
}

export interface GoTransferTaskResult {
  status: string;
  task_id: string;
  message: string;
  engine: string;
  task: {
    id: string;
    file_name: string;
    file_size: number;
    source_drive_name: string;
    target_drive_name: string;
    status: string;
    progress_percent: number;
    speed_mbps: number;
  };
}

/**
 * 1. Call Rust WASM Engine for AES-256-GCM Encrypted Vault
 */
export async function processRustWasmVaultEncrypt(
  fileContent: string,
  vaultPassphrase: string
): Promise<{ payload: EncryptedVaultPayload; hash: HashResult }> {
  const hash = await computeSha256(fileContent);
  const payload = await encryptVaultFile(fileContent, vaultPassphrase);
  return { payload, hash };
}

export async function processRustWasmVaultDecrypt(
  payload: EncryptedVaultPayload,
  vaultPassphrase: string
): Promise<string> {
  const decryptedBuffer = await decryptVaultFile(payload, vaultPassphrase);
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * 2. Call Python FastAPI AI Document Parser Microservice
 */
export async function parseDocumentWithPythonAi(
  fileName: string,
  contentText?: string
): Promise<PythonAiParserResult> {
  const response = await fetch('/api/polyglot/ai-parser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentText }),
  });

  if (!response.ok) {
    throw new Error(`Python AI Parser Service error: HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * 3. Call Go Goroutine Transfer Worker Microservice
 */
export async function dispatchGoTransferWorker(transferData: {
  fileName: string;
  fileSize: number;
  sourceDriveName: string;
  targetDriveName: string;
  sourceAccountId?: string;
  targetAccountId?: string;
}): Promise<GoTransferTaskResult> {
  const response = await fetch('/api/polyglot/transfer-worker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferData),
  });

  if (!response.ok) {
    throw new Error(`Go Transfer Worker Service error: HTTP ${response.status}`);
  }

  return await response.json();
}
