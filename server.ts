import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  upsertDriveAccount,
  getUserDriveAccounts,
  syncPooledFiles,
  syncPooledFilesTransaction,
  addSyncLog,
  getRecentSyncLogs,
} from './src/db/queries.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy Google GenAI initialization with User-Agent header
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Multi-Drive Storage Pool Backend',
    database: 'Cloud SQL PostgreSQL & Firestore',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Internet Connectivity & Google Services Reachability Check
app.get('/api/connectivity', async (_req: Request, res: Response) => {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const googleCheck = await fetch('https://www.googleapis.com/discovery/v1/apis?name=drive', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - start;
    res.json({
      connected: googleCheck.ok,
      status: googleCheck.status,
      latencyMs: latency,
      googleDriveApiOnline: googleCheck.ok,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const latency = Date.now() - start;
    res.json({
      connected: false,
      error: err?.message || 'Gagal menghubungi server Google',
      latencyMs: latency,
      googleDriveApiOnline: false,
      timestamp: new Date().toISOString(),
    });
  }
});

// Helper: Generate local heuristic advice for storage pool if Gemini API is exhausted or offline
function generateLocalHeuristicAdvice(messages: any[], contextData?: any): string {
  const accountsCount = contextData?.accountsCount || 0;
  const totalCapacityGB = (contextData?.totalCapacityGB || 0).toFixed(1);
  const totalUsedGB = (contextData?.totalUsedGB || 0).toFixed(1);
  const accountsSummary = contextData?.accountsSummary || [];

  let advice = `### 💡 Analisis & Rekomendasi Kapasitas (Mode Offline Heuristik)

*Catatan: Kuota Gemini API (Rate Limit 429) sedang terlampaui untuk sementara waktu. Asisten beralih ke mesin heuristik lokal agar Anda tetap mendapatkan panduan pengelolaan storage pool.*

#### 📊 Ringkasan Kondisi Pool Saat Ini:
- **Total Akun Google Drive**: ${accountsCount} Akun
- **Kapasitas Tergabung**: ${totalCapacityGB} GB
- **Total Ruang Terpakai**: ${totalUsedGB} GB

#### 📋 Status Beban per Akun:
`;

  if (accountsSummary.length > 0) {
    accountsSummary.forEach((acc: any, idx: number) => {
      const pct = acc.limitGB > 0 ? ((acc.usedGB / acc.limitGB) * 100).toFixed(0) : '0';
      const statusIcon = Number(pct) > 80 ? '⚠️' : Number(pct) > 50 ? '🔵' : '✅';
      advice += `- ${statusIcon} **${acc.name || `Akun ${idx + 1}`}** (${acc.email}): **${acc.usedGB} GB** / ${acc.limitGB} GB (${pct}% terisi)\n`;
    });
  } else {
    advice += `- Belum ada akun Google Drive yang terhubung atau data akun sedang dimuat.\n`;
  }

  advice += `
#### 🚀 Saran Optimasi Penyimpanan:
1. **Jalankan Smart Auto-Balancer**: Buka menu **Smart Storage Auto-Balancer** di tab Ikhtisar atau Sidebar untuk mendistribusikan berkas secara seimbang antar akun.
2. **Aktifkan Aturan Offload Otomatis**: Pasang aturan *High Quota Offload* di menu Sinkronisasi (misal: jika akun >85%, alihkan berkas ke akun dengan sisa kuota terbesar).
3. **Pencarian Berkas Duplikat**: Periksa File Explorer untuk menghapus salinan file berukuran besar yang tidak diperlukan.
4. **Beralih Mode AI**: Anda dapat memilih mode **"Cepat (Flash Lite)"** di menu AI Chatbot yang memiliki alokasi kuota lebih ringan.

*Koneksi Gemini AI akan pulih secara otomatis begitu jendela kuota API Anda disegarkan.*`;

  return advice;
}

// Gemini Multi-turn Chat Endpoint (supports low-latency lite, search grounding, fallback on 429)
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {
      messages,
      searchGrounding,
      thinkingMode,
      lowLatencyMode,
      systemInstruction,
      contextData,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Array pesan (messages) harus disertakan.' });
      return;
    }

    const ai = getGenAI();

    // System instruction for the Storage Pool AI Assistant
    const defaultSystemPrompt = `Anda adalah Asisten Cerdas Multi-Drive Storage Pool (DrivePool AI).
Tugas Anda adalah membantu pengguna mengelola, mengoptimalkan, dan menyeimbangkan kapasitas penyimpanan dari beberapa akun Google Drive yang terhubung.
Anda memahami struktur kuota Google Drive (15 GB gratis per akun), strategi replikasi file, deduplikasi, dan tips pengelolaan Google Workspace.
Berikan jawaban yang jelas, ramah, solutif, dan terstruktur rapi dengan Markdown dalam Bahasa Indonesia yang profesional.`;

    let activeSystemInstruction = systemInstruction || defaultSystemPrompt;
    if (contextData) {
      activeSystemInstruction += `\n\n[Konteks Status Pool Saat Ini]:
- Jumlah Akun Terhubung: ${contextData.accountsCount || 0}
- Total Kapasitas: ${(contextData.totalCapacityGB || 0).toFixed(1)} GB
- Total Terpakai: ${(contextData.totalUsedGB || 0).toFixed(1)} GB
- Detail Akun: ${JSON.stringify(contextData.accountsSummary || [])}`;
    }

    // Format conversation history for Gemini SDK
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    // Candidate model chain: Primary -> Alternative Fast Models -> Local Heuristics
    let primaryModel = 'gemini-2.5-flash';
    const config: any = {
      systemInstruction: activeSystemInstruction,
    };

    if (lowLatencyMode) {
      primaryModel = 'gemini-2.5-flash';
    } else if (thinkingMode) {
      primaryModel = 'gemini-2.5-flash';
      config.thinkingConfig = { thinkingBudget: 1024 };
    } else if (searchGrounding) {
      primaryModel = 'gemini-2.5-flash';
      config.tools = [{ googleSearch: {} }];
    }

    let response: any = null;
    let modelActuallyUsed = primaryModel;
    let isRateLimited = false;

    const candidateModels = [primaryModel, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.1-flash-lite'];
    const uniqueCandidates = Array.from(new Set(candidateModels));

    for (const modelToTry of uniqueCandidates) {
      try {
        const attemptConfig: any = {
          systemInstruction: activeSystemInstruction,
        };
        if (searchGrounding && (modelToTry.includes('flash') || modelToTry.includes('2.5'))) {
          attemptConfig.tools = [{ googleSearch: {} }];
        }
        if (thinkingMode && modelToTry.includes('2.5')) {
          attemptConfig.thinkingConfig = { thinkingBudget: 1024 };
        }

        response = await ai.models.generateContent({
          model: modelToTry,
          contents,
          config: attemptConfig,
        });

        if (response && response.text) {
          modelActuallyUsed = modelToTry;
          break;
        }
      } catch (errAttempt: any) {
        const errStr = String(errAttempt?.message || errAttempt);
        console.warn(`[Gemini Chat] Model ${modelToTry} attempt returned error:`, errStr);
        const isTemporaryOrCapacityError =
          errStr.includes('503') ||
          errStr.includes('UNAVAILABLE') ||
          errStr.includes('high demand') ||
          errStr.includes('429') ||
          errStr.includes('RESOURCE_EXHAUSTED') ||
          errStr.includes('quota') ||
          errStr.includes('rate limit') ||
          errStr.includes('overloaded');

        if (isTemporaryOrCapacityError) {
          isRateLimited = true;
          // Continue to next fallback model in candidate chain
          continue;
        } else {
          // Non-capacity error (e.g. invalid parameter), try fallback model once
          continue;
        }
      }
    }

    let replyText = '';
    let groundingUrls: Array<{ uri: string; title: string }> = [];

    if (response && response.text) {
      replyText = response.text;
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        groundingChunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            groundingUrls.push({
              uri: chunk.web.uri,
              title: chunk.web.title || chunk.web.uri,
            });
          }
        });
      }
    } else if (isRateLimited) {
      // Graceful offline fallback message
      replyText = generateLocalHeuristicAdvice(messages, contextData);
      modelActuallyUsed = 'Mesin Analisis Heuristik (Rate-Limit Protected)';
    } else {
      replyText = 'Maaf, sistem tidak menerima jawaban dari AI. Silakan coba kembali sesaat lagi.';
    }

    const latencyMs = Date.now() - startTime;

    res.json({
      reply: replyText,
      modelUsed: modelActuallyUsed,
      groundingUrls: groundingUrls.length > 0 ? groundingUrls : undefined,
      latencyMs,
      thinkingActive: Boolean(thinkingMode),
      rateLimitExceeded: isRateLimited,
    });
  } catch (err: any) {
    console.error('Error in /api/gemini/chat:', err);
    res.status(200).json({
      reply: generateLocalHeuristicAdvice(req.body?.messages || [], req.body?.contextData),
      modelUsed: 'Mesin Analisis Heuristik (Fallback)',
      rateLimitExceeded: true,
      errorDetail: err?.message,
      latencyMs: Date.now() - startTime,
    });
  }
});

// Gemini Storage Pool Deep Analysis Endpoint with Safe Fallback
app.post('/api/gemini/analyze-storage', async (req: Request, res: Response) => {
  const { accounts = [], files = [], thinkingMode } = req.body;
  try {
    const ai = getGenAI();
    let modelName = 'gemini-2.5-flash';
    const config: any = {
      systemInstruction:
        'Anda adalah Auditor dan Pengoptimal Kapasitas Cloud Storage ahli. Analisis data penyimpanan multi-drive dan berikan rekomendasi cerdas serta langkah aksi.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          healthScore: { type: Type.INTEGER, description: 'Skor kesehatan pool dari 0 hingga 100' },
          summary: { type: Type.STRING, description: 'Ringkasan analisis kondisi penyimpanan pool' },
          risks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Daftar potensi risiko atau ketidakseimbangan kapasitas',
          },
          actionSteps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
              },
              required: ['title', 'description', 'priority'],
            },
            description: 'Daftar langkah aksi yang direkomendasikan',
          },
        },
        required: ['healthScore', 'summary', 'risks', 'actionSteps'],
      },
    };

    const prompt = `Analisis status pool Google Drive berikut:
Data Akun: ${JSON.stringify(accounts || [])}
Statistik Berkas: ${JSON.stringify((files || []).slice(0, 30).map((f: any) => ({ name: f.name, size: f.size, category: f.category, accountId: f.accountId })))}
Total Akun: ${(accounts || []).length}
Berikan skor kesehatan, ringkasan, risiko, dan langkah optimasi prioritas tinggi/sedang/rendah.`;

    let response: any = null;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config,
      });
      modelName = 'gemini-2.5-flash';
    } catch (apiErr: any) {
      console.warn('Gemini 2.5 analysis failed, trying gemini-1.5-flash fallback:', apiErr?.message);
      try {
        response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
          config,
        });
        modelName = 'gemini-1.5-flash (Auto-Fallback)';
      } catch (fallbackErr: any) {
        console.warn('Fallback Gemini model also failed, will use computed heuristics:', fallbackErr?.message);
        throw fallbackErr;
      }
    }

    const parsedData = JSON.parse(response.text || '{}');
    res.json({
      ...parsedData,
      modelUsed: modelName,
    });
  } catch (err: any) {
    console.error('Error analyzing storage with Gemini (using calculated fallback):', err);

    // Generate local calculated audit metrics so the user always sees actionable insights
    const totalCap = accounts.reduce((acc: number, a: any) => acc + (a.storageLimit || 0), 0);
    const totalUsed = accounts.reduce((acc: number, a: any) => acc + (a.storageUsed || 0), 0);
    const poolUsagePct = totalCap > 0 ? (totalUsed / totalCap) * 100 : 0;

    const highestAcc = [...accounts].sort(
      (a: any, b: any) => (b.storageUsed / (b.storageLimit || 1)) - (a.storageUsed / (a.storageLimit || 1))
    )[0];
    const highestPct = highestAcc
      ? ((highestAcc.storageUsed / (highestAcc.storageLimit || 1)) * 100).toFixed(0)
      : '0';

    const healthScore = Math.max(20, Math.round(100 - poolUsagePct * 0.7));

    res.json({
      healthScore,
      summary: `Penyimpanan storage pool saat ini terisi ${poolUsagePct.toFixed(1)}% dari total kapasitas ${(totalCap / (1024 ** 3)).toFixed(1)} GB. ${
        Number(highestPct) > 75
          ? `Terdapat ketimpangan beban pada akun ${highestAcc?.name} (${highestPct}% terisi).`
          : 'Distribusi beban relatif stabil di seluruh akun.'
      }`,
      risks: [
        Number(highestPct) > 75
          ? `Akun ${highestAcc?.name} (${highestPct}%) mendekati ambang batas peringatan kuota.`
          : 'Risiko kegagalan penulisan berkas baru sangat rendah.',
        accounts.length < 2
          ? 'Hanya 1 akun terhubung: replikasi redundansi berkas belum aktif.'
          : 'Penyimpanan terdistribusi aktif dengan multi-drive pool.',
      ],
      actionSteps: [
        {
          title: 'Jalankan Auto-Balancer',
          description: 'Ratakan beban kapasitas akun Google Drive yang tinggi ke akun yang masih longgar.',
          priority: Number(highestPct) > 75 ? 'high' : 'medium',
        },
        {
          title: 'Aktifkan Sinkronisasi Terjadwal',
          description: 'Pastikan replikasi berkas penting berjalan otomatis pada interval 5 menit.',
          priority: 'medium',
        },
        {
          title: 'Tambah Akun Google Drive Baru',
          description: 'Hubungkan akun Google Drive tambahan untuk memperluas pool gratis 15 GB.',
          priority: 'low',
        },
      ],
      modelUsed: 'Smart Heuristic Analyzer (Quota-Safe)',
    });
  }
});

// Fast File Categorization Endpoint (Low-Latency gemini-3.1-flash-lite with instant regex fallback)
app.post('/api/gemini/fast-categorize', async (req: Request, res: Response) => {
  const { fileName = '', mimeType = '' } = req.body;
  try {
    const ai = getGenAI();

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Kategorikan file "${fileName}" dengan tipe MIME "${mimeType}". Pilihan kategori: image, document, spreadsheet, presentation, video, audio, archive, code, other. Jawab hanya satu kata nama kategorinya.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

    const category = (response.text || 'other').trim().toLowerCase();
    res.json({ category });
  } catch (err: any) {
    // Instant fallback using extension / MIME regex
    let category = 'other';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || mimeType.includes('image')) {
      category = 'image';
    } else if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext) || mimeType.includes('video')) {
      category = 'video';
    } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext) || mimeType.includes('audio')) {
      category = 'audio';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType.includes('zip')) {
      category = 'archive';
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext) || mimeType.includes('pdf')) {
      category = 'document';
    } else if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mimeType.includes('sheet')) {
      category = 'spreadsheet';
    } else if (['ppt', 'pptx', 'odp'].includes(ext) || mimeType.includes('presentation')) {
      category = 'presentation';
    } else if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'java', 'html', 'css'].includes(ext)) {
      category = 'code';
    }
    res.json({ category, fallback: true });
  }
});

// User profile & sync in Cloud SQL
app.post('/api/user/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid;
    const email = req.user?.email || 'user@example.com';
    const { displayName, photoUrl } = req.body;

    if (!userUid) {
      res.status(401).json({ error: 'User UID missing from verified token' });
      return;
    }

    const user = await getOrCreateUser(userUid, email, displayName, photoUrl);
    res.json({ status: 'ok', user });
  } catch (err: any) {
    console.error('Failed to sync user with Cloud SQL:', err);
    res.status(500).json({ error: err?.message || 'Internal database error' });
  }
});

// Sync user's connected drive accounts to Cloud SQL
app.post('/api/drive-accounts/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid;
    const email = req.user?.email || 'user@example.com';
    const { accounts } = req.body;

    if (!userUid) {
      res.status(401).json({ error: 'User UID missing from verified token' });
      return;
    }

    await getOrCreateUser(userUid, email);

    if (Array.isArray(accounts)) {
      for (const acc of accounts) {
        await upsertDriveAccount({
          id: acc.id,
          userId: userUid,
          email: acc.email,
          name: acc.name,
          photoUrl: acc.photoUrl,
          storageLimit: Number(acc.storageLimit) || 16106127360,
          storageUsed: Number(acc.storageUsed) || 0,
          storageAvailable: Number(acc.storageAvailable) || 16106127360,
          color: acc.color,
          status: acc.status,
          isPrimary: Boolean(acc.isPrimary),
          lastSyncedAt: acc.lastSyncedAt,
        });
      }
    }

    const currentAccounts = await getUserDriveAccounts(userUid);
    res.json({ status: 'ok', accounts: currentAccounts });
  } catch (err: any) {
    console.error('Failed to sync drive accounts with Cloud SQL:', err);
    res.status(500).json({ error: err?.message || 'Internal database error' });
  }
});

// Fetch user's drive accounts from Cloud SQL
app.get('/api/drive-accounts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid;
    if (!userUid) {
      res.status(401).json({ error: 'User UID missing' });
      return;
    }
    const accounts = await getUserDriveAccounts(userUid);
    res.json({ status: 'ok', accounts });
  } catch (err: any) {
    console.error('Failed to fetch drive accounts from Cloud SQL:', err);
    res.status(500).json({ error: err?.message || 'Internal database error' });
  }
});

// Sync file catalog to Cloud SQL
app.post('/api/files/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid;
    const email = req.user?.email || 'user@example.com';
    const { files } = req.body;

    if (!userUid) {
      res.status(401).json({ error: 'User UID missing' });
      return;
    }

    await getOrCreateUser(userUid, email);

    if (Array.isArray(files) && files.length > 0) {
      await syncPooledFiles(userUid, files, email);
    }

    res.json({ status: 'ok', syncedCount: files?.length || 0 });
  } catch (err: any) {
    console.error('Failed to sync files to Cloud SQL:', err);
    res.status(500).json({ error: err?.message || 'Internal database error' });
  }
});

// Sync logs endpoints
app.post('/api/sync-logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid;
    const email = req.user?.email || 'user@example.com';
    const { log } = req.body;

    if (!userUid || !log) {
      res.status(400).json({ error: 'User UID or log payload missing' });
      return;
    }

    await getOrCreateUser(userUid, email);
    const savedLog = await addSyncLog({
      id: log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: userUid,
      action: log.action || 'sync',
      status: log.status || 'success',
      message: log.message || '',
      fileName: log.fileName,
      fileSize: log.fileSize,
      sourceDriveName: log.sourceDriveName,
      targetDriveName: log.targetDriveName,
      timestamp: log.timestamp,
    });

    res.json({ status: 'ok', log: savedLog });
  } catch (err: any) {
    console.error('Failed to save sync log to Cloud SQL:', err);
    res.status(500).json({ error: err?.message || 'Internal database error' });
  }
});

app.get('/api/sync-logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid;
    if (!userUid) {
      res.status(401).json({ error: 'User UID missing' });
      return;
    }
    const logs = await getRecentSyncLogs(userUid, 50);
    res.json({ status: 'ok', logs });
  } catch (err: any) {
    console.error('Failed to get sync logs from Cloud SQL:', err);
    res.status(500).json({ error: err?.message || 'Internal database error' });
  }
});

// Server-side Cross-Drive File Copy Execution
app.post('/api/drive/cross-copy', async (req: Request, res: Response) => {
  const { sourceToken, targetToken, fileId, fileName, mimeType, targetFolderId } = req.body;

  if (!sourceToken || !targetToken || !fileId || !fileName) {
    res.status(400).json({ error: 'sourceToken, targetToken, fileId, and fileName are required' });
    return;
  }

  try {
    const sourceRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${sourceToken}` },
    });

    if (!sourceRes.ok) {
      const errText = await sourceRes.text();
      res.status(sourceRes.status).json({ error: `Gagal membaca berkas sumber dari Google Drive: ${errText}` });
      return;
    }

    const fileBuffer = Buffer.from(await sourceRes.arrayBuffer());

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata: any = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream',
    };
    if (targetFolderId) {
      metadata.parents = [targetFolderId];
    }

    const multipartHeader = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: ${metadata.mimeType}\r\n\r\n`;
    const multipartFooter = closeDelimiter;

    const multipartBody = Buffer.concat([
      Buffer.from(multipartHeader, 'utf-8'),
      fileBuffer,
      Buffer.from(multipartFooter, 'utf-8'),
    ]);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${targetToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartBody.length.toString(),
        },
        body: multipartBody,
      }
    );

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      res.status(uploadRes.status).json({ error: `Gagal mengunggah berkas ke Google Drive target: ${uploadErr}` });
      return;
    }

    const uploadedData = await uploadRes.json();
    res.json({
      status: 'success',
      file: uploadedData,
      message: `Berkas ${fileName} berhasil disalin ke Drive tujuan via backend proxy.`,
    });
  } catch (err: any) {
    console.error('Cross-copy backend error:', err);
    res.status(500).json({ error: err?.message || 'Server error copying file across drives' });
  }
});

// Verify Google Drive Account Token via Backend
app.post('/api/drive/verify-account', async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    res.status(400).json({ error: 'accessToken is required' });
    return;
  }

  try {
    const driveRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!driveRes.ok) {
      const errorText = await driveRes.text();
      res.status(driveRes.status).json({
        valid: false,
        error: `Google Drive API error: ${errorText}`,
      });
      return;
    }

    const data = await driveRes.json();
    res.json({
      valid: true,
      user: data.user,
      storageQuota: data.storageQuota,
    });
  } catch (err: any) {
    res.status(500).json({
      valid: false,
      error: err?.message || 'Internal Server Error verifying token',
    });
  }
});

// ==========================================
// SMART POOL OPTIMIZATION & ADVISOR
// ==========================================

// Smart Pool Optimization & Balance Advisor Endpoint
app.post('/api/smart-balance-advisor', (req: Request, res: Response) => {
  try {
    const { accounts } = req.body;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      res.json({
        status: 'insufficient_accounts',
        recommendations: [
          'Hubungkan minimal 2 akun Google Drive untuk mengaktifkan penyeimbangan kapasitas otomatis.',
        ],
        healthScore: 100,
      });
      return;
    }

    const totalLimit = accounts.reduce((acc: number, a: any) => acc + (Number(a.storageLimit) || 0), 0);
    const totalUsed = accounts.reduce((acc: number, a: any) => acc + (Number(a.storageUsed) || 0), 0);
    const usageRatio = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

    const overUtilized = accounts.filter((a: any) => {
      const pct = (a.storageUsed / (a.storageLimit || 1)) * 100;
      return pct > 85;
    });

    const recommendations: string[] = [];

    if (overUtilized.length > 0) {
      overUtilized.forEach((acc: any) => {
        recommendations.push(
          `Akun ${acc.name} (${acc.email}) hampir penuh (${((acc.storageUsed / acc.storageLimit) * 100).toFixed(1)}%). Pindahkan berkas besar ke akun dengan sisa kuota lebih banyak.`
        );
      });
    }

    if (accounts.length === 1) {
      recommendations.push(
        'Tambahkan akun Google Drive kedua untuk memperluas total pool menjadi 30+ GB dan mengaktifkan replikasi cadangan.'
      );
    } else {
      recommendations.push(
        `Pool terhubung dengan ${accounts.length} akun (Total kapasitas: ${(totalLimit / (1024 * 1024 * 1024)).toFixed(1)} GB). Distribusi penyimpanan berada dalam batas aman.`
      );
    }

    let healthScore = Math.max(20, Math.round(100 - (overUtilized.length * 25) - (usageRatio > 80 ? 20 : 0)));

    res.json({
      status: 'success',
      totalAccounts: accounts.length,
      totalCapacityBytes: totalLimit,
      totalUsedBytes: totalUsed,
      usagePercent: Number(usageRatio.toFixed(1)),
      healthScore,
      overUtilizedAccounts: overUtilized.map((a: any) => a.id),
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Gagal menganalisis pool' });
  }
});

// Setup Vite middleware or Static serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Multi-Drive Pool server running on http://0.0.0.0:${PORT}`);
  });
}

start();
