import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { User, Mail, Calendar, Shield, Save, Key, Lock, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

function InputField({ label, id, type = 'text', value, onChange, placeholder, disabled, icon: Icon }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (show ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10 text-slate-500 group-focus-within:text-emerald-600 transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full px-5 py-4 rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-xl text-[13px] font-bold text-slate-800 outline-none transition-all shadow-inner shadow-slate-100/50",
            Icon && "pl-14",
            isPassword && "pr-14",
            disabled ? "opacity-50 cursor-not-allowed bg-slate-50/50" : "focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-5 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  )
}

function PaydaySelector({ value, onChange }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const selectedDay = parseInt(value) || 1

  return (
    <div className="flex flex-col gap-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tanggal Gajian Personal</label>
      <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/60 bg-white/50 backdrop-blur-xl shadow-inner shadow-slate-100/50">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => onChange(day)}
              className={cn(
                "h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs font-black transition-all flex items-center justify-center",
                selectedDay === day
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-110 z-10"
                  : "bg-white text-slate-500 border border-slate-200/60 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[10px] font-bold text-slate-400 pl-1 italic">Laporan AI kamu akan dihitung mulai dari tanggal ini setiap bulannya.</p>
    </div>
  )
}

export default function Profile() {
  const { profile, loading, isSaving, update } = useProfile()
  const { reauthenticate, updatePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [passwords, setPasswords] = useState({
    old: '',
    new: '',
    confirm: ''
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    nickname: '',
    dob: '',
    phone: '',
    budget_cycle_day: 1
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        nickname: profile.nickname || '',
        dob: profile.dob || '',
        phone: profile.phone || '',
        budget_cycle_day: profile.budget_cycle_day || 1
      })
    }
  }, [profile])

  const handleSave = async () => {
    try {
      await update({
        full_name: form.full_name,
        nickname: form.nickname,
        dob: form.dob || null,
        phone: form.phone || null,
        budget_cycle_day: parseInt(form.budget_cycle_day),
        updated_at: new Date().toISOString()
      })
      toast.success('Profile berhasil diperbarui!')
    } catch (err) {
      toast.error('Gagal memperbarui profile: ' + err.message)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!passwords.old || !passwords.new || !passwords.confirm) {
      return toast.error('Isi semua field password!')
    }
    if (passwords.new !== passwords.confirm) {
      return toast.error('Password konfirmasi tidak cocok!')
    }
    if (passwords.new.length < 6) {
      return toast.error('Password minimal 6 karakter!')
    }

    setIsUpdatingPassword(true)
    const loadingToast = toast.loading('Sedang memverifikasi password lama...')

    try {
      // 1. Verifikasi Password Lama via signInWithPassword
      // Ini bakal trigger onAuthStateChange tapi udah kita handle di Context biar gak stuck
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.old
      })

      if (authError) {
        throw new Error('Password lama salah atau gagal verifikasi.')
      }

      toast.loading('Verifikasi sukses! Memperbarui password baru...', { id: loadingToast })

      // Kasih napas bentar buat Supabase SDK
      await new Promise(r => setTimeout(r, 800))

      // 2. Update ke Password Baru
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.new
      })

      if (updateError) throw updateError

      // 3. Sukses!
      toast.success('Password berhasil diperbarui!', { id: loadingToast })
      setIsUpdatingPassword(false)
      setPasswords({ old: '', new: '', confirm: '' })

      // MUNCULKAN MODAL CUSTOM
      setShowSuccessModal(true)

    } catch (err) {
      console.error('Password Update Error:', err)
      toast.error(err.message || 'Gagal memperbarui password', { id: loadingToast })
      setIsUpdatingPassword(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="relative w-full pb-16">
      {/* ── Page Header ── */}
      <div className="animate-fade-in flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 mt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-black text-slate-900 tracking-tight leading-none mb-2">
            Profile Akun
          </h1>
          <p className="text-slate-500 text-[11px] sm:text-sm font-medium uppercase tracking-wider">
            Pengaturan Identitas & Siklus Personal
          </p>
        </div>

      </div>

      <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Kolom Kiri: Info Identitas */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex-grow bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white p-6 sm:p-8 flex flex-col">
            <div className="flex items-center gap-5 mb-8">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 transform -rotate-2">
                  <User size={32} strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-white shadow flex items-center justify-center text-emerald-500 border border-emerald-50">
                  <Shield size={14} fill="currentColor" fillOpacity={0.1} />
                </div>
              </div>

              <div className="overflow-hidden">
                <h2 className="text-xl font-black text-slate-800 tracking-tight truncate">{form.nickname || 'User'}</h2>
                <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase truncate">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-5 flex-grow">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Nama Lengkap"
                  id="full_name"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Nama lengkap..."
                  icon={User}
                />
                <InputField
                  label="Nama Panggilan"
                  id="nickname"
                  value={form.nickname}
                  onChange={e => setForm({ ...form, nickname: e.target.value })}
                  placeholder="Panggilan..."
                  icon={User}
                />
              </div>

              <InputField
                label="Alamat Email"
                id="email"
                value={user?.email}
                disabled
                icon={Mail}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Tanggal Lahir"
                  id="dob"
                  type="date"
                  value={form.dob}
                  onChange={e => setForm({ ...form, dob: e.target.value })}
                  icon={Calendar}
                />
                <InputField
                  label="No. WhatsApp"
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="08..."
                  icon={Shield}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving || loading}
              className="mt-8 w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-xs font-black text-white transition-all disabled:opacity-60 bg-slate-900 shadow-xl shadow-slate-200 hover:bg-emerald-600 hover:shadow-emerald-500/20 active:scale-95"
            >
              {isSaving ? (
                <span className="flex items-center gap-3">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  MENYIMPAN...
                </span>
              ) : (
                <>
                  <Save size={18} />
                  SIMPAN PERUBAHAN
                </>
              )}
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Siklus Personal & Keamanan */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-white/60 bg-white/40 flex items-center gap-5">
              <div className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                <Calendar size={22} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-800 tracking-tight">Siklus Keuangan</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pengaturan Payday Personal</p>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6 flex-grow bg-gradient-to-b from-transparent to-slate-50/30">
              <PaydaySelector
                value={form.budget_cycle_day}
                onChange={day => setForm({ ...form, budget_cycle_day: day })}
              />

              <div className="p-5 rounded-3xl bg-indigo-50 border border-indigo-100 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex-shrink-0 flex items-center justify-center text-white">
                  <Key size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-tight">Privasi Data</h4>
                  <p className="text-[11px] font-medium text-indigo-700/80 leading-relaxed">
                    Siklus gajian ini dipakai AI untuk hitung sisa saldo & budget cerdas setiap chat.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Security / Change Password ── */}
          <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-white/60 bg-white/40 flex items-center gap-5">
              <div className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Lock size={22} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-800 tracking-tight">Keamanan Akun</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ganti Password</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-8 space-y-5 bg-gradient-to-b from-transparent to-rose-50/20">
              <InputField
                label="Password Lama"
                id="old_password"
                type="password"
                value={passwords.old}
                onChange={e => setPasswords({ ...passwords, old: e.target.value })}
                placeholder="Password saat ini..."
                icon={Lock}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Password Baru"
                  id="new_password"
                  type="password"
                  value={passwords.new}
                  onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder="Password baru..."
                  icon={Key}
                />
                <InputField
                  label="Konfirmasi Password"
                  id="confirm_password"
                  type="password"
                  value={passwords.confirm}
                  onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder="Ketik ulang..."
                  icon={Key}
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-xs font-black text-white transition-all disabled:opacity-60 bg-slate-900 shadow-xl shadow-slate-200 hover:bg-rose-600 hover:shadow-rose-500/20 active:scale-95"
              >
                {isUpdatingPassword ? (
                  <span className="flex items-center gap-3">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    MEMPERBARUI...
                  </span>
                ) : (
                  <>
                    <Shield size={18} />
                    UPDATE PASSWORD
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Custom Success Modal ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-emerald-500/20 border border-emerald-100 animate-scale-in flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
              <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/40">
                <Shield size={28} />
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-3">Keamanan Diperbarui!</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
              Password Anda telah berhasil diganti. Demi keamanan, silakan login kembali dengan password baru Anda.
            </p>
            
            <button
              onClick={async () => {
                const toastId = toast.loading('Memproses logout...')
                await logout()
                toast.dismiss(toastId)
                navigate('/login')
              }}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-2xl transition-all shadow-xl shadow-slate-200 hover:shadow-slate-300 active:scale-95"
            >
              LOGOUT & LOGIN SEKARANG
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
