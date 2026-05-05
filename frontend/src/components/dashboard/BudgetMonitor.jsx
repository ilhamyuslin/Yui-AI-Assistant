import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BudgetMonitor({ budgets, loading, onOpenSettings }) {
  const [page, setPage] = useState(0)
  const itemsPerPage = 3

  const safeBudgets = [...(budgets || [])].sort((a, b) => (parseFloat(b.actual) || 0) - (parseFloat(a.actual) || 0))
  
  // Calculate Totals
  const { totalBudget, totalActual } = useMemo(() => {
    return (budgets || []).reduce((acc, b) => {
      acc.totalBudget += (parseFloat(b.amount) || 0)
      acc.totalActual += (parseFloat(b.actual) || 0)
      return acc
    }, { totalBudget: 0, totalActual: 0 })
  }, [budgets])

  const totalPages = Math.ceil(safeBudgets.length / itemsPerPage)
  const startIndex = page * itemsPerPage
  const visibleItems = safeBudgets.slice(startIndex, startIndex + itemsPerPage)

  // Swipe logic
  const [touchStart, setTouchStart] = useState(null)
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStart === null) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd
    if (Math.abs(diff) > 50) { // threshold
      if (diff > 0 && page < totalPages - 1) setPage(p => p + 1)
      if (diff < 0 && page > 0) setPage(p => p - 1)
    }
    setTouchStart(null)
  }

  const getProgressColor = (percent) => {
    if (percent >= 90) return 'bg-rose-500'
    if (percent >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="bg-gradient-to-br from-white to-emerald-50/40 rounded-[2.5rem] p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden"
    >
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Budget Monitor</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Categorical Progress</p>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl border border-slate-200 hover:border-emerald-200 font-bold text-[10px] transition-all active:scale-95"
        >
          <Plus size={12} strokeWidth={3} />
          Atur
        </button>
      </div>

      {/* List */}
      <div className="flex-1 space-y-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3.5 bg-slate-100 rounded-lg w-1/3" />
              <div className="h-2 bg-slate-50/50 rounded-full" />
            </div>
          ))
        ) : visibleItems.length > 0 ? (
          visibleItems.map((b) => {
            const amount = parseFloat(b.amount) || 0
            const actual = parseFloat(b.actual) || 0
            const remaining = Math.max(amount - actual, 0)
            const percent = amount > 0 ? Math.min((actual / amount) * 100, 110) : 0
            const isOver = actual > amount && amount > 0

            return (
              <div key={b.category} className="space-y-2 group">
                <div className="flex items-end justify-between">
                  <div className="space-y-0 text-left">
                    <span className="block text-sm font-bold text-slate-700 leading-tight group-hover:text-emerald-700 transition-colors">
                      {b.category}
                    </span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-tight",
                      isOver ? "text-rose-500" : "text-slate-400"
                    )}>
                      {isOver 
                        ? `Over Rp ${(actual - amount).toLocaleString('id-ID')}` 
                        : `Sisa Rp ${remaining.toLocaleString('id-ID')}`
                      }
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] font-black text-slate-800">
                      Rp {actual.toLocaleString('id-ID')}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                      Limit {amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 w-full bg-slate-50/80 rounded-full overflow-hidden border border-slate-100/50">
                  <div 
                    className={cn(
                      'h-full transition-all duration-700 ease-out rounded-full', 
                      getProgressColor(percent)
                    )}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
            <p className="text-xs font-bold bg-slate-50 px-3 py-1.5 rounded-lg">Belum ada budget</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-20 transition-all active:scale-95"
        >
          <ChevronLeft size={14} className="text-slate-600" strokeWidth={2.5} />
        </button>
        
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={cn(
                'w-8 h-8 rounded-xl font-black text-[10px] transition-all flex items-center justify-center',
                page === i 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
          className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-20 transition-all active:scale-95"
        >
          <ChevronRight size={14} className="text-slate-600" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
