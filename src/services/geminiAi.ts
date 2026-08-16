export interface ChatMessageItem {
  id: string;
  role: 'user' | 'model' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  groundingUrls?: Array<{ uri: string; title: string }>;
  thinkingMode?: boolean;
  rateLimitExceeded?: boolean;
}

export interface ChatOptions {
  messages: Array<{ role: string; content: string }>;
  searchGrounding?: boolean;
  thinkingMode?: boolean;
  lowLatencyMode?: boolean;
  systemInstruction?: string;
  contextData?: {
    accountsCount: number;
    totalCapacityGB: number;
    totalUsedGB: number;
    accountsSummary: Array<{ name: string; email: string; usedGB: number; limitGB: number }>;
  };
}

export interface ChatResponse {
  reply: string;
  modelUsed: string;
  groundingUrls?: Array<{ uri: string; title: string }>;
  latencyMs?: number;
  thinkingActive?: boolean;
  rateLimitExceeded?: boolean;
}

/**
 * Send multi-turn chat to backend Gemini endpoint
 */
export async function sendGeminiChatMessage(options: ChatOptions): Promise<ChatResponse> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Request Gemini AI deep pool analysis
 */
export async function analyzeStorageWithGemini(poolData: {
  accounts: any[];
  files: any[];
  thinkingMode?: boolean;
}): Promise<{
  healthScore: number;
  summary: string;
  risks: string[];
  actionSteps: Array<{ title: string; description: string; priority: 'high' | 'medium' | 'low' }>;
  modelUsed: string;
}> {
  const res = await fetch('/api/gemini/analyze-storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(poolData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Gagal menganalisis pool: HTTP ${res.status}`);
  }

  return await res.json();
}
