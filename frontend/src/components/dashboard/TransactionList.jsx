import dayjs from 'dayjs'
import { 
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
  PiggyBank,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function TransactionList({ transactions, loading, onDelete }) {
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
      <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
          <MoreHorizontal size={32} strokeWidth={1} />
        </div>
        <p className="text-[0.75rem] font-bold uppercase tracking-widest opacity-60">Belum Ada Riwayat</p>
      </div>
    )
  }

  // Grouping logic
  const groups = transactions.reduce((acc, tx) => {
    const label = getGroupLabel(tx.transaction_date)
    if (!acc[label]) acc[label] = []
    acc[label].push(tx)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(groups).map(([label, items]) => (
        <div key={label} className="flex flex-col gap-3">
          {/* Group Header */}
          <h3 className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
            {label}
          </h3>
          
          {/* Group Items */}
          <div className="flex flex-col gap-2">
            {items.map((tx) => {
              const typeCfg = TYPE_CONFIG[tx.transaction_type] || TYPE_CONFIG.Expense
              const Icon = CATEGORY_ICONS[tx.category] || MoreHorizontal
              
              return (
                <div 
                  key={tx.id} 
                  className="group flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 hover:bg-slate-50/80 active:scale-[0.98]"
                >
                  {/* Category Icon */}
                  <div className="w-11 h-11 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm transition-transform group-hover:scale-105">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <p className="text-[0.875rem] font-bold text-slate-800 truncate">{tx.item_name || 'Tanpa Nama'}</p>
                       <span className={cn('text-[0.6rem] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider', typeCfg.bg, typeCfg.color)}>
                         {tx.category}
                       </span>
                    </div>
                    <p className="text-[0.65rem] font-bold text-slate-400 mt-0.5">
                      {tx.source_of_fund || 'Tunai'} • {dayjs(tx.transaction_date).format('HH:mm')}
                    </p>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={cn('text-[0.875rem] font-bold mono', typeCfg.color)}>
                        {typeCfg.sign}{formatRupiah(tx.amount)}
                      </p>
                    </div>

                    {onDelete && (
                      <button
                        onClick={() => onDelete(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 size={16} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
