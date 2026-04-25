import dayjs from 'dayjs'
import { 
  Sparkles, 
  Calendar, 
  Wallet, 
  ShieldCheck,
  AlertCircle,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SmartAnalysisPanel({ 
  income = 0, 
  totalExpense = 0, 
  payDay = 25, 
  categories = {},
  budgets = [],
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

  // --- NEW CUSTOM LOGIC: Disposable Daily Limit (Priority: 35% Saving) ---
  const fixedKeywords = ['rumah', 'tagihan', 'tempat tinggal']
  
  // 1. Hard Limit: Hanya boleh pakai 65% dari gaji (35% WAJIB SAVE)
  const maxAllowableSpending = income * 0.65

  // 2. Hitung budget khusus fixed costs dari tabel
  const fixedBudgetSum = budgets
    .filter(b => fixedKeywords.some(key => b.category?.toLowerCase().includes(key)))
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

  // 3. Hitung pengeluaran di kategori fixed costs
  const fixedExpenseSum = Object.entries(categories)
    .filter(([name]) => fixedKeywords.some(key => name.toLowerCase().includes(key)))
    .reduce((acc, [_, val]) => acc + (Number(val) || 0), 0)

  // 4. Hitung pengeluaran variabel (total - pengeluaran fixed)
  const variableExpenseSum = totalExpense - fixedExpenseSum
  
  // 5. Jatah uang "bebas" (Max Spending - Fixed Costs - Yang Sudah Dipakai)
  const netDisposableBudget = Math.max(0, maxAllowableSpending - fixedBudgetSum)
  const remainingMoney = Math.max(0, netDisposableBudget - variableExpenseSum)

  // 6. Daily Limit Baru: Sisa jatah dibagi sisa hari
  const dailySafeSpend = Math.floor(remainingMoney / Math.max(1, daysUntilPayday))
  
  // Overall Health Metrics
  const allowableExpense = maxAllowableSpending
  const remainingBudget = Math.max(0, allowableExpense - totalExpense)
  // --- END NEW LOGIC ---
  
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
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
            <div className="flex items-center gap-2 text-slate-400 mb-1.5">
              <Calendar size={12} className="stroke-[3]" />
              <span className="text-[0.55rem] font-black uppercase tracking-widest">Countdown</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900 tracking-tighter">
                {daysUntilPayday === 0 ? 'Payday!' : daysUntilPayday}
              </span>
              {daysUntilPayday > 0 && <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Days</span>}
            </div>
          </div>

          <div className={cn(
            "rounded-2xl p-4 border transition-all duration-300",
            dailySafeSpend > 0 ? "bg-emerald-50/30 border-emerald-100/30" : "bg-rose-50/30 border-rose-100/30"
          )}>
            <div className="flex items-center gap-2 text-slate-400 mb-1.5">
              <Wallet size={12} className="stroke-[3]" />
              <span className="text-[0.55rem] font-black uppercase tracking-widest">Daily Limit</span>
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
        </div>

        {/* Health Bar */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
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
            <div className="text-right">
              <span className="text-md font-black text-slate-900 block leading-none">{currentSavingsPercent.toFixed(0)}%</span>
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
      </div>

      {/* Bottom Spacer (Larger) to push content up while maintaining balance */}
      <div className="flex-1" />
    </div>
  )
}
