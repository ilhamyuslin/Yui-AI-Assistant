import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { botApi, configApi } from '@/lib/api'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import {
  Activity,
  Power,
  RefreshCw,
  Cpu,
  Database,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  LayoutGrid,
  Play,
  Square,
  RotateCcw
} from 'lucide-react'

const STATUS_STYLE = {
  running: {
    dot: 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50/50',
    label: 'Operational',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  stopped: {
    dot: 'bg-slate-400',
    text: 'text-slate-500',
    bg: 'bg-slate-100/50',
    label: 'Standby',
    icon: <Power className="w-4 h-4" />
  },
  error: {
    dot: 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]',
    text: 'text-rose-600',
    bg: 'bg-rose-50/50',
    label: 'Critical Error',
    icon: <AlertCircle className="w-4 h-4" />
  },
  starting: {
    dot: 'bg-amber-500 animate-pulse',
    text: 'text-amber-600',
    bg: 'bg-amber-50/50',
    label: 'Initializing...',
    icon: <RefreshCw className="w-4 h-4 animate-spin-slow" />
  },
}

export default function Status() {
  const [status, setStatus] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchStatus = useCallback(async (manual = false) => {
    if (manual) setLoading(true)
    try {
      const [statusRes, configRes] = await Promise.all([
        botApi.getStatus(),
        configApi.get()
      ])
      setStatus(statusRes.data)
      setConfig(configRes.data)
      if (manual) toast.success('Status bot diperbarui')
    } catch {
      setStatus({ status: 'error' })
      if (manual) toast.error('Gagal mengambil status bot')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => fetchStatus(false), 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleAction = async (action, label) => {
    setActionLoading(action)
    try {
      await botApi[action]()
      toast.success(`${label} berhasil dijalankan`)
      setTimeout(() => fetchStatus(false), 1500)
    } catch (err) {
      toast.error(err.response?.data?.error || `Gagal melakukan ${label}`)
    } finally {
      setActionLoading(null)
    }
  }

  const state = status?.status || 'stopped'
  const cfg = STATUS_STYLE[state] || STATUS_STYLE.stopped

  return (
    <div className="relative w-full">
      {/* ── Page Header ── */}
      <div className="animate-fade-in flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 mt-2">
        <div className="flex flex-wrap items-center gap-4 min-w-0">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-black text-slate-900 tracking-tight leading-none mb-2">
              Status Bot
            </h1>
            <p className="text-slate-500 text-[11px] sm:text-sm font-medium uppercase tracking-wider">
              System Monitoring
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Refresh Widget */}
      <div className="sticky top-[0.5rem] z-40 flex justify-end mb-8">
        <button 
          onClick={() => fetchStatus(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-100 shadow-lg hover:shadow-xl hover:border-emerald-200 transition-all group active:scale-95 w-full sm:w-auto"
        >
          <RefreshCw className={cn("w-4 h-4 text-emerald-500 transition-transform duration-700 group-hover:rotate-180", loading && "animate-spin")} />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Update Status</span>
        </button>
      </div>

    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* ── Main Status Section ── */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-sm">
            <div className="flex flex-row items-center sm:items-start gap-6 sm:gap-10">
              <div className="flex flex-col items-center gap-4 flex-shrink-0">
                <div className="relative">
                  <div className={cn(
                    "w-20 h-20 sm:w-32 sm:h-32 rounded-full border-4 sm:border-8 flex items-center justify-center transition-all duration-500",
                    state === 'running' ? "border-emerald-50 bg-emerald-50/30" : "border-slate-50 bg-slate-50/30"
                  )}>
                    <Activity className={cn(
                      "w-7 h-7 sm:w-10 sm:h-10 transition-colors duration-500",
                      state === 'running' ? "text-emerald-500" : "text-slate-300"
                    )} />
                  </div>
                  <div className={cn(
                    "absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 sm:border-4 border-white shadow-lg",
                    cfg.dot
                  )} />
                </div>
                
                <div className={cn("px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-2 shadow-sm border border-white/50", cfg.bg)}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                  <span className={cn("text-[0.55rem] sm:text-[0.65rem] font-black uppercase tracking-widest", cfg.text)}>{cfg.label}</span>
                </div>
              </div>

              <div className="flex-1 text-left pt-1 sm:pt-4">
                <h2 className="text-lg sm:text-3xl font-black text-slate-900 mb-2 sm:mb-4 tracking-tight">
                  {status?.bot_info?.first_name || 'Bot Instance'}
                </h2>
                
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60">
                    <Zap size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-[0.55rem] font-black text-slate-900 uppercase tracking-widest">
                      {config?.gemini_model || 'Detecting...'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-start gap-x-5 gap-y-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Uptime: <span className="text-slate-900">{status?.uptime || '00:00:00'}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Mode: <span className="text-slate-900">{status?.mode || 'Polling'}</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-8 sm:mt-12">
              {[
                { label: 'Database', value: status?.db_status?.host || 'Supabase', icon: Database, color: status?.db_status?.state === 'connected' ? 'text-emerald-500' : 'text-rose-500' },
                { label: 'RAM Usage', value: status?.memory || '0.0 MB', icon: Cpu, color: 'text-indigo-500' },
                { label: 'Terakhir Aktif', value: (state === 'stopped' || !status?.last_seen) ? 'Offline' : dayjs(status.last_seen).format('HH:mm:ss'), icon: Clock, color: 'text-amber-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-100/50 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("hidden md:flex p-2 rounded-xl bg-white shadow-sm", stat.color)}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-[2rem] p-6 sm:p-8 shadow-sm">
             <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="p-3.5 rounded-2xl bg-white shadow-sm text-emerald-500 flex-shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Keamanan & Integritas</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-medium">
                    Sistem berjalan dalam mode terenkripsi. Semua transaksi database diproteksi oleh kebijakan RLS (Row Level Security) untuk memastikan data lo tetap aman dan pribadi.
                  </p>
                </div>
             </div>
          </div>
        </div>

        {/* ── Action Controls Section ── */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <LayoutGrid className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-black tracking-tight uppercase tracking-wider text-[11px] sm:text-lg">Sistem Kontrol</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                { action: 'restart', label: 'Restart', desc: 'Muat ulang bot', icon: RefreshCw, color: 'bg-blue-600 hover:bg-blue-700', disabled: false },
              ].map((btn) => (
                <button
                  key={btn.action}
                  onClick={() => handleAction(btn.action, btn.label)}
                  disabled={btn.disabled || !!actionLoading}
                  className={cn(
                    'w-full group flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed text-left border border-white/5',
                    btn.color
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
                    <btn.icon className={cn("w-4 h-4", actionLoading === btn.action && "animate-spin")} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider">{btn.label}</p>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest truncate">{btn.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 p-5 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.12em] leading-relaxed text-center">
                Perubahan status akan diproses otomatis. Gunakan Restart jika sistem tidak merespon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
