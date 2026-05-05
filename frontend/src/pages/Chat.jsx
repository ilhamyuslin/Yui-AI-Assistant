import { useState, useRef, useEffect, useCallback } from 'react'
import { chatApi } from '@/lib/chatApi'
import imageCompression from 'browser-image-compression'
import { useChat } from '@/hooks/useChat'
import { statsApi, accountApi, transactionApi } from '@/lib/api'
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
            Riwayat Draf
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

/** Individual Draft Card — Optimized for 0% lag and 100% Premium Look */
function DraftCard({ item, idx, onUpdate, onDelete, categories, accounts, typeLabel }) {
  const [localName, setLocalName] = useState(item.item_name || '');
  const [localAmount, setLocalAmount] = useState(item.amount || '');

  const colors = {
    expense: {
      primary: 'bg-rose-500',
      text: 'text-rose-500',
      bg: 'bg-rose-50/40',
      hover: 'hover:border-rose-100',
      shadow: 'rgba(244,63,94,0.1)'
    },
    income: {
      primary: 'bg-emerald-500',
      text: 'text-emerald-500',
      bg: 'bg-emerald-50/40',
      hover: 'hover:border-emerald-100',
      shadow: 'rgba(16,185,129,0.1)'
    },
    transfer: {
      primary: 'bg-blue-500',
      text: 'text-blue-500',
      bg: 'bg-blue-50/40',
      hover: 'hover:border-blue-100',
      shadow: 'rgba(59,130,246,0.1)'
    }
  };

  const type = item.transaction_type?.toLowerCase() || 'expense';
  const theme = colors[type] || colors.expense;

  useEffect(() => {
    setLocalName(item.item_name || '');
    setLocalAmount(item.amount !== undefined && item.amount !== null ? String(item.amount) : '');
  }, [item.item_name, item.amount]);

  const handleBlur = () => {
    onUpdate(idx, 'item_name', localName);
    onUpdate(idx, 'amount', localAmount);
  };

  return (
    <div className={`group relative p-4 rounded-[2rem] bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl ${theme.hover} transition-all duration-500 overflow-hidden`}>
      {/* Premium Background Accent */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 ${theme.bg} rounded-full blur-3xl transition-colors duration-700`} />

      <div className="relative space-y-3">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${theme.primary} shadow-[0_0_8px_${theme.shadow}]`} />
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.text}`}>{typeLabel[item.transaction_type] || item.transaction_type}</span>
            </div>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleBlur}
              className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-800 focus:ring-0 focus:outline-none placeholder:text-slate-300 selection:bg-slate-100"
              placeholder="Nama transaksi..."
            />
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end">
              <span className="text-xs font-black text-slate-300 mr-1">Rp</span>
              <input
                type="text"
                value={localAmount ? Number(localAmount).toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setLocalAmount(val);
                }}
                onBlur={handleBlur}
                className="w-32 bg-transparent border-none p-0 text-xl font-black text-slate-900 text-right focus:ring-0 focus:outline-none placeholder:text-slate-100"
                placeholder="0"
              />
            </div>
            <input
              type="date"
              value={item.transaction_date || new Date().toISOString().split('T')[0]}
              onChange={(e) => onUpdate(idx, 'transaction_date', e.target.value)}
              className="text-[9px] font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded-full border-none focus:ring-0 outline-none cursor-pointer transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
          <div className="flex-1 relative group/sel">
            <select
              value={item.source_of_fund || ''}
              onChange={(e) => onUpdate(idx, 'source_of_fund', e.target.value)}
              className="w-full appearance-none bg-slate-50/50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600 focus:bg-white focus:border-slate-200 outline-none transition-all cursor-pointer"
            >
              <option value="">Pilih Akun</option>
              {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          <div className="flex-1 relative group/sel">
            <select
              value={item.category || ''}
              onChange={(e) => onUpdate(idx, 'category', e.target.value)}
              className="w-full appearance-none bg-slate-50/50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600 text-right focus:bg-white focus:border-slate-200 outline-none transition-all cursor-pointer pr-3"
            >
              <option value="">Pilih Kategori</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          <button
            onClick={() => onDelete(idx)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-all active:scale-90 flex-shrink-0"
            title="Hapus draf ini"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}



/** Draft Modal — Floating list of transactions with its own chat input */
function DraftModal({
  isOpen, drafts, onConfirm, onCancel, onChat, isLoading, input, setInput,
  categories, accounts, onUpdateDraft, onDeleteDraft
}) {
  if (!isOpen || !drafts || drafts.length === 0) return null;

  const formatRupiah = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;
  const typeLabel = { Expense: 'Pengeluaran', Income: 'Pemasukan', Transfer: 'Transfer' };

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
              <DraftCard
                key={idx}
                item={item}
                idx={idx}
                onUpdate={onUpdateDraft}
                onDelete={onDeleteDraft}
                categories={categories}
                accounts={accounts}
                typeLabel={typeLabel}
              />
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
  const {
    messages,
    totalTokens,
    setTokens,
    loadingHistory,
    draft: input,
    setDraft: setInput,
    pendingDrafts,
    setPendingDrafts,
    addMessage,
    updateLastMessage,
    clearHistory
  } = useChat()

  const [isLoading, setIsLoading] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [attachmentPreview, setAttachmentPreview] = useState(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const [modalChatInput, setModalChatInput] = useState('')
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const MAX_TOKENS = 100000

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input on mount & load data
  useEffect(() => {
    inputRef.current?.focus()
    loadAuxData()
  }, [])

  const loadAuxData = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        statsApi.getCategories(),
        accountApi.getAll()
      ])
      setCategories(catRes.data || [])
      setAccounts(accRes.data?.accounts || [])
    } catch (err) {
      console.error('Failed to load aux data:', err)
    }
  }

  // ── Send message ──────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text && !attachment) return
    if (isLoading || totalTokens >= MAX_TOKENS) return

    setInput('')
    addMessage({ role: 'user', type: 'text', content: text || (attachment ? '[Kirim Gambar Struk]' : '') })

    // ── DUMMY LOGIC FOR TESTING ──
    if (attachment) {
      setIsLoading(true)
      setTimeout(() => {
        setIsLoading(false)
        const dummyTx = {
          _itemType: 'transaction',
          item_name: 'Belanja Struk Dummy',
          amount: 150000,
          category: 'Kebutuhan Rumah',
          source_of_fund: 'BCA',
          transaction_type: 'Expense',
          transaction_date: new Date().toISOString().split('T')[0]
        }
        setPendingDrafts([dummyTx])
        setIsDraftModalOpen(true)
        addMessage({ role: 'ai', type: 'text', content: '✅ Gue udah scan struknya, Bos. Ini drafnya, bener nggak?' })
        removeAttachment()
      }, 2000)
      return
    }

    setIsLoading(true)

    try {
      const response = await chatApi.send(text)
      if (response.totalTokens !== undefined) setTokens(response.totalTokens)

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
          let updated = [...prev];
          newItems.forEach(item => {
            if (item.draft_index !== undefined && item.draft_index !== null) {
              const idx = parseInt(item.draft_index);
              if (idx >= 0 && idx < updated.length) {
                updated[idx] = { ...updated[idx], ...item };
              } else {
                updated.push(item);
              }
            } else {
              updated.push(item);
            }
          });
          return updated;
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
          const res = await chatApi.confirm(finalTxData);
          if (res?.totalTokens !== undefined) setTokens(res.totalTokens);
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

  const handleImageSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Waduh Bos, yang lo upload bukan gambar!')
      return
    }

    try {
      setIsProcessingImage(true)
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      }
      const compressedFile = await imageCompression(file, options)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAttachment(reader.result)
        setAttachmentPreview(URL.createObjectURL(compressedFile))
        setIsProcessingImage(false)
      }
      reader.readAsDataURL(compressedFile)
    } catch (error) {
      toast.error('Gagal memproses gambar.')
      setIsProcessingImage(false)
    }
  }

  const removeAttachment = () => {
    setAttachment(null)
    setAttachmentPreview(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
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
      if (response.totalTokens !== undefined) setTokens(response.totalTokens)

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
          let updated = [...prev];
          newItems.forEach(item => {
            if (item.draft_index !== undefined && item.draft_index !== null) {
              const idx = parseInt(item.draft_index);
              if (idx >= 0 && idx < updated.length) {
                updated[idx] = { ...updated[idx], ...item };
              } else {
                updated.push(item);
              }
            } else {
              updated.push(item);
            }
          });
          return updated;
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
  const onClear = async () => {
    if (!confirm('Hapus semua riwayat percakapan?')) return
    try {
      await clearHistory()
      toast.success('Riwayat berhasil dihapus')
    } catch (err) {
      toast.error('Gagal menghapus riwayat')
    }
  }

  // ── Key handler ───────────────────────────────────────────────
  const handleKeyDown = (e) => {
    // Only send on Shift + Enter (Desktop preference)
    // On mobile, users will use the send button
    if (e.key === 'Enter' && e.shiftKey) {
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

      <div className="flex flex-col h-[calc(100dvh-160px)] lg:h-[calc(100vh-80px)] max-w-3xl mx-auto relative overflow-hidden">


        {/* ── Messages Area ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-1 pt-2 lg:pt-10 pb-4">
          {loadingHistory && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-10 h-10 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Memuat Percakapan...</p>
            </div>
          ) : messages.length === 0 && !isLoading ? (
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
          {/* Attachment Preview Overlay */}
          {attachmentPreview && (
            <div className="relative mb-2 ml-2 w-20 h-20 group">
              <img 
                src={attachmentPreview} 
                className="w-full h-full object-cover rounded-xl border-2 border-emerald-500 shadow-lg" 
                alt="Preview" 
              />
              <button 
                onClick={removeAttachment}
                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          )}

          <div className="flex items-end gap-3 p-2 bg-white/70 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-lg shadow-black/[0.03]">
            {/* Attachment Button with Custom Menu */}
            <div className="relative">
              <button
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                disabled={isLoading || isProcessingImage}
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 ${showAttachmentMenu ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
              >
                {isProcessingImage ? (
                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showAttachmentMenu ? 'rotate-45' : ''}`}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                )}
              </button>

              {/* Custom Popover Menu */}
              {showAttachmentMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[90]" 
                    onClick={() => setShowAttachmentMenu(false)}
                  />
                  <div className="absolute bottom-14 left-0 w-48 p-2 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200 origin-bottom-left">
                    <button 
                      onClick={() => {
                        cameraInputRef.current?.click();
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors outline-none group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                      <span className="font-bold text-sm">Ambil Foto</span>
                    </button>
                    <button 
                      onClick={() => {
                        galleryInputRef.current?.click();
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors outline-none group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      </div>
                      <span className="font-bold text-sm">Galeri Foto</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Hidden Inputs */}
            <input 
              type="file" 
              ref={cameraInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              capture="environment"
              className="hidden" 
            />
            <input 
              type="file" 
              ref={galleryInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />

            <textarea
              ref={inputRef}
              id="chat-message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={totalTokens >= MAX_TOKENS ? "Limit token tercapai!" : "Ketik pesan atau lampirkan struk..."}
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
                  onClick={onClear}
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
              disabled={(!input.trim() && !attachment) || isLoading || totalTokens >= MAX_TOKENS}
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
            .
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
        categories={categories}
        accounts={accounts}
        onUpdateDraft={(idx, field, value) => {
          setPendingDrafts(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
          });
        }}
        onDeleteDraft={(idx) => {
          setPendingDrafts(prev => prev.filter((_, i) => i !== idx));
          toast.info('Item dihapus dari draf');
        }}
      />
    </>
  )
}
