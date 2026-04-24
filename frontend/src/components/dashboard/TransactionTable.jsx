import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Utensils, 
  ShoppingBag, 
  Car, 
  Zap, 
  Heart, 
  Play, 
  Gift, 
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank
} from 'lucide-react'
import TransactionEditModal from './TransactionEditModal'

const TYPE_CONFIG = {
  Expense: { icon: ArrowDownLeft, color: 'text-rose-500', bg: 'bg-rose-50', sign: '−' },
  Income:  { icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50', sign: '+' },
  Saving:  { icon: PiggyBank, color: 'text-blue-500', bg: 'bg-blue-50', sign: '+' },
}

const CATEGORY_ICONS = {
  'Makan & Minum': Utensils,
  'Belanja Bulanan': ShoppingBag,
  'Transportasi': Car,
  'Tagihan & Utilitas': Zap,
  'Kesehatan': Heart,
  'Hiburan': Play,
  'Sedekah & Hadiah': Gift,
  'Lainnya': MoreHorizontal,
}

function formatRupiah(v) {
  return `Rp ${Math.abs(v).toLocaleString('id-ID')}`
}

function getGroupLabel(date) {
  const now = dayjs()
  const d = dayjs(date)
  if (d.isSame(now, 'day')) return 'Hari Ini'
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'Kemarin'
  return d.format('DD MMMM YYYY')
}

export default function TransactionTable({ transactions, loading, onUpdate, onDelete, categories }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingTx, setEditingTx] = useState(null)
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 1024 ? 4 : 8)

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth < 1024 ? 4 : 8)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Swipe logic
  const [touchStart, setTouchStart] = useState({ x: null, y: null })
  const handleTouchStart = (e) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
  }
  const handleTouchEnd = (e) => {
    if (touchStart.x === null || touchStart.y === null) return
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
    
    const deltaX = touchStart.x - touchEnd.x
    const deltaY = touchStart.y - touchEnd.y
    
    // Only trigger if horizontal movement is greater than vertical movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && currentPage < totalPages) setCurrentPage(p => p + 1)
      if (deltaX < 0 && currentPage > 1) setCurrentPage(p => p - 1)
    }
    setTouchStart({ x: null, y: null })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-6 h-6 border-2 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">Sinkronisasi Data…</span>
      </div>
    )
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4 border-2 border-dashed border-slate-50 rounded-[2.5rem]">
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
          <MoreHorizontal size={32} strokeWidth={1} />
        </div>
        <p className="text-[0.75rem] font-bold uppercase tracking-widest opacity-60">Belum Ada Riwayat</p>
      </div>
    )
  }

  const sortedTx = [...transactions].sort((a, b) => dayjs(b.transaction_date).diff(dayjs(a.transaction_date)))
  const totalPages = Math.ceil(sortedTx.length / itemsPerPage)
  const currentItems = sortedTx.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Grouping logic for the current page
  const groups = currentItems.reduce((acc, tx) => {
    const label = getGroupLabel(tx.transaction_date)
    if (!acc[label]) acc[label] = []
    acc[label].push(tx)
    return acc
  }, {})

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col h-full"
    >
      <div className="flex-1 flex flex-col gap-6 max-h-[450px] md:max-h-none overflow-y-auto pr-2 no-scrollbar">
        {Object.entries(groups).map(([label, items]) => (
          <div key={label} className="flex flex-col gap-3">
            <h3 className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
              {label}
            </h3>
            
            <div className="flex flex-col gap-1">
              {items.map((tx) => {
                const typeCfg = TYPE_CONFIG[tx.transaction_type] || TYPE_CONFIG.Expense
                const Icon = CATEGORY_ICONS[tx.category] || MoreHorizontal
                
                return (
                  <div 
                    key={tx.id} 
                    className="group flex items-center justify-between p-3 rounded-2xl transition-all duration-200 hover:bg-slate-50/80 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Category Icon Container */}
                      <div className="hidden md:flex w-10 h-10 rounded-2xl bg-white/40 backdrop-blur-md border border-white/50 items-center justify-center text-slate-500 group-hover:border-emerald-200 transition-all shrink-0">
                        <Icon size={18} strokeWidth={1.5} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                         <p className="text-[0.875rem] font-bold text-slate-800 leading-tight line-clamp-2">{tx.item_name || 'Tanpa Nama'}</p>
                         <p className="text-[0.65rem] font-semibold text-slate-400 mt-1 truncate">
                           {tx.category} • {tx.source_of_fund || 'Tunai'} • {dayjs(tx.transaction_date).format('HH:mm')}
                         </p>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-right">
                        <p className={cn('text-[0.875rem] font-bold mono', typeCfg.color)}>
                          {typeCfg.sign}{formatRupiah(tx.amount)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingTx(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(tx.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-50">
          <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest">
             Halaman <span className="text-slate-900">{currentPage}</span> <span className="opacity-40">/</span> {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="w-8 h-8 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 disabled:opacity-30 transition-all outline-none focus:outline-none shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="w-8 h-8 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 disabled:opacity-30 transition-all outline-none focus:outline-none shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <TransactionEditModal
        open={!!editingTx}
        onOpenChange={(open) => !open && setEditingTx(null)}
        transaction={editingTx}
        onSave={onUpdate}
        categories={categories}
      />
    </div>
  )
}
