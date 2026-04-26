import { useState, lazy, Suspense } from 'react'
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, BarChart3, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const InvestmentModal = lazy(() => import('./InvestmentModal'))

const TYPE_META = {
  emas:       { label: 'Emas',       icon: '🥇', bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',  dot: 'bg-amber-400'  },
  saham:      { label: 'Saham',      icon: '📈', bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100',   dot: 'bg-blue-400'   },
  crypto:     { label: 'Crypto',     icon: '🪙', bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100', dot: 'bg-violet-400' },
  reksa_dana: { label: 'Reksa Dana', icon: '📦', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100',dot: 'bg-emerald-400'},
  deposito:   { label: 'Deposito',   icon: '🏦', bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-100',    dot: 'bg-sky-400'    },
  obligasi:   { label: 'Obligasi',   icon: '📜', bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-100',   dot: 'bg-rose-400'   },
}

const fmt = (v) => {
  if (!v && v !== 0) return '–'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
}

function InvestmentCard({ inv, onEdit, onDelete }) {
  const meta    = TYPE_META[inv.type] || TYPE_META.emas
  const current = Number(inv.current_value ?? inv.purchase_value)
  const cost    = Number(inv.purchase_value)
  const diff    = current - cost
  const pct     = cost > 0 ? (diff / cost) * 100 : 0
  const isUp    = diff >= 0

  return (
    <div className="group min-w-[200px] bg-white border border-slate-100 rounded-[2.5rem] p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all shrink-0 relative overflow-hidden">

      {/* Top Row — type label + PnL badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${meta.text}`}>{meta.label}</span>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${isUp ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          {isUp
            ? <TrendingUp size={10} className="text-emerald-500" />
            : <TrendingDown size={10} className="text-rose-500" />
          }
          <span className={`text-[9px] font-black uppercase tracking-widest ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isUp ? '+' : ''}{pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Name */}
      <p className="text-[0.9rem] font-black text-slate-800 tracking-tight leading-tight mb-3 truncate">{inv.name}</p>

      {/* Values */}
      <div className="space-y-0.5">
        <span className="block text-xl font-black text-slate-900 tracking-tighter">{fmt(current)}</span>
        <span className={`block text-[0.7rem] font-bold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isUp ? '▲ +' : '▼ '}{fmt(Math.abs(diff))} dari modal
        </span>
      </div>

      {/* Hover Actions */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(inv)} className="w-7 h-7 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-100 flex items-center justify-center shadow-sm transition-all">
          <Pencil size={11} />
        </button>
        <button onClick={() => onDelete(inv)} className="w-7 h-7 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-100 flex items-center justify-center shadow-sm transition-all">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

export default function InvestmentSection({ investments, totalPortfolio, totalCost, loading, onAdd, onUpdate, onDelete }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget, setEditTarget]   = useState(null)

  const totalPnL   = totalPortfolio - totalCost
  const pnlPct     = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0
  const isPositive = totalPnL >= 0

  const handleSave = async (payload, id) => {
    try {
      if (id) {
        await onUpdate(id, payload)
        toast.success('Investasi berhasil diperbarui')
      } else {
        await onAdd(payload)
        toast.success('Investasi berhasil ditambahkan')
      }
    } catch (err) {
      toast.error('Gagal menyimpan investasi')
      throw err
    }
  }

  const handleEdit = (inv) => { setEditTarget(inv); setIsModalOpen(true) }

  const handleDelete = async (inv) => {
    if (!window.confirm(`Hapus "${inv.name}"?`)) return
    try {
      await onDelete(inv.id)
      toast.success('Investasi dihapus')
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  return (
    <div className="mb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Portofolio Investasi</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Pantau kinerja investasimu</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setIsModalOpen(true) }}
          className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-bold text-xs shadow-sm transition-all active:scale-95 group"
        >
          <Plus size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500 shrink-0" />
          <span className="hidden md:inline">Tambah Investasi</span>
          <span className="inline md:hidden">Tambah</span>
        </button>
      </div>

      {/* ── Layout: Dark Summary Card + Slider ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch h-auto lg:h-[180px]">

        {/* 1. Dark Summary Card */}
        <div className="w-full lg:w-1/4 min-w-[240px] xl:w-[280px] bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-emerald-950/20 relative flex flex-col justify-center border border-white/5 shrink-0 z-20 overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <BarChart3 size={18} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Total Investasi</span>
            </div>

            <span className="block text-3xl font-black text-white tracking-tighter mb-1">
              {loading ? <span className="inline-block w-28 h-7 bg-white/10 rounded-xl animate-pulse" /> : fmt(totalPortfolio)}
            </span>

            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {isPositive
                  ? <TrendingUp size={9} className="text-emerald-400" />
                  : <TrendingDown size={9} className="text-rose-400" />
                }
                <span className={`text-[9px] font-black uppercase tracking-widest ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{pnlPct.toFixed(1)}% all time
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Horizontal Scroll Cards */}
        <div className="flex-1 min-w-0 relative -mx-8">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#f8fafc] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f8fafc] to-transparent z-10 pointer-events-none" />

          <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth h-full px-8 py-4 -my-4">
            <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; }` }} />

            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="min-w-[240px] h-full bg-white border border-slate-100 rounded-[2rem] animate-pulse shrink-0" />
              ))
            ) : investments.length === 0 ? (
              <div className="flex items-center justify-start px-8 py-4 w-full">
                <p className="text-[0.8rem] text-slate-400 font-bold">Belum ada investasi. Klik <span className="text-emerald-600">+ Tambah Investasi</span> untuk mulai.</p>
              </div>
            ) : (
              investments.map(inv => (
                <InvestmentCard key={inv.id} inv={inv} onEdit={handleEdit} onDelete={handleDelete} />
              ))
            )}

            {/* Add Card */}
            {!loading && (
              <button
                onClick={() => { setEditTarget(null); setIsModalOpen(true) }}
                className="min-w-[240px] bg-slate-50/40 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-6 flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-500 transition-all group shrink-0"
              >
                <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={20} strokeWidth={3} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Tambah Investasi</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      <Suspense fallback={null}>
        {isModalOpen && (
          <InvestmentModal
            open={isModalOpen}
            onOpenChange={(v) => { setIsModalOpen(v); if (!v) setEditTarget(null) }}
            onSave={handleSave}
            editData={editTarget}
          />
        )}
      </Suspense>
    </div>
  )
}
