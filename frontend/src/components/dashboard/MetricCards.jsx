import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'

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

export default function MetricCards({ stats, stableStats, comparisonStats, loading }) {
  const income = stats?.total_income || 0
  const expense = stats?.total_expense || 0
  const net = stats?.net_savings || 0
  const savingRate = income > 0 ? (net / income) * 100 : 0
  const isPositiveSaving = savingRate > 0

  const renderValue = (type) => {
    if (loading) return <span className="text-slate-200 animate-pulse">...</span>
    
    const colorClass = (type === 'net' && net < 0) || (type === 'savings' && savingRate < 0) ? "text-rose-600" : "text-slate-900"

    if (type === 'savings') {
      const parts = Math.abs(savingRate).toFixed(1).split('.')
      return (
        <span className={cn("inline-flex items-baseline tracking-tighter", colorClass)}>
          {savingRate < 0 && <span className="font-black mr-0.5">-</span>}
          <span className="text-[1.3rem] sm:text-[1.6rem] font-black">{parts[0]}</span>
          <span className="text-[0.8rem] sm:text-[1rem] font-bold opacity-60">.{parts[1]}%</span>
        </span>
      )
    }

    const val = type === 'income' ? income : type === 'expense' ? expense : net
    const absVal = Math.abs(val)
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(absVal)
    
    const match = formatted.match(/^(Rp\s?)(\d+)(.*)$/)
    if (!match) return formatted

    const [, prefix, main, rest] = match
    const isNegative = val < 0

    return (
      <span className={cn("inline-flex items-baseline tracking-tighter", colorClass)}>
        {isNegative && <span className="font-black mr-0.5">-</span>}
        <span className="font-black opacity-30 text-[0.8rem] sm:text-[0.9rem] mr-0.5">Rp</span>
        <span className="font-black text-[1.2rem] sm:text-[1.5rem]">{main}</span>
        <span className="font-bold opacity-50 text-[0.8rem] sm:text-[1rem]">{rest}</span>
      </span>
    )
  }

  const cards = [
    { type: 'income' },
    { type: 'expense' },
    { type: 'savings' },
    { type: 'net' },
  ]

  const formatCurrency = (val) => {
    const absVal = Math.abs(val)
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(absVal)
  }

  const getTrend = (current, previous) => {
    const curr = Number(current) || 0
    const prev = Number(previous) || 0

    if (prev === 0) {
      if (curr === 0) return { percent: 0, isUp: false, isSame: true }
      return { percent: 100, isUp: curr > 0, isSame: false }
    }
    
    const diff = curr - prev
    const percent = Math.abs((diff / prev) * 100).toFixed(0)
    return { percent, isUp: diff > 0, isSame: diff === 0 }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
      {cards.map((card) => {
        const cfg = CARD_CONFIG[card.type]
        const currentValue = card.type === 'income' ? income : card.type === 'expense' ? expense : card.type === 'savings' ? savingRate : net
        
        // ── Logic: Comparison Builder ──
        const comps = []
        if (comparisonStats && !comparisonStats.loading) {
          const getValFromData = (data) => {
            if (!data) return 0
            if (card.type === 'savings') {
              const i = data.total_income || 0
              const n = data.net_savings || 0
              return i > 0 ? (n / i) * 100 : 0
            }
            const k = card.type === 'income' ? 'total_income' : card.type === 'expense' ? 'total_expense' : 'net_savings'
            return data[k] || 0
          }
          
          // 1. Monthly Comparison
          if (card.type === 'expense') {
            // Expense use MTD (Apple-to-apple)
            const currentMtdVal = getValFromData(stableStats)
            const mtdPrev = getValFromData(comparisonStats.prevCycleMtd)
            comps.push({ label: 'Bulan Lalu (MTD)', val: mtdPrev, trend: getTrend(currentMtdVal, mtdPrev) })
          } else {
            // Others use Full Cycle (Total Bulan Ini vs Total Bulan Lalu)
            const currentTotalVal = getValFromData(stableStats)
            const fullPrev = getValFromData(comparisonStats.prevCycleFull)
            comps.push({ label: 'Total Bulan Lalu', val: fullPrev, trend: getTrend(currentTotalVal, fullPrev) })
          }

          // 2. Extra Comparisons for Expense
          if (card.type === 'expense') {
            const weekPrev = getValFromData(comparisonStats.lastWeek)
            const weekCurr = getValFromData(comparisonStats.thisWeek)
            comps.push({ label: 'Minggu Lalu (7d)', val: weekPrev, trend: getTrend(weekCurr, weekPrev) })

            const dayPrev = getValFromData(comparisonStats.yesterday)
            const dayCurr = getValFromData(comparisonStats.today)
            comps.push({ label: 'Hari Ini vs Kemarin', val: dayPrev, trend: getTrend(dayCurr, dayPrev) })
          }
        }

        return (
          <Popover.Root key={card.type}>
            <Popover.Trigger asChild>
              <div
                className="group relative bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] py-3 sm:py-4 px-4 sm:px-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 overflow-hidden min-w-0 cursor-pointer active:scale-[0.98]"
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

                    <Info className="w-3 h-3 text-slate-200 group-hover:text-slate-400 transition-colors" />
                  </div>

                  <div>
                    <h3 className="transition-all truncate w-full">
                      {renderValue(card.type)}
                    </h3>
                  </div>
                </div>

                {/* Bottom Accent Line */}
                <div className={cn("absolute bottom-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300", cfg.accent)} />
              </div>
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Content 
                side="bottom" 
                align="center" 
                sideOffset={12}
                className="z-[100] w-64 bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", cfg.iconBg, cfg.iconColor)}>
                    {cfg.icon}
                  </div>
                  <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Analisis {cfg.label}</span>
                </div>

                <div className="space-y-4">
                  {comps.map((comp, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[0.55rem] font-black uppercase tracking-widest text-slate-500">
                        <span>{comp.label}</span>
                        <span className="text-slate-400">{card.type === 'savings' ? comp.val.toFixed(1) + '%' : formatCurrency(comp.val)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-300">
                          {comp.trend.isSame ? 'Sama dengan periode lalu' : (
                            <>
                              {comp.trend.isUp ? 'Naik' : 'Turun'} <span className={cn(
                                "font-black",
                                // Expense up = Red, Expense down = Green
                                // Income/Saving up = Green, Income/Saving down = Red
                                (card.type === 'expense' ? (comp.trend.isUp ? 'text-rose-400' : 'text-emerald-400') : (comp.trend.isUp ? 'text-emerald-400' : 'text-rose-400'))
                              )}>
                                {comp.trend.percent}%
                              </span>
                            </>
                          )}
                        </span>
                        {!comp.trend.isSame && (
                          <div className={cn(
                            "flex items-center gap-0.5 text-[10px] font-black",
                            (card.type === 'expense' ? (comp.trend.isUp ? 'text-rose-400' : 'text-emerald-400') : (comp.trend.isUp ? 'text-emerald-400' : 'text-rose-400'))
                          )}>
                            {comp.trend.isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          </div>
                        )}
                      </div>
                      {i < comps.length - 1 && <div className="h-[1px] bg-white/5 w-full mt-2" />}
                    </div>
                  ))}
                </div>

                <p className="text-[9px] text-slate-500 italic mt-4 border-t border-white/5 pt-3 leading-relaxed">
                  {card.type === 'expense' 
                    ? "Data dibandingkan secara apple-to-apple (Month-to-Date) berdasarkan siklus gajian."
                    : "Data dibandingkan dengan total keseluruhan pada siklus gajian bulan lalu."}
                </p>
                <Popover.Arrow className="fill-slate-900" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )
      })}
    </div>
  )
}
