import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, ArrowRight, ShieldCheck, Sparkles, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      toast.success('Login berhasil! Selamat datang.')
    } catch (err) {
      setError(err.message || 'Email atau password salah. Coba lagi.')
      toast.error('Gagal masuk. Periksa kembali detail login kamu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#010a05] flex items-center justify-center p-6 overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-200">

      {/* ── Immersive Background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Animated Mesh Gradients - MORE VIBRANT */}
        <div className="absolute top-[-5%] left-[-5%] w-[70%] h-[70%] rounded-full bg-emerald-500/15 blur-[120px] animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[60%] rounded-full bg-teal-500/15 blur-[120px] animate-pulse duration-[6000ms] delay-1000" />

        {/* Decorative Glowing Blobs - STRONGER */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-400/20 blur-[130px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-400/15 blur-[160px] animate-pulse delay-500" />

        {/* Ghost Dashboard Layer - MORE VISIBLE */}
        <div className="absolute inset-0 opacity-[0.15] blur-[4px] scale-100 select-none">
          {/* Fake Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-64 border-r border-emerald-400/30 bg-emerald-400/10" />
          {/* Fake Cards */}
          <div className="ml-72 mt-10 grid grid-cols-3 gap-8 p-10">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-44 rounded-[2rem] border border-emerald-400/30 bg-emerald-400/10 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-emerald-400/20" style={{ clipPath: 'polygon(0 100%, 20% 80%, 40% 90%, 60% 60%, 80% 70%, 100% 40%, 100% 100%)' }} />
              </div>
            ))}
            <div className="col-span-2 h-72 rounded-[2.5rem] border border-emerald-400/30 bg-emerald-400/10" />
            <div className="h-72 rounded-[2.5rem] border border-emerald-400/30 bg-emerald-400/10" />
          </div>
        </div>

        {/* Subtle Noise Texture */}
        <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

        {/* Grid System */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
      </div>

      {/* ── Login Card ── */}
      <div className={cn(
        "relative z-10 w-full max-w-[480px] transition-all duration-1000 transform",
        mounted ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-95"
      )}>
        <div className="group relative">
          {/* Outer Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 via-transparent to-teal-500/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Main Card Content - TRUE GLASSMORPHISM */}
          <div className="relative bg-white/[0.03] backdrop-blur-[40px] border border-white/20 rounded-[3rem] p-10 md:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden">

            {/* Inner Light Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* Header Area */}
            <div className="flex flex-col items-center mb-12">
              <div className="relative mb-8">
                {/* Rotating Ring */}
                <div className="absolute -inset-4 border border-emerald-500/20 rounded-full animate-spin-slow opacity-50" />
                <div className="absolute -inset-2 border border-white/10 rounded-full animate-spin-slow opacity-30 [animation-direction:reverse]" />

                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-[0_12px_40px_rgba(16,185,129,0.4)] transform transition-transform duration-700 group-hover:rotate-[360deg]">
                  <Sparkles size={44} strokeWidth={2} />
                </div>
              </div>

              <div className="text-center space-y-3">
                <h1 className="text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
                  Welcome Back
                </h1>
                <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em]">
                  Yui AI Dashboard
                </p>
              </div>
            </div>

            {/* Form Area */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-3">
                <div className="px-2">
                  <label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                    Email Address
                  </label>
                </div>

                <div className="relative group/input">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-emerald-400 transition-colors duration-300">
                    <User size={20} strokeWidth={2.5} />
                  </div>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-white/10 outline-none transition-all duration-300 focus:bg-white/[0.08] focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/10 text-lg"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <div className="px-2">
                  <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                    Secure Password
                  </label>
                </div>

                <div className="relative group/input">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-emerald-400 transition-colors duration-300">
                    <Lock size={20} strokeWidth={2.5} />
                  </div>

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-5 pl-14 pr-16 text-white placeholder:text-white/10 outline-none transition-all duration-300 focus:bg-white/[0.08] focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/10 text-lg"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors p-2"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              <div className={cn(
                "overflow-hidden transition-all duration-500 ease-in-out",
                error ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[13px] px-5 py-4 rounded-2xl flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  {error}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="group relative w-full h-16 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-sm uppercase tracking-widest rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.98] shadow-[0_8px_32px_rgba(16,185,129,0.3)]"
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />

                <span className="relative flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-[3px] border-black/20 border-t-black rounded-full animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Enter Dashboard
                      <ArrowRight size={20} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Footer Area */}
            <div className="mt-14 pt-10 border-t border-white/5 flex flex-col items-center gap-5">
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/20">
                <ShieldCheck size={14} className="text-emerald-500/50" />
                Encrypted Session
              </div>

              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-white/5" />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Decorative Background Text ── */}
      <div className="absolute -bottom-16 -left-16 text-white/[0.03] font-black text-[320px] leading-none pointer-events-none select-none hidden lg:block tracking-tighter italic">
        YUI
      </div>

      {/* Global CSS for custom animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}} />
    </div>
  )
}
