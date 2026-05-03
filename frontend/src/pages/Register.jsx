import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, ArrowRight, ShieldCheck, Sparkles, UserPlus, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Register() {
  const { register, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setLoading(true)
    setError('')
    try {
      await register(email, password)
      toast.success('Registration successful!')
    } catch (err) {
      setError(err.message || 'Failed to create account')
      toast.error('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle()
    } catch (err) {
      toast.error('Failed to register with Google')
    }
  }

  return (
    <div className="relative min-h-screen bg-[#010a05] flex items-center justify-center p-4 overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* ── Top Navigation CTA ── */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <p className="hidden sm:block text-white/20 text-[10px] font-black uppercase tracking-widest">Member?</p>
        <Link to="/login" className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-md border border-white/10 rounded-xl text-emerald-400 font-bold text-xs transition-all active:scale-95">
          Sign In
        </Link>
      </div>

      {/* ── Background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      {/* ── Register Card - Compact ── */}
      <div className={cn(
        "relative z-10 w-full max-w-[360px] transition-all duration-700 transform",
        mounted ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
      )}>
        <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/15 rounded-[2rem] p-6 shadow-2xl">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white mb-3 shadow-lg">
              <UserPlus size={20} />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight leading-none mb-1">Join Yui AI</h1>
            <p className="text-emerald-400 font-black text-[7px] uppercase tracking-[0.2em]">Create New Account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-400 size-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-400 size-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-white text-sm outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-400 size-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all"
              />
            </div>

            {error && (
              <div className="text-rose-400 text-[10px] bg-rose-500/5 border border-rose-500/20 px-3 py-2 rounded-lg flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-rose-500" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
            >
              {loading ? 'Processing...' : 'Register Now'}
            </button>
          </form>

          <div className="relative my-5 flex items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="px-3 text-[7px] font-black text-white/10 uppercase">OR</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full h-11 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-white/70 font-bold text-xs group-hover:text-white">Register with Google</span>
          </button>
        </div>
      </div>
    </div>
  )
}
