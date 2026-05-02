import { useState, useRef, useEffect, useCallback } from 'react'
import { chatApi } from '@/lib/chatApi'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

// Helper untuk mendapatkan YYYY-MM-DD sesuai zona waktu lokal (browser)
const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ─── Sub-components ────────────────────────────────────────────

/** Typing indicator — 3 bouncing dots */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-4 animate-in slide-in-from-bottom-2 duration-300">
      {/* AI Avatar */}
      <div className="w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
        </svg>
      </div>
      {/* Bubble */}
      <div className="flex items-center gap-1.5 px-5 py-4 rounded-2xl rounded-bl-sm bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-emerald-400"
            style={{ animation: `chatBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}

/** AI chat bubble — renders Markdown */
function AIBubble({ text }) {
  return (
    <div className="flex items-end gap-3 mb-4 animate-in slide-in-from-bottom-2 duration-300">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
        </svg>
      </div>
      {/* Bubble */}
      <div className="max-w-[75%] px-5 py-4 rounded-2xl rounded-bl-sm bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm">
        <div className="text-slate-700 text-sm leading-relaxed prose prose-sm prose-emerald max-w-none
          prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-slate-800 prose-strong:font-bold
          prose-headings:text-slate-800 prose-headings:font-bold prose-code:text-emerald-600 prose-code:bg-emerald-50 prose-code:px-1 prose-code:rounded">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

/** User chat bubble */
function UserBubble({ text }) {
  return (
    <div className="flex items-end justify-end gap-3 mb-4 animate-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[75%] px-5 py-4 rounded-2xl rounded-br-sm text-white text-sm leading-relaxed shadow-md"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
        {text}
      </div>
    </div>
  )
}

/** System / status bubble (e.g. "Riwayat dihapus") */
function SystemBubble({ text }) {
  return (
    <div className="flex justify-center my-4 animate-in fade-in duration-300">
      <span className="text-xs text-slate-400 font-medium bg-slate-100/80 px-4 py-1.5 rounded-full border border-slate-200/60">
        {text}
      </span>
    </div>
  )
}

/** Historical Confirmation Card — Read-only view for chat history */
function ConfirmationCard({ txData }) {
  const formatRupiah = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`
  const typeLabel = { Expense: '💸 Pengeluaran', Income: '💰 Pemasukan', Transfer: '🔁 Transfer' }

  return (
    <div className="flex items-end gap-3 mb-4 opacity-70 grayscale-[0.3]">
      <div className="w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center bg-slate-200 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
        </svg>
      </div>
      <div className="max-w-[75%] w-full rounded-2xl rounded-bl-sm bg-slate-50 border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2">
          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">
            📜 Riwayat Draf
          </span>
        </div>
        <div className="px-4 py-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-400 font-bold">{txData.item_name}</span>
            <span className="text-[10px] font-black text-slate-600">{formatRupiah(txData.amount)}</span>
          </div>
          <p className="text-[9px] text-slate-400 italic">Transaksi ini sudah diproses atau dibatalkan.</p>
        </div>
      </div>
    </div>
  )
}


/** Draft Modal — Floating list of transactions with its own chat input */
function DraftModal({ isOpen, drafts, onConfirm, onCancel, onChat, isLoading, input, setInput }) {
  if (!isOpen || !drafts || drafts.length === 0) return null;

  const formatRupiah = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;
  const typeLabel = { Expense: '💸 Pengeluaran', Income: '💰 Pemasukan', Transfer: '🔁 Transfer' };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Draf Transaksi</h3>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Perlu Konfirmasi Kamu</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* List of Cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {drafts.map((item, idx) => {
            // ── Render Account Delete ──
            if (item._itemType === 'account_delete') {
              return (
                <div key={idx} className="p-5 rounded-2xl bg-rose-50 border border-rose-100 space-y-2 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">🗑️ Hapus Akun</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">{item.name}</h4>
                    </div>
                  </div>
                  <p className="text-[10px] text-rose-600 font-medium italic">Peringatan: Akun ini akan dihapus permanen.</p>
                </div>
              );
            }

            // ── Render Account Create/Update ──
            if (item._itemType === 'account') {
              return (
                <div key={idx} className="p-5 rounded-2xl bg-blue-50 border border-blue-100 space-y-3 relative overflow-hidden group hover:border-blue-200 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">🏦 {item.id ? 'Update Akun' : 'Akun Baru'}</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">{item.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{formatRupiah(item.balance)}</p>
                      <p className="text-[10px] text-blue-400 font-medium">{item.type}</p>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Render Budget Delete ──
            if (item._itemType === 'budget_delete') {
              return (
                <div key={idx} className="p-5 rounded-2xl bg-orange-50 border border-orange-100 space-y-2 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">🗑️ Hapus Budget</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">{item.category}</h4>
                    </div>
                  </div>
                  <p className="text-[10px] text-orange-600 font-medium italic">Budget untuk kategori ini akan dihapus.</p>
                </div>
              );
            }

            // ── Render Budget Create/Update ──
            if (item._itemType === 'budget') {
              return (
                <div key={idx} className="p-5 rounded-2xl bg-violet-50 border border-violet-100 space-y-3 relative overflow-hidden group hover:border-violet-200 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">📅 Set Budget</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">{item.category}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{formatRupiah(item.amount)}</p>
                      <p className="text-[10px] text-violet-400 font-medium">{item.behavior_group}</p>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Render Transaction (Default) ──
            return (
              <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 relative overflow-hidden group hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{typeLabel[item.transaction_type] || item.transaction_type}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-0.5">{item.item_name}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{formatRupiah(item.amount)}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{item.transaction_date || 'Hari ini'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Sumber</p>
                    <p className="text-xs font-bold text-slate-600">{item.source_of_fund}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase text-right">Kategori</p>
                    <p className="text-xs font-bold text-slate-600 text-right">{item.category}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Chat Input (Revision Area) */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 space-y-4">
          <div className="flex items-end gap-3 p-2 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-emerald-400 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ada revisi? Ketik di sini..."
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none px-3 py-2.5 min-h-[44px] max-h-[100px] leading-relaxed"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onChat();
                }
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
            />
            <button
              onClick={onChat}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-3.5 rounded-2xl text-xs font-black text-slate-500 bg-slate-200/50 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 active:scale-95"
            >
              BATALKAN
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-[2] py-3.5 rounded-2xl text-xs font-black text-white shadow-xl shadow-emerald-100 hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
            >
              {isLoading ? 'MEMPROSES...' : `SIMPAN ${drafts.length} TRANSAKSI`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6 py-12">
      {/* Glowing icon */}
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl blur-xl opacity-30 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }} />
        <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-black text-slate-800">Halo! Aku Yui AI 👋</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
          Tanya apa saja atau catat transaksimu secara natural. Aku siap membantu!
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {[
          '💰 Cek saldo akun',
          '📊 Statistik bulan ini',
          '📈 Status investasi',
          '🎯 Status budget',
        ].map((s) => (
          <span key={s}
            className="text-xs font-bold text-slate-500 bg-white/70 border border-slate-200/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main Chat Page ────────────────────────────────────────────
export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingDrafts, setPendingDrafts] = useState([]) // New: stores drafts for the modal
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false) // New: controls modal
  const [modalChatInput, setModalChatInput] = useState('') // New: chat input inside modal
  const [totalTokens, setTotalTokens] = useState(0)
  const MAX_TOKENS = 100000
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input on mount & load history
  useEffect(() => {
    inputRef.current?.focus()
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setIsLoading(true)
      const res = await chatApi.getChatHistory()
      if (res.success && res.data) {
        setTotalTokens(res.totalTokens || 0)
        const loadedMessages = []
        res.data.forEach((msg, messageIndex) => {
          // Skip empty or null messages
          if (!msg.text || msg.text.trim() === "" || msg.text === "null") return

          // Hide system-generated user actions
          if (msg.sender === 'user' && (msg.text === 'Konfirmasi simpan transaksi.' || msg.text === 'Batalkan transaksi.')) {
            return;
          }

          if (msg.sender === 'ai' && msg.text.includes('[PENDING_TX]')) {
            const lines = msg.text.split('\n')
            lines.forEach((line, idx) => {
              if (line.startsWith('[PENDING_TX]')) {
                try {
                  const txStr = line.replace('[PENDING_TX]', '').trim()
                  const txData = JSON.parse(txStr)

                  // If there are subsequent messages, this transaction is stale/read-only
                  const isStale = messageIndex < res.data.length - 1;
                  loadedMessages.push({ role: 'ai', type: 'pending_tx', content: txData, confirmed: false, id: msg.id + '_' + idx, isHistory: isStale })
                } catch (e) {
                  // ignore
                }
              } else if (line.trim()) {
                loadedMessages.push({ role: 'ai', type: 'text', content: line, id: msg.id + '_' + idx })
              }
            })
          } else {
            loadedMessages.push({ role: msg.sender, type: 'text', content: msg.text, id: msg.id })
          }
        })
        setMessages(loadedMessages)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }])
  }, [])

  const updateLastMessage = useCallback((update) => {
    setMessages(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = { ...updated[updated.length - 1], ...update }
      return updated
    })
  }, [])

  // ── Send message ──────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading || totalTokens >= MAX_TOKENS) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', type: 'text', content: text, id: Date.now() + Math.random() }])
    setIsLoading(true)

    try {
      const response = await chatApi.send(text)
      if (response.totalTokens !== undefined) setTotalTokens(response.totalTokens)

      if (response.type === 'PENDING_MULTI' || response.type === 'PENDING_TX' || response.type === 'PENDING_TX_MULTI' ||
        response.type.startsWith('PENDING_ACCOUNT') || response.type.startsWith('PENDING_BUDGET')) {

        let newItems = [];
        if (response.type === 'PENDING_MULTI') {
          newItems = response.data;
        } else if (response.type === 'PENDING_TX' || response.type === 'PENDING_TX_MULTI') {
          const data = response.type === 'PENDING_TX_MULTI' ? response.data : [response.data];
          newItems = data.map(d => ({ ...d, _itemType: 'transaction' }));
        } else if (response.type.includes('ACCOUNT')) {
          newItems = [{ ...response.data, _itemType: response.type.includes('DELETE') ? 'account_delete' : 'account' }];
        } else if (response.type.includes('BUDGET')) {
          newItems = [{ ...response.data, _itemType: response.type.includes('DELETE') ? 'budget_delete' : 'budget' }];
        }

        setPendingDrafts(prev => {
          const combined = [...prev, ...newItems];
          // Gunakan Map agar item baru dengan kunci (nama/tipe) yang sama menimpa item lama
          const map = new Map();
          combined.forEach(item => {
            const key = `${item._itemType}-${item.item_name || item.name || item.category || 'unknown'}`;
            map.set(key, item);
          });
          return Array.from(map.values());
        });

        if (newItems.length > 0) {
          setIsDraftModalOpen(true);
        }

        if (response.text && response.text.trim() !== "") {
          addMessage({ role: 'ai', type: 'text', content: response.text });
        }
      } else if (response.type === 'TOOL_RESULT') {
        addMessage({ role: 'ai', type: 'tool_result', content: response.text })
      } else {
        addMessage({ role: 'ai', type: 'text', content: response.text })
      }
    } catch (err) {
      addMessage({
        role: 'ai',
        type: 'text',
        content: `❌ Maaf, terjadi kesalahan: ${err.message}`,
      })
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ── Confirm All Drafts ───────────────────────────────────────
  const handleConfirmAll = async () => {
    setIsLoading(true)
    try {
      let successCount = 0;

      for (const item of pendingDrafts) {
        if (item._itemType === 'transaction') {
          const finalTxData = {
            ...item,
            transaction_date: item.transaction_date || getLocalDateString()
          }
          await chatApi.confirm(finalTxData);
        } else if (item._itemType === 'account') {
          await chatApi.confirmAccount(item);
        } else if (item._itemType === 'account_delete') {
          await chatApi.deleteAccount(item.name, item.id);
        } else if (item._itemType === 'budget') {
          await chatApi.confirmBudget(item);
        } else if (item._itemType === 'budget_delete') {
          await chatApi.deleteBudget(item.category);
        }
        successCount++;
      }

      setIsDraftModalOpen(false)
      setPendingDrafts([])

      const successMsg = `✅ Berhasil memproses ${successCount} item!`
      addMessage({ role: 'ai', type: 'text', content: successMsg })
      toast.success(successMsg)

      // Signal dashboard to refresh
      window.dispatchEvent(new CustomEvent('transaction-saved'))
      window.dispatchEvent(new CustomEvent('accounts-updated'))
    } catch (err) {
      toast.error(`Gagal memproses: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Cancel All Drafts ────────────────────────────────────────
  const handleCancelAll = async () => {
    try {
      await chatApi.cancel()
      setIsDraftModalOpen(false)
      setPendingDrafts([])
      addMessage({ role: 'ai', type: 'text', content: '❌ Transaksi dibatalkan.' })
      toast.info('Transaksi dibatalkan.')
    } catch (err) {
      toast.error('Gagal membatalkan.')
    }
  }

  // ── Chat Revision from Modal ─────────────────────────────────
  const handleModalChat = async () => {
    const text = modalChatInput.trim()
    if (!text || isLoading || totalTokens >= MAX_TOKENS) return

    setModalChatInput('')
    addMessage({ role: 'user', type: 'text', content: `[REVISI]: ${text}` })

    setIsLoading(true)
    try {
      const response = await chatApi.send(text)
      if (response.totalTokens !== undefined) setTotalTokens(response.totalTokens)

      if (response.type === 'PENDING_MULTI' || response.type === 'PENDING_TX' || response.type === 'PENDING_TX_MULTI' ||
        response.type.startsWith('PENDING_ACCOUNT') || response.type.startsWith('PENDING_BUDGET')) {

        let newItems = [];
        if (response.type === 'PENDING_MULTI') {
          newItems = response.data;
        } else if (response.type === 'PENDING_TX' || response.type === 'PENDING_TX_MULTI') {
          const data = response.type === 'PENDING_TX_MULTI' ? response.data : [response.data];
          newItems = data.map(d => ({ ...d, _itemType: 'transaction' }));
        } else if (response.type.includes('ACCOUNT')) {
          newItems = [{ ...response.data, _itemType: response.type.includes('DELETE') ? 'account_delete' : 'account' }];
        } else if (response.type.includes('BUDGET')) {
          newItems = [{ ...response.data, _itemType: response.type.includes('DELETE') ? 'budget_delete' : 'budget' }];
        }

        setPendingDrafts(prev => {
          const combined = [...prev, ...newItems];
          const map = new Map();
          combined.forEach(item => {
            const key = `${item._itemType}-${item.item_name || item.name || item.category || 'unknown'}`;
            map.set(key, item);
          });
          return Array.from(map.values());
        });
      } else {
        toast.info(response.text || "Revisi diterima")
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Clear history ─────────────────────────────────────────────
  const handleClear = async () => {
    if (messages.length === 0) return
    try {
      await chatApi.clear()
      setMessages([])
      setTotalTokens(0)
      addMessage({ role: 'system', type: 'system', content: 'Riwayat percakapan dihapus.' })
      toast.success('Riwayat berhasil dihapus')
    } catch (err) {
      toast.error('Gagal menghapus riwayat')
    }
  }

  // ── Key handler ───────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Scroll Lock Parent ─────────────────────────────────────────
  useEffect(() => {
    // Memaksa parent main untuk tidak scroll agar chat terasa seperti native app
    const mainElement = document.querySelector('main');
    if (mainElement) {
      // Reset scroll position ke paling atas dulu biar gak "lompat" dari page sebelumnya
      mainElement.scrollTo(0, 0);

      const originalOverflow = mainElement.style.overflow;
      mainElement.style.overflow = 'hidden';
      return () => {
        mainElement.style.overflow = originalOverflow;
      };
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Keyframe for typing animation — injected once */}
      <style>{`
        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .token-tooltip { visibility: hidden; opacity: 0; transition: opacity 0.3s; position: absolute; bottom: 120%; right: 0; transform: translateX(10%); }
        .token-container:hover .token-tooltip { visibility: visible; opacity: 1; }
        .token-tooltip:hover { visibility: visible; opacity: 1; }
      `}</style>

      <div className="flex flex-col h-[calc(100dvh-160px)] lg:h-[calc(100vh-40px)] max-w-3xl mx-auto relative overflow-hidden">


        {/* ── Messages Area ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-1 pb-4">
          {messages.length === 0 && !isLoading ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((msg) => {
                if (msg.role === 'system') {
                  return <SystemBubble key={msg.id} text={msg.content} />
                }
                if (msg.role === 'user') {
                  return <UserBubble key={msg.id} text={msg.content} />
                }
                if (msg.role === 'ai') {
                  if (msg.type === 'pending_tx') {
                    return (
                      <ConfirmationCard
                        key={msg.id}
                        txData={msg.content}
                      />
                    )
                  }
                  return <AIBubble key={msg.id} text={msg.content} />
                }
                return null
              })}
              {isLoading && <TypingIndicator />}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input Area ── */}
        <div className="flex-shrink-0 pt-4 pb-2 lg:pb-0">
          <div className="flex items-end gap-3 p-2 bg-white/70 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-lg shadow-black/[0.03]">
            <textarea
              ref={inputRef}
              id="chat-message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={totalTokens >= MAX_TOKENS ? "Limit token tercapai!" : (window.innerWidth < 768 ? "Ketik pesan..." : "Ketik pesan atau catat transaksi... (Enter untuk kirim)")}
              disabled={isLoading || totalTokens >= MAX_TOKENS}
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none px-3 py-2.5 min-h-[44px] max-h-[140px] leading-relaxed disabled:opacity-50"
              style={{ overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
              }}
            />

            {/* Token Usage Indicator */}
            <div className="token-container relative flex items-center justify-center w-10 h-10 cursor-help flex-shrink-0">
              <svg className="w-8 h-8 transform -rotate-90">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-100" />
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent"
                  strokeDasharray={88} strokeDashoffset={88 - (88 * Math.min((totalTokens / MAX_TOKENS) * 100, 100)) / 100}
                  className={`${totalTokens >= MAX_TOKENS ? 'text-rose-500' : 'text-emerald-500'} transition-all duration-1000`} />
              </svg>
              <span className="absolute text-[8px] font-black text-slate-600">{Math.round(Math.min((totalTokens / MAX_TOKENS) * 100, 100))}%</span>

              {/* Tooltip */}
              <div className="token-tooltip z-50 w-52 p-4 bg-slate-900 text-white text-[10px] rounded-2xl shadow-2xl border border-white/10">
                <p className="font-black mb-1 flex items-center justify-between">
                  <span>Penggunaan Token AI</span>
                  <span className={`${totalTokens >= MAX_TOKENS ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {Math.round(Math.min((totalTokens / MAX_TOKENS) * 100, 100))}%
                  </span>
                </p>
                <div className="flex justify-between mb-2 text-slate-400">
                  <span>Sesi Ini:</span>
                  <span className="text-white">{(totalTokens / 1000).toFixed(1)}K / 100K</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-4">
                  <div className="bg-emerald-400 h-full transition-all duration-1000" style={{ width: `${Math.min((totalTokens / MAX_TOKENS) * 100, 100)}%` }} />
                </div>
                
                {/* Clear History CTA inside Tooltip */}
                <button
                  onClick={handleClear}
                  disabled={messages.length === 0 || isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 rounded-xl transition-all duration-300 border border-white/5 disabled:opacity-20 disabled:pointer-events-none group/clear"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover/clear:rotate-12 transition-transform">
                    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  <span className="font-bold">Reset Riwayat Chat</span>
                </button>

                <p className="mt-3 text-[9px] text-slate-500 leading-relaxed italic border-t border-white/5 pt-3">
                  Limit 100K token per sesi. Klik tombol di atas untuk mengosongkan memori AI.
                </p>
              </div>
            </div>

            <button
              id="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || totalTokens >= MAX_TOKENS}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-300 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              style={{ background: totalTokens >= MAX_TOKENS ? '#94a3b8' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
            >
              {isLoading ? (
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400/60 mt-2 font-medium">
            Powered by Google Gemini · Model &amp; instruksi sesuai Konfigurasi
          </p>
        </div>
      </div>

      {/* ── Draft Modal Redesign ── */}
      <DraftModal
        isOpen={isDraftModalOpen}
        drafts={pendingDrafts}
        onConfirm={handleConfirmAll}
        onCancel={handleCancelAll}
        onChat={handleModalChat}
        isLoading={isLoading}
        input={modalChatInput}
        setInput={setModalChatInput}
      />
    </>
  )
}
