import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Zap,
  Brain,
  Globe,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Layers,
  Database,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { DriveAccount, PooledFile } from '../types';
import { sendGeminiChatMessage, ChatMessageItem } from '../services/geminiAi';
import { saveChatMessageToFirestore } from '../services/firestoreStorage';
import { auth } from '../services/firebaseAuth';

interface GeminiChatbotProps {
  accounts: DriveAccount[];
  files: PooledFile[];
  totalStorageLimit: number;
  totalStorageUsed: number;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  accounts,
  files,
  totalStorageLimit,
  totalStorageUsed,
}) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      content: `Halo! Saya **DrivePool AI Assistant**, didukung oleh Google Gemini.

Saya dapat membantu Anda mengelola, menganalisis, dan mengoptimalkan multi-akun Google Drive Anda:
- 📊 **Audit & Rekomendasi Kapasitas**: Deteksi drive yang hampir penuh dan bagikan beban berkas secara merata.
- ⚡ **Pencarian Cepat & Pengelompokan**: Menemukan berkas duplikat dan menyusun strategi pencadangan.
- 🌐 **Informasi Terkini**: Aktifkan **Search Grounding** untuk informasi Google Workspace dan teknologi penyimpanan cloud terbaru.
- 🧠 **Mode Berpikir Mendalam (Thinking Mode)**: Untuk kalkulasi distribusi data yang kompleks.

Apa yang ingin Anda konsultasikan hari ini?`,
      timestamp: new Date().toISOString(),
      modelUsed: 'gemini-3.7-flash',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'standard' | 'fast' | 'thinking'>('standard');
  const [searchGrounding, setSearchGrounding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessageItem = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
      saveChatMessageToFirestore(currentUser.uid, {
        id: userMessage.id,
        role: 'user',
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      }).catch(console.warn);
    }

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome_msg')
        .concat(userMessage)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          content: m.content,
        }));

      const contextData = {
        accountsCount: accounts.length,
        totalCapacityGB: totalStorageLimit / (1024 * 1024 * 1024),
        totalUsedGB: totalStorageUsed / (1024 * 1024 * 1024),
        accountsSummary: accounts.map((a) => ({
          name: a.name,
          email: a.email,
          usedGB: Number((a.storageUsed / (1024 * 1024 * 1024)).toFixed(2)),
          limitGB: Number((a.storageLimit / (1024 * 1024 * 1024)).toFixed(2)),
        })),
      };

      const response = await sendGeminiChatMessage({
        messages: historyPayload,
        lowLatencyMode: activeMode === 'fast',
        thinkingMode: activeMode === 'thinking',
        searchGrounding: searchGrounding,
        contextData,
      });

      const botMessage: ChatMessageItem = {
        id: `msg_${Date.now()}_b`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        modelUsed: response.modelUsed,
        groundingUrls: response.groundingUrls,
        thinkingMode: response.thinkingActive,
        rateLimitExceeded: response.rateLimitExceeded,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (currentUser?.uid) {
        saveChatMessageToFirestore(currentUser.uid, {
          id: botMessage.id,
          role: 'model',
          content: botMessage.content,
          modelUsed: botMessage.modelUsed,
          searchGrounding: Boolean(searchGrounding),
          groundingUrls: response.groundingUrls ? JSON.stringify(response.groundingUrls) : undefined,
          thinkingMode: Boolean(response.thinkingActive),
          timestamp: botMessage.timestamp,
        }).catch(console.warn);
      }
    } catch (err: any) {
      console.error('Chatbot error:', err);
      const isQuota =
        err.message?.includes('429') ||
        err.message?.includes('RESOURCE_EXHAUSTED') ||
        err.message?.includes('quota');

      const friendlyText = isQuota
        ? `⚠️ **Batas Laju Kuota Gemini API (Rate Limit 429) Tercapai.**\n\nKunci API gratis Anda sedang mencapai batas permintaan per menit (RPM). Anda dapat:\n1. Beralih ke **Mode Cepat (Flash Lite)** di tombol atas untuk konsumsi kuota yang lebih ringan.\n2. Menunggu 30–60 detik hingga kuota otomatis disegarkan, lalu kirim ulang pertanyaan.`
        : `⚠️ Terjadi kendala saat menghubungi Gemini AI: ${err.message || 'Silakan periksa koneksi atau coba lagi nanti.'}`;

      const errorMessage: ChatMessageItem = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: friendlyText,
        timestamp: new Date().toISOString(),
        modelUsed: 'Status Peringatan Kuota',
        rateLimitExceeded: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: 'Percakapan telah dibersihkan. Bagaimana saya bisa membantu Anda mengoptimalkan Google Drive Anda sekarang?',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div id="gemini-chatbot-container" className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header with Mode Controls */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">DrivePool AI Assistant</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Gemini 3
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {accounts.length} Akun Terhubung • {(totalStorageUsed / (1024 * 1024 * 1024)).toFixed(1)} / {(totalStorageLimit / (1024 * 1024 * 1024)).toFixed(1)} GB
            </p>
          </div>
        </div>

        {/* AI Modes & Search Grounding Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 text-xs">
            <button
              id="mode-fast-btn"
              onClick={() => setActiveMode('fast')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeMode === 'fast'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Respon Cepat Menggunakan gemini-3.1-flash-lite"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Cepat (Lite)</span>
            </button>
            <button
              id="mode-standard-btn"
              onClick={() => setActiveMode('standard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeMode === 'standard'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="General Assistant Menggunakan gemini-3.7-flash"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Standar</span>
            </button>
            <button
              id="mode-thinking-btn"
              onClick={() => setActiveMode('thinking')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeMode === 'thinking'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="High Thinking Mode untuk penalaran mendalam dan audit data"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Deep Thinking</span>
            </button>
          </div>

          {/* Search Grounding Toggle */}
          <button
            id="toggle-search-grounding-btn"
            onClick={() => setSearchGrounding(!searchGrounding)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
              searchGrounding
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
            title="Gunakan Google Search untuk informasi web real-time"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Search Grounding</span>
          </button>

          {/* Clear chat */}
          <button
            id="clear-chat-btn"
            onClick={clearChat}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
            title="Bersihkan percakapan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-md ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none'
                }`}
              >
                {/* Meta details if model */}
                {!isUser && (
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-700/40 text-xs text-slate-400 flex-wrap">
                    <span className="font-semibold text-slate-300">
                      {m.modelUsed ? m.modelUsed.replace('gemini-', '') : 'DrivePool AI'}
                    </span>
                    {m.rateLimitExceeded && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] flex items-center gap-1 font-medium">
                        <Zap className="w-2.5 h-2.5 text-amber-400" /> Quota-Safe Mode
                      </span>
                    )}
                    {m.thinkingMode && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] flex items-center gap-1 font-medium">
                        <Brain className="w-2.5 h-2.5" /> High Thinking
                      </span>
                    )}
                    {m.groundingUrls && m.groundingUrls.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center gap-1 font-medium">
                        <Globe className="w-2.5 h-2.5" /> Google Search
                      </span>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="markdown-body prose prose-invert max-w-none text-sm leading-relaxed">
                  <Markdown>{m.content}</Markdown>
                </div>

                {/* Grounding URL Citations */}
                {m.groundingUrls && m.groundingUrls.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-emerald-400" /> Sumber Penelusuran Google:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.groundingUrls.map((cite, idx) => (
                        <a
                          key={idx}
                          href={cite.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-700 text-[11px] text-emerald-400 hover:text-emerald-300 border border-slate-700 transition-colors"
                        >
                          <span className="truncate max-w-[200px]">{cite.title || cite.uri}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`text-[10px] mt-2 ${isUser ? 'text-indigo-200' : 'text-slate-500'} text-right`}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="w-8 h-8 rounded-xl bg-purple-600/50 flex items-center justify-center text-white shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/60 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-700/60 text-slate-300 flex items-center gap-3 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>
                {activeMode === 'thinking'
                  ? 'Sedang melakukan penalaran mendalam (Thinking Mode)...'
                  : activeMode === 'fast'
                  ? 'Menghasilkan respon cepat (Flash-Lite)...'
                  : searchGrounding
                  ? 'Mencari referensi terpercaya dengan Google Search...'
                  : 'Sedang memproses respons dengan Gemini...'}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Action Chips */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-slate-500 shrink-0 font-medium">Saran Prompt:</span>
        <button
          id="prompt-audit-btn"
          onClick={() => handleQuickPrompt('Analisis distribusi kuota dan beri rekomendasi penyeimbangan akun Google Drive saya.')}
          className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-900/50 text-slate-300 hover:text-indigo-200 border border-slate-700/60 hover:border-indigo-500/40 transition-all flex items-center gap-1"
        >
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>Audit Distribusi Kapasitas</span>
        </button>
        <button
          id="prompt-safety-btn"
          onClick={() => handleQuickPrompt('Bagaimana cara kerja replikasi dan pencadangan file antar drive tanpa menghabiskan kuota ganda?')}
          className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-900/50 text-slate-300 hover:text-purple-200 border border-slate-700/60 hover:border-purple-500/40 transition-all flex items-center gap-1"
        >
          <CheckCircle2 className="w-3 h-3 text-purple-400" />
          <span>Strategi Replikasi Aman</span>
        </button>
        <button
          id="prompt-quota-btn"
          onClick={() => handleQuickPrompt('Apa batas dan batasan API Google Drive untuk transfer berkas antar akun?')}
          className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-900/50 text-slate-300 hover:text-emerald-200 border border-slate-700/60 hover:border-emerald-500/40 transition-all flex items-center gap-1"
        >
          <Globe className="w-3 h-3 text-emerald-400" />
          <span>Batas Kuota Google Drive API</span>
        </button>
      </div>

      {/* Input Form */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            id="chat-input-field"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeMode === 'thinking'
                ? 'Tanyakan kalkulasi atau analisis rumit pada Gemini Deep Thinking...'
                : 'Ketik pertanyaan untuk DrivePool AI...'
            }
            disabled={isLoading}
            className="flex-1 bg-slate-900 text-slate-100 placeholder-slate-500 text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};
