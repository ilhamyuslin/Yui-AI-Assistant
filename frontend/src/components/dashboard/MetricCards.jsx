import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const CARD_CONFIG = {
  expense: {
    label: 'Pengeluaran',
    accent: 'bg-red-500',
    icon: <TrendingDown className="w-4 h-4" />,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    trend: 'Keluar',
    trendColor: 'text-red-400'
  },
  income: {
    label: 'Pemasukan',
    accent: 'bg-emerald-500',
    icon: <TrendingUp className="w-4 h-4" />,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    trend: 'Masuk',
    trendColor: 'text-emerald-400'
  },
  savings: {
    label: 'Saving Rate',
    accent: 'bg-amber-500',
    icon: <PieChart className="w-4 h-4" />,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    trend: 'Rasio',
    trendColor: 'text-amber-400'
  },
  net: {
    label: 'Net Balance',
    accent: 'bg-indigo-500',
    icon: <Wallet className="w-4 h-4" />,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50',
    trend: 'Bersih',
    trendColor: 'text-indigo-400'
  },
}

function formatRupiah(amount) {
  if (amount === undefined || amount === null) return 'Rp –'
  const abs = Math.abs(amount)
  const prefix = amount < 0 ? '-' : ''
  return `${prefix}Rp ${abs.toLocaleString('id-ID')}`
}

export default function MetricCards({ stats, loading }) {
  const income = stats?.total_income || 0
  const expense = stats?.total_expense || 0
  const net = stats?.net_savings || 0
  const savingRate = income > 0 ? (net / income) * 100 : 0
  const isPositiveSaving = savingRate > 0

  const cards = [
    { type: 'income', value: formatRupiah(income) },
    { type: 'expense', value: formatRupiah(expense) },
    { type: 'savings', value: `${loading ? '–' : savingRate.toFixed(1)}%`, isPercent: true },
    { type: 'net', value: formatRupiah(net) },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
      {cards.map((card) => {
        const cfg = CARD_CONFIG[card.type]
        return (
          <div
            key={card.type}
            className="group relative bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 overflow-hidden"
          >
            {/* Subtle Gradient Glow */}
            <div className={cn(
              "absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full",
              cfg.accent
            )} />

            <div className="relative flex flex-col gap-2 sm:gap-4">
              {/* Top Row: Icon & Label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110", cfg.iconBg, cfg.iconColor)}>
                    {cfg.icon}
                  </div>
                  <span className="text-[0.55rem] sm:text-[0.65rem] font-black uppercase tracking-widest text-slate-400">
                    {cfg.label}
                  </span>
                </div>

                {/* Micro Indicator */}
                <div className={cn("flex items-center gap-1 text-[0.6rem] font-black uppercase tracking-tighter opacity-70", cfg.trendColor)}>
                  {card.type === 'income' || (card.type === 'savings' && isPositiveSaving) ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">{cfg.trend}</span>
                </div>
              </div>

              <div>
                <h3 className={cn(
                  "text-[1rem] sm:text-[1.2rem] xl:text-[1.6rem] font-black tracking-tight transition-all truncate",
                  loading ? "text-slate-200 animate-pulse" : "text-slate-900",
                  (card.type === 'net' && net < 0) || (card.type === 'savings' && savingRate < 0) ? "text-red-600" : ""
                )} title={card.value}>
                  {card.value}
                </h3>

                {/* Mini Bar removed for consistency */}
              </div>
            </div>

            {/* Bottom Accent Line */}
            <div className={cn("absolute bottom-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300", cfg.accent)} />
          </div>
        )
      })}
    </div>
  )
}
