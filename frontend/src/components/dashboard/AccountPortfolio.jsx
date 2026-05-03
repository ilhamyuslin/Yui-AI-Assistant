import { useState, useEffect, useRef } from 'react'
import { Wallet, Settings2, Plus, Banknote, CreditCard, Landmark, Smartphone, Coins, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import AccountModal from './AccountModal'

const IconComponent = ({ name, size = 18, className }) => {
  const icons = { Wallet, Banknote, CreditCard, Landmark, Smartphone, Coins }
  const Icon = icons[name] || Wallet
  return <Icon size={size} className={className} />
}

export default function AccountPortfolio({ accounts, totalAssets, loading, onUpdate, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const scrollRef = useRef(null)

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="mb-10">
      {/* Header section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Portofolio Aset</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ringkasan kekayaan kamu</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-bold text-xs shadow-sm transition-all active:scale-95 group"
        >
          <Settings2 size={14} className="group-hover:rotate-90 transition-transform duration-500 shrink-0" />
          <span className="hidden md:inline">Kelola Portofolio</span>
          <span className="inline md:hidden">Kelola</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-stretch h-auto lg:h-[180px]">

        {/* 1. STATIC TOTAL ASSET CARD - The Anchor */}
        <div className="w-full lg:w-1/4 min-w-[240px] xl:w-[280px] bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 shadow-none lg:shadow-xl lg:shadow-emerald-950/20 relative flex flex-col justify-center border border-white/5 shrink-0 z-20">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Wallet size={18} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Total Aset</span>
            </div>

            <span className="block text-3xl font-black text-white tracking-tighter mb-1">
              {loading ? '...' : formatCurrency(totalAssets)}
            </span>
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-emerald-500/10 rounded-md">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Terkonsolidasi</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. SLIDER CONTAINER - Use negative margin to pull the slider to the edges so the first card aligns with the card above */}
        <div className="flex-1 min-w-0 relative -mx-8">
          {/* Edge Fades for Premium look */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#f8fafc] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f8fafc] to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth h-full outline-none px-8 py-4 -my-4"
            style={{
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <style dangerouslySetInnerHTML={{
              __html: `
              .no-scrollbar::-webkit-scrollbar { display: none; }
            `}} />

            {/* ACCOUNT CARDS - Centered with p-6 for breathing room */}
            {!loading && accounts.map(acc => (
              <div
                key={acc.id}
                className="min-w-[240px] bg-white border border-slate-100 rounded-[2.5rem] p-6 flex flex-col justify-center shadow-sm hover:shadow-md transition-all group shrink-0 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-2xl border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 group-hover:text-emerald-500 transition-all text-slate-400">
                    <IconComponent name={acc.icon} size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Sinkron</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">{acc.name}</span>
                  <span className="block text-xl font-black text-slate-800 tracking-tight">
                    {formatCurrency(acc.balance)}
                  </span>
                </div>

                {/* Hover Actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditTarget(acc); setModalOpen(true) }}
                    className="w-7 h-7 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-100 flex items-center justify-center shadow-sm transition-all"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => onDelete(acc.id)}
                    className="w-7 h-7 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-100 flex items-center justify-center shadow-sm transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}

            {/* ADD SHORTHAND */}
            <button
              onClick={() => setModalOpen(true)}
              className="min-w-[240px] bg-slate-50/40 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-6 flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-500 transition-all group shrink-0"
            >
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={20} strokeWidth={3} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Tambah Akun</span>
            </button>
          </div>
        </div>

      </div>

      <AccountModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditTarget(null) }}
        accounts={accounts}
        onSave={onUpdate}
        onDelete={onDelete}
        defaultAccount={editTarget}
      />
    </div>
  )
}
