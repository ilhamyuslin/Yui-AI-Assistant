import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { User, Mail, Calendar, Shield, Save, LogOut, Key } from 'lucide-react'

function InputField({ label, id, type = 'text', value, onChange, placeholder, disabled, icon: Icon }) {
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative group/input">
        {Icon && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-emerald-500 transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full px-5 py-4 rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-xl text-[13px] font-bold text-slate-800 outline-none transition-all shadow-inner shadow-slate-100/50",
            Icon && "pl-14",
            disabled ? "opacity-50 cursor-not-allowed bg-slate-50/50" : "focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          )}
        />
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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [payday, setPayday] = useState(1)
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      setFirstName(user.user_metadata?.first_name || '')
      setPayday(user.user_metadata?.budget_cycle_day || 1)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          first_name: firstName,
          budget_cycle_day: payday 
        }
      })
      if (authError) throw authError

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          budget_cycle_day: payday,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (profileError) throw profileError

      toast.success('Profile berhasil diperbarui!')
    } catch (err) {
      toast.error('Gagal memperbarui profile: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) toast.error('Gagal logout')
    window.location.href = '/login'
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

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all active:scale-95 shadow-sm"
        >
          <LogOut size={16} />
          LOGOUT DARI SISTEM
        </button>
      </div>

      <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Info Utama */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white p-8">
            <div className="flex flex-col items-center text-center gap-6 mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 transform -rotate-3">
                  <User size={64} strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center text-emerald-500 border border-emerald-50">
                  <Shield size={20} fill="currentColor" fillOpacity={0.1} />
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{firstName || 'User'}</h2>
                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-6">
              <InputField 
                label="Nama Lengkap" 
                id="name" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)}
                placeholder="Masukkan namamu..."
                icon={User}
              />
              <InputField 
                label="Alamat Email" 
                id="email" 
                value={user?.email} 
                disabled 
                icon={Mail}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] text-sm font-black text-white transition-all disabled:opacity-60 bg-gradient-to-r from-emerald-700 to-emerald-500 shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/40 active:scale-95"
          >
            {saving ? (
              <span className="flex items-center gap-3">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                MENYIMPAN...
              </span>
            ) : (
              <>
                <Save size={20} />
                SIMPAN PERUBAHAN
              </>
            )}
          </button>
        </div>

        {/* Kolom Kanan: Siklus Personal */}
        <div className="lg:col-span-7">
          <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
            <div className="px-8 py-6 border-b border-white/60 bg-white/40 flex items-center gap-5">
              <div className="w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                <Calendar size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-800 tracking-tight">Siklus Keuangan</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pengaturan Payday Personal</p>
              </div>
            </div>
            
            <div className="p-8 space-y-8 bg-gradient-to-b from-transparent to-slate-50/30">
              <PaydaySelector 
                value={payday} 
                onChange={setPayday} 
              />

              <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex gap-5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex-shrink-0 flex items-center justify-center text-white">
                  <Key size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-tight">Privasi Data</h4>
                  <p className="text-[11px] font-medium text-indigo-700 leading-relaxed">
                    Pengaturan tanggal gajian ini bersifat privat. AI kamu akan menggunakan angka ini untuk menganalisa sisa saldo dan budget secara cerdas setiap kali kamu chat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
