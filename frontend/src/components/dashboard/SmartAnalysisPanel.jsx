import dayjs from 'dayjs'
import { 
  Sparkles, 
  Calendar, 
  Wallet, 
  ShieldCheck,
  AlertCircle,
  Zap,
  Info,
  TrendingDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import * as Popover from '@radix-ui/react-popover'

export default function SmartAnalysisPanel({ 
  income = 0, 
  totalExpense = 0, 
  payDay = 25, 
  categories = {},
  budgets = [],
  dailyTrend = {},
  loading,
  className
}) {
  if (loading) return null

  const today = dayjs()
  
  // Helper to get actual payday (adjusted for weekends)
  const getActualPayday = (date, pDay) => {
    let d = date.date(pDay)
    if (d.date() !== pDay && pDay > 28) d = date.endOf('month')
    const dayOfWeek = d.day()
    if (dayOfWeek === 6) return d.subtract(1, 'day')
    if (dayOfWeek === 0) return d.subtract(2, 'day')
    return d
  }

  // Calculate this month's actual payday
  const currentPayday = getActualPayday(today, payDay)
  let nextPaydayDate;

  // If today is after this month's payday, then only look at next month
  if (today.isAfter(currentPayday, 'day')) {
    nextPaydayDate = getActualPayday(today.add(1, 'month'), payDay)
  } else {
    // If today is BEFORE or ON the payday, stay on this month's payday
    nextPaydayDate = currentPayday
  }

  const daysUntilPayday = nextPaydayDate.diff(today.startOf('day'), 'day')

  // --- PROGRESS TIMELINE LOGIC ---
  const prevPaydayDate = today.isAfter(currentPayday, 'day') 
    ? currentPayday 
    : getActualPayday(today.subtract(1, 'month'), payDay)
  
  const totalCycleDays = nextPaydayDate.diff(prevPaydayDate, 'day')
  const daysPassed = today.startOf('day').diff(prevPaydayDate, 'day')
  const progressPercent = Math.min(100, Math.max(0, (daysPassed / (totalCycleDays || 1)) * 100))
  // --- END TIMELINE LOGIC ---

  // --- DAILY LIMIT LOGIC (Priority: 35% Saving) ---
  // 1. Hard Limit: Hanya boleh pakai 65% dari gaji (35% WAJIB SAVE)
  const maxAllowableSpending = income * 0.65
  
  // 2. Sisa jatah uang yang boleh dipakai (Jatah 65% - Total Pengeluaran)
  const remainingMoney = Math.max(0, maxAllowableSpending - totalExpense)

  // 3. Daily Limit: Sisa jatah dibagi sisa hari sampai gajian
  const dailySafeSpend = Math.floor(remainingMoney / Math.max(1, daysUntilPayday))
  
  // 4. Daily Comparison: Today vs Yesterday
  const todayStr = today.format('YYYY-MM-DD')
  const yesterdayStr = today.subtract(1, 'day').format('YYYY-MM-DD')
  
  const todayExpense = dailyTrend[todayStr]?.expense || 0
  const yesterdayExpense = dailyTrend[yesterdayStr]?.expense || 0
  
  const isMoreFrugal = todayExpense < yesterdayExpense
  const diffExpense = Math.abs(todayExpense - yesterdayExpense)
  
  // Overall Health Metrics
  const allowableExpense = maxAllowableSpending
  const remainingBudget = remainingMoney
  // --- END LOGIC ---
  
  // Budget Health Status
  const currentSavingsPercent = income > 0 ? Math.max(0, ((income - totalExpense) / income) * 100) : 0
  const isOverBudget = totalExpense > allowableExpense
  const isHealthy = currentSavingsPercent >= 35 && !isOverBudget

  const activeCategories = Object.entries(categories)
    .filter(([_, v]) => Math.abs(v) > 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

  const total = Object.values(categories).reduce((a, b) => a + b, 0)

  const formatCurrency = (val) => {
    if (val === 0) return 'Rp 0'
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}jt`
    if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}rb`
    return `Rp ${val.toLocaleString('id-ID')}`
  }

  return (
    <div className={cn(
      "bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-emerald-950/10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative overflow-hidden group flex flex-col h-full",
      className
    )}>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/40 blur-[40px] rounded-full -mr-16 -mt-16 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-50/30 blur-[40px] rounded-full -ml-16 -mb-16 pointer-events-none" />

      {/* Top Spacer (Small) to push everything down slightly */}
      <div className="flex-[0.5]" />

      <div className="flex flex-col gap-y-6 relative z-10">
        {/* Insight Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-slate-900 leading-tight truncate">Yui's Insight</h3>
              <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mt-1 truncate">Smart financial analysis</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full flex items-center gap-2 shrink-0">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isHealthy ? "bg-emerald-500" : "bg-rose-500")} />
            <span className="text-[0.6rem] font-black uppercase text-slate-500 tracking-widest">{isHealthy ? 'Safe' : 'Watch'}</span>
          </div>
        </div>

        {/* Analysis Card */}
        <div className="bg-slate-950 rounded-[1.8rem] p-5 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
             <Zap size={50} strokeWidth={1} />
          </div>
          <p className="text-[0.78rem] leading-relaxed font-medium text-slate-300 relative z-10">
            {activeCategories.length > 0 ? (
              <>
                <span className="text-white font-bold">{activeCategories[0][0]}</span> mendominasi 
                <span className="text-emerald-400 font-black mx-1">{((activeCategories[0][1] / (total || 1)) * 100).toFixed(0)}%</span> 
                pengeluaran. {isHealthy ? 'Kondisi aman!' : 'Coba rem sedikit ya.'}
              </>
            ) : (
              "Belum ada data transaksi."
            )}
          </p>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* 1. Countdown Popover */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 cursor-pointer hover:bg-slate-100/50 active:scale-[0.98] transition-all group/metric">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="stroke-[3]" />
                    <span className="text-[0.55rem] font-black uppercase tracking-widest">Countdown</span>
                  </div>
                  <Info size={10} className="opacity-0 group-hover/metric:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900 tracking-tighter">
                    {daysUntilPayday === 0 ? 'Payday!' : daysUntilPayday}
                  </span>
                  {daysUntilPayday > 0 && <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Days</span>}
                </div>
              </div>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                side="top" 
                align="start" 
                sideOffset={8}
                className="z-[100] w-64 bg-slate-900 text-white p-4 rounded-3xl shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Calendar size={12} />
                  </div>
                  <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Payday Timeline</span>
                </div>

                <div className="space-y-4 mb-4">
                  {/* Visual Timeline */}
                  <div className="relative pt-4 pb-2">
                    <div className="h-1.5 bg-white/5 rounded-full w-full relative">
                      {/* Progress Fill */}
                      <div 
                        className="absolute h-full bg-emerald-500 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                      />
                      {/* Current Position Marker */}
                      <div 
                        className="absolute w-3 h-3 bg-white border-2 border-emerald-500 rounded-full -top-[3px] shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                        style={{ left: `calc(${progressPercent}% - 6px)` }}
                      />
                    </div>
                    {/* Markers */}
                    <div className="flex justify-between mt-2 text-[8px] font-bold uppercase tracking-tighter text-slate-500">
                      <span>{prevPaydayDate.format('D MMM')}</span>
                      <span className="text-white">{today.format('D MMM')}</span>
                      <span>{nextPaydayDate.format('D MMM')}</span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <p className="text-xs font-bold text-white mb-0.5">{nextPaydayDate.format('dddd, D MMMM')}</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                      {daysUntilPayday > 7 ? `Sekitar ${Math.floor(daysUntilPayday / 7)} minggu lagi bos. ` : ''}
                      {daysUntilPayday === 0 ? 'Hari ini gajian! Selamat bersenang-senang!' : `Masih ada ${daysUntilPayday} hari lagi untuk berjuang.`}
                    </p>
                  </div>
                </div>
                <Popover.Arrow className="fill-slate-900" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* 2. Daily Limit Popover */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <div className={cn(
                "rounded-2xl p-4 border cursor-pointer active:scale-[0.98] transition-all group/metric",
                dailySafeSpend > 0 ? "bg-emerald-50/30 border-emerald-100/30 hover:bg-emerald-50/50" : "bg-rose-50/30 border-rose-100/30 hover:bg-rose-50/50"
              )}>
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Wallet size={12} className="stroke-[3]" />
                    <span className="text-[0.55rem] font-black uppercase tracking-widest">Daily Limit</span>
                  </div>
                  <Info size={10} className="opacity-0 group-hover/metric:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "text-lg font-black tracking-tight",
                    dailySafeSpend > 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {formatCurrency(dailySafeSpend)}
                  </span>
                </div>
              </div>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                side="top" 
                align="end" 
                sideOffset={8}
                className="z-[100] w-72 bg-slate-900 text-white p-5 rounded-3xl shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Zap size={12} />
                  </div>
                  <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Rincian Per Hari</span>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium">Sisa Jatah Belanja (65%)</span>
                    <span className="font-bold">{formatCurrency(remainingMoney)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium">Sisa Hari</span>
                    <span className="font-bold">{Math.max(1, daysUntilPayday)} Hari</span>
                  </div>
                  <div className="h-[1px] bg-white/10 w-full" />
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-emerald-400">Jatah Harian</span>
                    <span className="text-sm font-black">{formatCurrency(dailySafeSpend)}</span>
                  </div>
                </div>

                <p className="text-[9px] text-slate-500 italic leading-relaxed">
                  Rumus: (Total Jatah - Total Pengeluaran) / Sisa Hari.
                </p>

                <div className="mt-4 p-3 bg-white/5 border border-white/5 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={10} className="text-amber-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Daily Compare</span>
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full",
                      isMoreFrugal ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    )}>
                      {isMoreFrugal ? 'More Frugal' : 'More Wasteful'}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      {todayExpense === 0 && yesterdayExpense === 0 ? (
                        "Belum ada pengeluaran hari ini maupun kemarin. Pertahankan!"
                      ) : todayExpense < yesterdayExpense ? (
                        <>Mantap! Hari ini kamu lebih hemat <span className="text-emerald-400 font-bold">{formatCurrency(diffExpense)}</span> dibanding kemarin.</>
                      ) : todayExpense > yesterdayExpense ? (
                        <>Waduh, hari ini kamu lebih boros <span className="text-rose-400 font-bold">{formatCurrency(diffExpense)}</span> dibanding kemarin.</>
                      ) : (
                        "Pengeluaran hari ini sama persis dengan kemarin. Konsisten!"
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                      <div className="flex-1">
                        <p className="text-[7px] text-slate-500 uppercase font-black">Yesterday</p>
                        <p className="text-[9px] font-bold text-slate-400">{formatCurrency(yesterdayExpense)}</p>
                      </div>
                      <div className="w-[1px] h-4 bg-white/10" />
                      <div className="flex-1 text-right">
                        <p className="text-[7px] text-slate-500 uppercase font-black">Today</p>
                        <p className="text-[9px] font-bold text-white">{formatCurrency(todayExpense)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Popover.Arrow className="fill-slate-900" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        {/* 3. Savings Health Popover */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all active:scale-[0.99] group/metric">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover/metric:scale-110",
                    isHealthy ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                  )}>
                    {isHealthy ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                  </div>
                  <div>
                    <span className="text-[0.7rem] font-black text-slate-900 block">Savings Health</span>
                    <span className={cn(
                      "text-[0.55rem] font-bold uppercase tracking-widest",
                      isHealthy ? "text-emerald-600" : "text-rose-500"
                    )}>
                      {isHealthy ? 'On Track' : 'Warning'}
                    </span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-md font-black text-slate-900 block leading-none">{currentSavingsPercent.toFixed(0)}%</span>
                  <Info size={10} className="text-slate-300 opacity-0 group-hover/metric:opacity-100 transition-opacity" />
                </div>
              </div>
              
              <div className="h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    isHealthy ? "bg-emerald-500" : "bg-rose-500"
                  )}
                  style={{ width: `${Math.min(100, currentSavingsPercent)}%` }}
                />
              </div>
            </div>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content 
              side="bottom" 
              align="center" 
              sideOffset={12}
              className="z-[100] w-72 bg-slate-900 text-white p-5 rounded-3xl shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center",
                  isHealthy ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                )}>
                  <ShieldCheck size={12} />
                </div>
                <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Kesehatan Keuangan</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-slate-400">Saving Rate Saat Ini</span>
                    <span className={cn("font-bold", isHealthy ? "text-emerald-400" : "text-rose-400")}>{currentSavingsPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[35%]" />
                  </div>
                  <div className="flex justify-between text-[8px] mt-1 text-slate-500 font-bold uppercase tracking-tighter">
                    <span>Target Ideal (35%)</span>
                  </div>
                </div>

                {activeCategories.length > 0 && (
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown size={10} className="text-rose-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Budget Eaters</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-200">{activeCategories[0][0]}</span>
                      <span className="text-[10px] font-black text-rose-400">{formatCurrency(activeCategories[0][1])}</span>
                    </div>
                  </div>
                )}

                <p className="text-[9px] text-slate-400 leading-relaxed italic border-t border-white/10 pt-3">
                  {isHealthy 
                    ? "Pertahankan! Kamu sudah di atas batas aman menabung 35%." 
                    : `Bahaya! Tabunganmu di bawah 35%. Kurangi belanja di kategori ${activeCategories[0]?.[0] || 'lainnya'} ya.`}
                </p>
              </div>
              <Popover.Arrow className="fill-slate-900" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {/* Bottom Spacer (Larger) to push content up while maintaining balance */}
      <div className="flex-1" />
    </div>
  )
}
