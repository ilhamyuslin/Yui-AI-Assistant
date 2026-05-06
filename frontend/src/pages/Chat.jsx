import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { cn } from '@/lib/utils'
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
      <div className="max-w-[75%] px-5 py-4 rounded-2xl rounded-bl-sm bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm overflow-hidden break-words">
        <div className="text-slate-700 text-sm leading-relaxed prose prose-sm prose-emerald max-w-none
          prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-slate-800 prose-strong:font-bold
          prose-headings:text-slate-800 prose-headings:font-bold prose-code:text-emerald-600 prose-code:bg-emerald-50 prose-code:px-1 prose-code:rounded
          prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3 prose-pre:rounded-xl prose-pre:overflow-x-auto">
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
      <div className="max-w-[75%] px-5 py-4 rounded-2xl rounded-br-sm text-white text-sm leading-relaxed shadow-md break-words"
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

import {
  Wallet,
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  Coins,
  Plus,
  X,
  Save,
  Trash2,
  ChevronRight,
  ArrowRightLeft,
  HelpCircle,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

/** Help Modal — Shows quick prompt guide */
function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const guides = [
    { icon: <Zap className="text-amber-500" size={16} />, title: 'Transaksi Cepat', desc: '"Beli bakso 20rb pake BCA"' },
    { icon: <ArrowRightLeft className="text-blue-500" size={16} />, title: 'Transfer Antar Akun', desc: '"Pindah 100rb dari Jago ke Cash"' },
    { icon: <Sparkles className="text-purple-500" size={16} />, title: 'Kelola Budget', desc: '"Set budget makan 2jt sebulan"' },
    { icon: <Wallet className="text-emerald-500" size={16} />, title: 'Tambah Asset', desc: '"Tambah akun Mandiri saldo 5jt"' },
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-100">
              <Info size={16} className="text-white" />
            </div>
            <h3 className="font-black text-slate-800 tracking-tight">Panduan Yui</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs font-medium text-slate-500 leading-relaxed">
            Ngobrol sama Yui kayak chat biasa aja ko hehe. Dia bisa langsung paham perintah dengan bahasa sehari hari, ini contoh nya:
          </p>
          <div className="space-y-3">
            {guides.map((g, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
                <div className="mt-0.5">{g.icon}</div>
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{g.title}</h4>
                  <p className="text-xs text-slate-500 italic mt-0.5">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black tracking-widest active:scale-95 transition-all"
            >
              Mulai Coba
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const BEHAVIORS = [
  { id: 'Must', label: 'M', color: 'bg-indigo-500', shadow: 'shadow-indigo-500/20' },
  { id: 'Need', label: 'N', color: 'bg-teal-500', shadow: 'shadow-teal-500/20' },
  { id: 'Want', label: 'W', color: 'bg-rose-500', shadow: 'shadow-rose-500/20' },
  { id: 'Saving', label: 'S', color: 'bg-amber-500', shadow: 'shadow-amber-500/20' }
];

const ACCOUNT_ICONS = [
  { id: 'Wallet', Icon: Wallet },
  { id: 'Banknote', Icon: Banknote },
  { id: 'CreditCard', Icon: CreditCard },
  { id: 'Landmark', Icon: Landmark },
  { id: 'Smartphone', Icon: Smartphone },
  { id: 'Coins', Icon: Coins }
];

/** Individual Draft Card — Optimized for 0% lag and 100% Premium Look */
function DraftCard({ item, idx, onUpdate, onDelete, categories, accounts, typeLabel }) {
  const [localName, setLocalName] = useState('');
  const [localAmount, setLocalAmount] = useState('');
  const [localNotes, setLocalNotes] = useState('');

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
    },
    account: {
      primary: 'bg-indigo-500',
      text: 'text-indigo-500',
      bg: 'bg-indigo-50/40',
      hover: 'hover:border-indigo-100',
      shadow: 'rgba(99,102,241,0.1)'
    },
    budget: {
      primary: 'bg-violet-500',
      text: 'text-violet-500',
      bg: 'bg-violet-50/40',
      hover: 'hover:border-violet-100',
      shadow: 'rgba(139,92,246,0.1)'
    }
  };

  const isAccount = item._itemType === 'account';
  const isBudget = item._itemType === 'budget';
  const isTransfer = (item.transaction_type || item.type) === 'Transfer';

  const type = isAccount ? 'account' : (isBudget ? 'budget' : ((item.transaction_type || item.type)?.toLowerCase() || 'expense'));
  const theme = colors[type] || colors.expense;

  const displayTitle = isAccount ? (item.name || '') : (isBudget ? (item.category || '') : (item.item_name || ''));
  const displayAmount = isAccount ? item.balance : (isBudget ? item.amount : item.amount);

  useEffect(() => {
    setLocalName(displayTitle);
    setLocalAmount(displayAmount !== undefined && displayAmount !== null ? String(displayAmount) : '');
    setLocalNotes(item.transaction_notes || '');
  }, [displayTitle, displayAmount, item.transaction_notes]);

  const isValidSelection = (val, list) => {
    if (!val) return false;
    const sVal = String(val).trim().toLowerCase();
    if (sVal === '' || sVal === 'null' || sVal === 'undefined') return false;
    return list.some(l => String(l).toLowerCase() === sVal);
  };

  const accountNames = accounts.map(a => a.name);

  const handleBlur = () => {
    if (isAccount) onUpdate(idx, 'name', localName);
    else if (isBudget) onUpdate(idx, 'category', localName);
    else onUpdate(idx, 'item_name', localName);

    if (isAccount) onUpdate(idx, 'balance', localAmount);
    else onUpdate(idx, 'amount', localAmount);

    onUpdate(idx, 'transaction_notes', localNotes);
  };

  return (
    <div className={`group relative p-5 rounded-[2.5rem] bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl ${theme.hover} transition-all duration-500 overflow-hidden`}>
      {/* Premium Background Accent */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 ${theme.bg} rounded-full blur-3xl transition-colors duration-700`} />

      <div className="relative space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${theme.primary} shadow-[0_0_10px_${theme.shadow}]`} />
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.text}`}>
                {isAccount ? 'AKUN BARU/UPDATE' : (isBudget ? 'SET BUDGET' : (typeLabel[item.transaction_type] || item.transaction_type))}
              </span>
            </div>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleBlur}
              className="w-full bg-transparent border-none p-0 text-lg font-black text-slate-800 focus:ring-0 focus:outline-none placeholder:text-slate-300 selection:bg-slate-100"
              placeholder={isAccount ? "Nama akun..." : (isBudget ? "Kategori budget..." : "Nama transaksi...")}
            />
            {!isAccount && !isBudget && (
              <input
                type="text"
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={handleBlur}
                className="w-full bg-transparent border-none p-0 text-[11px] font-medium text-slate-400 focus:ring-0 focus:outline-none placeholder:text-slate-200 mt-0.5 italic"
                placeholder="Tambah catatan..."
              />
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end">
              <span className="text-sm font-black text-slate-300 mr-1.5">Rp</span>
              <input
                type="text"
                value={localAmount ? Number(localAmount).toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setLocalAmount(val);
                }}
                onBlur={handleBlur}
                className="w-36 bg-transparent border-none p-0 text-2xl font-black text-slate-900 text-right focus:ring-0 focus:outline-none placeholder:text-slate-100"
                placeholder="0"
              />
            </div>
            {!isAccount && !isBudget && (
              <input
                type="date"
                value={item.transaction_date || getLocalDateString()}
                onChange={(e) => onUpdate(idx, 'transaction_date', e.target.value)}
                className="text-[10px] font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 px-3 py-1 rounded-full border-none focus:ring-0 outline-none cursor-pointer transition-all mt-1"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
          {isAccount && (
            <div className="flex-1 flex gap-1.5">
              {ACCOUNT_ICONS.map(({ id, Icon }) => (
                <button
                  key={id}
                  onClick={() => onUpdate(idx, 'icon', id)}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-xl border transition-all",
                    item.icon === id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                      : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200"
                  )}
                >
                  <Icon size={16} strokeWidth={2.5} />
                </button>
              ))}
            </div>
          )}

          {isBudget && (
            <div className="flex-1 flex bg-slate-50 p-1 rounded-2xl gap-1">
              {BEHAVIORS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onUpdate(idx, 'behavior_group', b.id)}
                  className={cn(
                    "flex-1 h-9 rounded-xl text-[11px] font-black transition-all flex items-center justify-center",
                    (item.behavior_group || 'Want') === b.id
                      ? `${b.color} text-white shadow-lg ${b.shadow} scale-[1.05]`
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}

          {!isAccount && !isBudget && (
            <>
              <div className="flex-1 relative group/sel">
                <select
                  value={item.source_of_fund || ''}
                  onChange={(e) => onUpdate(idx, 'source_of_fund', e.target.value)}
                  className={cn(
                    "w-full appearance-none bg-slate-50/50 border rounded-2xl px-4 py-2.5 text-[11px] font-black text-slate-600 focus:bg-white focus:border-slate-200 outline-none transition-all cursor-pointer",
                    !isValidSelection(item.source_of_fund, accountNames) ? "border-rose-200 bg-rose-50/30" : "border-slate-100"
                  )}
                >
                  <option value="">Dari Akun</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>

              {isTransfer && (
                <div className="flex-1 relative group/sel">
                  <select
                    value={item.destination_account || ''}
                    onChange={(e) => onUpdate(idx, 'destination_account', e.target.value)}
                    className={cn(
                      "w-full appearance-none bg-blue-50/50 border rounded-2xl px-4 py-2.5 text-[11px] font-black text-blue-700 focus:bg-white focus:border-blue-200 outline-none transition-all cursor-pointer",
                      !isValidSelection(item.destination_account, accountNames) ? "border-rose-200 bg-rose-50/30" : "border-blue-100"
                    )}
                  >
                    <option value="">Ke Akun</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>
              )}

              {!isTransfer && (
                <div className="flex-1 relative group/sel">
                  <select
                    value={item.category || ''}
                    onChange={(e) => onUpdate(idx, 'category', e.target.value)}
                    className={cn(
                      "w-full appearance-none bg-slate-50/50 border rounded-2xl px-4 py-2.5 text-[11px] font-black text-slate-600 text-right focus:bg-white focus:border-slate-200 outline-none transition-all cursor-pointer pr-4",
                      !isValidSelection(item.category, categories) ? "border-rose-200 bg-rose-50/30" : "border-slate-100"
                    )}
                  >
                    <option value="">Kategori</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={() => onDelete(idx)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-all active:scale-90 flex-shrink-0"
            title="Hapus draf ini"
          >
            <Trash2 size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}



/** Draft Modal — Floating list of transactions with its own chat input */
function DraftModal({
  isOpen, drafts, onConfirm, onCancel, isLoading,
  categories, accounts, onUpdateDraft, onDeleteDraft
}) {
  if (!isOpen || !drafts || drafts.length === 0) return null;

  const formatRupiah = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;
  const typeLabel = { Expense: 'Pengeluaran', Income: 'Pemasukan', Transfer: 'Transfer' };

  const isInvalid = drafts.some(item => {
    if (item._itemType === 'account') return !item.name?.trim();
    if (item._itemType === 'budget') return !item.category?.trim();
    if (item._itemType === 'account_delete' || item._itemType === 'budget_delete') return false;

    // Helper to validate if a value is selected and exists in the allowed list
    const isValidSelection = (val, list) => {
      if (!val) return false;
      const sVal = String(val).trim().toLowerCase();
      if (sVal === '' || sVal === 'null' || sVal === 'undefined') return false;
      return list.some(l => String(l).toLowerCase() === sVal);
    };

    const accountNames = accounts.map(a => a.name);
    const itemType = (item.transaction_type || item.type || '').toLowerCase();

    if (itemType === 'transfer') {
      return !isValidSelection(item.source_of_fund, accountNames) ||
        !isValidSelection(item.destination_account, accountNames);
    }

    // Default: Expense / Income
    return !isValidSelection(item.source_of_fund, accountNames) ||
      !isValidSelection(item.category, categories);
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">

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
        <div className="flex-1 overflow-y-auto px-2 py-6 space-y-4 no-scrollbar">
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

        {/* Modal Actions */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
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
              disabled={isLoading || isInvalid}
              className="flex-[2] py-3.5 rounded-2xl text-xs font-black text-white shadow-xl shadow-emerald-100 hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
            >
              {isLoading ? 'MEMPROSES...' : `SIMPAN ${drafts.length} ITEM`}
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
        <h2 className="text-xl font-black text-slate-800">Halo! Aku Yui 👋</h2>
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
  const { setIsNavigationBlocked } = useOutletContext() || {}

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
  const [showHelpModal, setShowHelpModal] = useState(false)
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const MAX_TOKENS = 100000

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Fix: Force scroll when keyboard opens to push messages up
  useEffect(() => {
    if (isKeyboardOpen) {
      // Small delay to wait for viewport resize animation
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isKeyboardOpen]);

  // Load data on mount
  useEffect(() => {
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
  const handleSend = async (overriddenAttachment = null) => {
    const text = input.trim()
    const currentAttachment = overriddenAttachment || attachment
    if (!text && !currentAttachment) return
    if (isLoading || totalTokens >= MAX_TOKENS) return

    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    addMessage({ role: 'user', type: 'text', content: text || (currentAttachment ? '📸 [Kirim Gambar Struk]' : '') })

    setIsLoading(true)
    setIsNavigationBlocked?.(true)
    let shouldFocusAfterSend = true;

    try {
      const response = await chatApi.send(text, currentAttachment)
      if (currentAttachment) removeAttachment()

      if (response.totalTokens !== undefined) setTokens(response.totalTokens)

      if (response.type === 'PENDING_MULTI' || response.type === 'PENDING_TX' || response.type === 'PENDING_TX_MULTI' ||
        response.type.startsWith('PENDING_ACCOUNT') || response.type.startsWith('PENDING_BUDGET')) {

        shouldFocusAfterSend = false; // Transaction detected, don't focus
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

        setPendingDrafts(prev => [...prev, ...newItems]);

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
      setIsNavigationBlocked?.(false)
      if (shouldFocusAfterSend) {
        setTimeout(() => inputRef.current?.focus(), 100)
      } else {
        // Explicitly blur just in case
        inputRef.current?.blur();
      }
    }
  }

  // ── Confirm All Drafts ───────────────────────────────────────
  const handleConfirmAll = async () => {
    setIsLoading(true)
    setIsNavigationBlocked?.(true)
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

      // Refresh data lokal (akun & kategori) agar dropdown terupdate
      loadAuxData()
    } catch (err) {
      toast.error(`Gagal memproses: ${err.message}`)
    } finally {
      setIsLoading(false)
      setIsNavigationBlocked?.(false)
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
        const imageData = reader.result
        setAttachment(imageData)
        setAttachmentPreview(URL.createObjectURL(compressedFile))
        setIsProcessingImage(false)

        // Auto-send immediately
        handleSend(imageData)
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

  const handleKeyDown = (e) => {
    // Mac: Command + Enter, Windows/Others: Alt + Enter
    if (e.key === 'Enter' && (e.metaKey || e.altKey)) {
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

  const location = useLocation();

  // Detect keyboard visibility on mobile
  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => {
      const isCurrentlyOpen = window.visualViewport.height < window.innerHeight * 0.85;
      setIsKeyboardOpen(isCurrentlyOpen);
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
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

      <div className="flex flex-col h-full relative overflow-hidden bg-slate-50/30 px-4 sm:px-6 overscroll-none">
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full relative min-h-0">
          {/* ── Messages Area ── */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-1 pt-2 lg:pt-10 pb-5 overscroll-contain">
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
          <div className={cn(
            "flex-shrink-0 pt-4 pb-2 lg:pb-0 transition-all duration-300",
            isKeyboardOpen ? "mb-2" : "mb-5"
          )}>
            {/* Attachment Preview Overlay */}
            {attachmentPreview && (
              <div className="relative mb-2 ml-2 w-20 h-20 group">
                <img
                  src={attachmentPreview}
                  className="w-full h-full object-cover rounded-xl border-2 border-emerald-500 shadow-lg"
                  alt="Preview"
                />
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
                placeholder={totalTokens >= MAX_TOKENS ? "Limit token tercapai!" : "Ketik pesan . . ."}
                disabled={isLoading || loadingHistory || totalTokens >= MAX_TOKENS}
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
                onClick={() => {
                  if (!input.trim() && !attachment) {
                    setShowHelpModal(true);
                  } else {
                    handleSend();
                  }
                }}
                disabled={isLoading || totalTokens >= MAX_TOKENS}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-300 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                style={{
                  background: totalTokens >= MAX_TOKENS
                    ? '#94a3b8'
                    : (!input.trim() && !attachment)
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' // Orange for help
                      : 'linear-gradient(135deg, #059669 0%, #10b981 100%)' // Emerald for send
                }}
              >
                {isLoading ? (
                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (!input.trim() && !attachment) ? (
                  <HelpCircle size={18} strokeWidth={2.5} />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400/60 mt-2 font-medium">

            </p>
          </div>
        </div>
      </div>

      {/* ── Help Modal ── */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* ── Draft Modal Redesign ── */}
      <DraftModal
        isOpen={isDraftModalOpen}
        drafts={pendingDrafts}
        onConfirm={handleConfirmAll}
        onCancel={handleCancelAll}
        isLoading={isLoading}
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
