import { useMemo } from 'react'
import { 
  ShieldCheck, 
  Target, 
  Flame, 
  Gem, 
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

const BEHAVIOR_CONFIG = {
  Must: { color: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-50/10', icon: ShieldCheck, label: 'Must' },
  Need: { color: 'bg-teal-500', text: 'text-teal-500', light: 'bg-teal-50/10', icon: Target, label: 'Need' },
  Want: { color: 'bg-rose-500', text: 'text-rose-500', light: 'bg-rose-50/10', icon: Flame, label: 'Want' },
  Saving: { color: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-50/10', icon: Gem, label: 'Saving' },
}

export default function BehaviorAnalysis({ data, loading }) {
  const stats = useMemo(() => {
    const raw = data || { Must: 0, Need: 0, Want: 0, Saving: 0 }
    const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1
    return {
      total,
      Must: (raw.Must / total) * 100,
      Need: (raw.Need / total) * 100,
      Want: (raw.Want / total) * 100,
      Saving: (raw.Saving / total) * 100,
      raw
    }
  }, [data])

  if (loading) {
    return (
      <div className="w-full bg-slate-900 rounded-[2rem] p-6 min-h-[180px] flex items-center justify-center border border-white/5">
        <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full bg-slate-950 rounded-[2.5rem] p-5 sm:p-8 relative overflow-hidden border border-white/5 shadow-2xl flex flex-col">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[80px] -mr-24 -mt-24" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
            <Zap size={14} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">Spending Behavior</h3>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Live Pulse</p>
          </div>
        </div>
      </div>

      {/* Pulse Bar */}
      <div className="relative z-10 mb-8">
        <div className="h-4 w-full bg-white/5 rounded-full p-0.5 border border-white/5 flex gap-0.5 overflow-hidden">
          {stats.Must > 0 && <div style={{ width: `${stats.Must}%` }} className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
          {stats.Need > 0 && <div style={{ width: `${stats.Need}%` }} className="h-full bg-teal-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />}
          {stats.Want > 0 && <div style={{ width: `${stats.Want}%` }} className="h-full bg-rose-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />}
          {stats.Saving > 0 && <div style={{ width: `${stats.Saving}%` }} className="h-full bg-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
        </div>
      </div>

      {/* Legend Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(BEHAVIOR_CONFIG).map(([key, config]) => {
          const pct = Math.round(stats[key])
          const Icon = config.icon
          return (
            <div key={key} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-3 flex flex-col gap-1.5 transition-all hover:bg-white/[0.05]">
              <div className="flex items-center gap-2">
                <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center shrink-0", config.light, config.text)}>
                  <Icon size={10} strokeWidth={3} />
                </div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{config.label}</span>
              </div>
              <span className="text-xs font-black text-white">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
