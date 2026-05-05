import { useMemo } from 'react'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

export default function PaceIndicator({ totalBudget, totalActual, loading, startDate, endDate }) {
  // Calculate Time Progress based on custom cycle (Payday to Payday)
  const { timeProgress, currentDay, daysInCycle } = useMemo(() => {
    if (!startDate || !endDate) return { timeProgress: 0, currentDay: 0, daysInCycle: 30 }
    
    const now = dayjs()
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    
    const totalDays = end.diff(start, 'day') + 1
    const elapsedDays = now.diff(start, 'day') + 1
    
    return {
      timeProgress: Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100)),
      currentDay: Math.max(0, elapsedDays),
      daysInCycle: totalDays
    }
  }, [startDate, endDate])

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 mb-4 animate-pulse h-24" />
    )
  }

  const spendingPercent = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0
  const isOverPace = spendingPercent > timeProgress

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-5 shadow-lg shadow-slate-200/30 mb-4 transition-all hover:shadow-xl hover:shadow-slate-200/40">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="space-y-0">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-80">Total Anggaran</p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[0.6rem] font-black text-slate-300">Rp</span>
            <span className="text-lg font-black text-slate-800 tracking-tighter">
              {totalBudget.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
        <div className="text-right space-y-0">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-80">Realisasi</p>
          <div className="flex items-baseline justify-end gap-0.5">
            <span className="text-[0.6rem] font-black text-slate-300">Rp</span>
            <span className={cn(
              "text-lg font-black tracking-tighter",
              isOverPace ? "text-rose-500" : "text-emerald-600"
            )}>
              {totalActual.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* The Futuristic Slim Pace Bar */}
      <div className="relative pt-1 pb-5 px-1">
        {/* Background Track with Inner Shadow */}
        <div className="h-2 w-full bg-slate-100/40 rounded-full border border-slate-200/20 relative overflow-hidden shadow-inner">
          
          {/* Progress Fill: Gradient + Animated Shine */}
          <div 
            className={cn(
              "h-full transition-all duration-1000 ease-out rounded-full relative group/bar overflow-hidden",
              isOverPace 
                ? "bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_15px_-3px_rgba(244,63,94,0.5)]" 
                : "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.5)]"
            )}
            style={{ width: `${Math.min(spendingPercent, 100)}%` }}
          >
            {/* Animated Stripe Overlay */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.2)_50%,rgba(255,255,255,.2)_75%,transparent_75%,transparent)] bg-[length:15px_15px] animate-[pulse_2s_infinite]" />
            
            {/* Spending Tooltip */}
            <div className="absolute -top-7 right-0 translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none z-20">
              <div className="bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-xl">
                {spendingPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Time Pace Marker (Dynamic Circle Style) */}
        <div 
          className="absolute top-1 h-2 group/time z-10 transition-all duration-700 ease-in-out"
          style={{ left: `${timeProgress}%` }}
        >
          {/* The Circle */}
          <div className="relative h-full flex items-center justify-center">
            <div className={cn(
              "w-2.5 h-2.5 border-2 border-white rounded-full transition-all duration-500 -translate-x-1/2 group-hover/time:scale-125",
              isOverPace 
                ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" 
                : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
            )} />
          </div>
          
          {/* Time Tooltip */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/time:opacity-100 transition-all pointer-events-none whitespace-nowrap">
            <div className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-xl border border-white/10">
              HARI {currentDay}/{daysInCycle}
            </div>
          </div>
        </div>

        {/* Status Text Below Bar */}
        <div className="absolute left-1 bottom-0 right-1 flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-80">
          <span className={cn(
            isOverPace ? "text-rose-500" : "text-emerald-500"
          )}>
            {isOverPace ? "Boros: Melebihi Pace" : "Hemat: Di Bawah Pace"}
          </span>
          <span className="text-slate-300 italic font-medium">Siklus Bulanan</span>
        </div>
      </div>
    </div>
  )
}
