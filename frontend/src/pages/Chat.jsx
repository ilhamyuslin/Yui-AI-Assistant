import { useState, useRef, useEffect, useCallback } from 'react'
import { chatApi } from '@/lib/chatApi'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

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

/** Confirmation Card — rendered in place of a bubble when AI detects a transaction */
function ConfirmationCard({ txData, onConfirm, onCancel, isLoading, isHistory }) {
  const formatRupiah = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`
  const typeLabel = { Expense: '💸 Pengeluaran', Income: '💰 Pemasukan', Transfer: '🔁 Transfer' }

  return (
    <div className="flex items-end gap-3 mb-4 animate-in slide-in-from-bottom-2 duration-300">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
        </svg>
      </div>
      {/* Card */}
      <div className="max-w-[75%] w-full rounded-2xl rounded-bl-sm bg-white/80 backdrop-blur-xl border border-emerald-100/80 shadow-lg overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-3 border-b border-slate-100/80 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' }}>
          <span className="text-emerald-600 font-black text-xs uppercase tracking-widest">
            🧐 Konfirmasi Transaksi
          </span>
        </div>
        {/* Details */}
        <div className="px-5 py-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Tipe</span>
            <span className="text-xs font-bold text-slate-700">{typeLabel[txData.transaction_type] || txData.transaction_type}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Item</span>
            <span className="text-xs font-bold text-slate-700 text-right max-w-[180px]">{txData.item_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Jumlah</span>
            <span className="text-sm font-black text-emerald-600">{formatRupiah(txData.amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Kategori</span>
            <span className="text-xs font-bold text-slate-700">{txData.category}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Sumber</span>
            <span className="text-xs font-bold text-slate-700">{txData.source_of_fund}</span>
          </div>
          {txData.destination_account && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Tujuan</span>
              <span className="text-xs font-bold text-slate-700">{txData.destination_account}</span>
            </div>
          )}
          {txData.transaction_notes && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Catatan</span>
              <span className="text-xs font-bold text-slate-500 italic">{txData.transaction_notes}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Tanggal</span>
            <span className="text-xs font-bold text-slate-700">{txData.transaction_date || new Date().toISOString().split('T')[0]}</span>
          </div>
        </div>
        {/* Actions */}
        {isHistory ? (
          <div className="px-5 pb-4">
            <div className="py-2.5 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 text-center border border-slate-200">
              Riwayat Draf Transaksi
            </div>
          </div>
        ) : (
          <div className="px-5 pb-4 flex gap-2">
            <button
              id="chat-confirm-save-btn"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all duration-300 hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
            >
              {isLoading ? 'Menyimpan...' : '✅ Simpan'}
            </button>
            <button
              id="chat-confirm-cancel-btn"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-slate-500 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 active:scale-95 disabled:opacity-50"
            >
              ❌ Batal
            </button>
          </div>
        )}
      </div>
    </div>
  )
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
  const [confirmingIdx, setConfirmingIdx] = useState(null) // index of message being confirmed
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
        const loadedMessages = []
        res.data.forEach((msg, messageIndex) => {
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
    if (!text || isLoading) return

    setInput('')
    
    // 1. Auto-cancel pending transactions yang masih menggantung
    // 2. Tambahkan pesan user ke layar
    setMessages(prev => {
      const updated = prev.map(m => 
        (m.type === 'pending_tx' && m.confirmed === false)
          ? { ...m, type: 'text', content: '❌ Dibatalkan (Diabaikan karena ada pesan baru)', confirmed: true }
          : m
      )
      return [...updated, { role: 'user', type: 'text', content: text, id: Date.now() + Math.random() }]
    })

    setIsLoading(true)

    try {
      const response = await chatApi.send(text)

      if (response.type === 'PENDING_TX') {
        addMessage({ role: 'ai', type: 'pending_tx', content: response.data, confirmed: false })
      } else if (response.type === 'PENDING_TX_MULTI') {
        // Render semua kartu transaksi secara berurutan
        response.data.forEach((txData, idx) => {
          setTimeout(() => {
            addMessage({ role: 'ai', type: 'pending_tx', content: txData, confirmed: false })
          }, idx * 10)
        });
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

  // ── Confirm transaction ───────────────────────────────────────
  const handleConfirm = async (msgId, txData) => {
    setConfirmingIdx(msgId)
    try {
      // Make sure transaction_date has a value before saving
      const finalTxData = {
        ...txData,
        transaction_date: txData.transaction_date || new Date().toISOString().split('T')[0]
      }
      
      const result = await chatApi.confirm(finalTxData)
      // Replace the ConfirmationCard with a success message
      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, type: 'text', content: result.message, confirmed: true }
          : m
      ))
      toast.success('Transaksi berhasil disimpan!')
      if (result.warning) toast.warning(result.warning)
      // Signal dashboard to refresh
      window.dispatchEvent(new CustomEvent('transaction-saved'))
    } catch (err) {
      toast.error(`Gagal menyimpan: ${err.message}`)
    } finally {
      setConfirmingIdx(null)
    }
  }

  // ── Cancel transaction ────────────────────────────────────────
  const handleCancel = async (msgId) => {
    setConfirmingIdx(msgId)
    try {
      await chatApi.cancel()
      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, type: 'text', content: '❌ Transaksi dibatalkan.' }
          : m
      ))
    } catch (err) {
      toast.error('Gagal membatalkan.')
    } finally {
      setConfirmingIdx(null)
    }
  }

  // ── Clear history ─────────────────────────────────────────────
  const handleClear = async () => {
    if (messages.length === 0) return
    try {
      await chatApi.clear()
      setMessages([])
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

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Keyframe for typing animation — injected once */}
      <style>{`
        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-40px)] max-w-3xl mx-auto">

        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between pb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              AI Chat
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5 ml-12">
              Tanya apa saja — catat transaksi, cek saldo, budget &amp; investasi
            </p>
          </div>

          {/* Clear History Button */}
          <button
            id="chat-clear-history-btn"
            onClick={handleClear}
            disabled={messages.length === 0 || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-rose-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
            Hapus Riwayat
          </button>
        </div>

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
                        onConfirm={() => handleConfirm(msg.id, msg.content)}
                        onCancel={() => handleCancel(msg.id)}
                        isLoading={confirmingIdx === msg.id}
                        isHistory={msg.isHistory}
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
        <div className="flex-shrink-0 pt-4">
          <div className="flex items-end gap-3 p-2 bg-white/70 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-lg shadow-black/[0.03]">
            <textarea
              ref={inputRef}
              id="chat-message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan atau catat transaksi... (Enter untuk kirim)"
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none px-3 py-2.5 min-h-[44px] max-h-[140px] leading-relaxed disabled:opacity-50"
              style={{ overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
              }}
            />
            <button
              id="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-300 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
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
    </>
  )
}
