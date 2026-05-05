import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  User,
  Lock,
  Calendar,
  Phone,
  ArrowRight,
  Check,
  Wallet,
  PieChart,
  Sparkles,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'

const ASSET_TEMPLATES = [
  { id: 'cash', name: 'Cash', icon: <Banknote size={18} />, category: 'Cash' },
  { id: 'bca', name: 'Bank BCA', icon: <CreditCard size={18} />, category: 'Bank' },
  { id: 'mandiri', name: 'Bank Mandiri', icon: <CreditCard size={18} />, category: 'Bank' },
  { id: 'jago', name: 'Bank Jago', icon: <Smartphone size={18} />, category: 'Bank' },
  { id: 'gopay', name: 'GoPay', icon: <Smartphone size={18} />, category: 'E-Wallet' },
  { id: 'ovo', name: 'OVO', icon: <Smartphone size={18} />, category: 'E-Wallet' },
  { id: 'dana', name: 'DANA', icon: <Smartphone size={18} />, category: 'E-Wallet' },
  { id: 'shopeepay', name: 'ShopeePay', icon: <Smartphone size={18} />, category: 'E-Wallet' },
]

const BUDGET_TEMPLATES = [
  { id: 'makan', name: 'Makan & Minum', group: 'Must' },
  { id: 'transport', name: 'Transportasi', group: 'Need' },
  { id: 'belanja', name: 'Belanja Bulanan', group: 'Must' },
  { id: 'hiburan', name: 'Hiburan & Hobi', group: 'Want' },
  { id: 'tagihan', name: 'Tagihan & Utilitas', group: 'Must' },
  { id: 'tabungan', name: 'Tabungan & Investasi', group: 'Saving' },
  { id: 'kesehatan', name: 'Kesehatan', group: 'Need' },
  { id: 'cicilan', name: 'Cicilan & Hutang', group: 'Must' },
]

export default function Onboarding() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [authProvider, setAuthProvider] = useState('email')

  // Step 1 State
  const [form, setForm] = useState({
    full_name: '',
    nickname: '',
    dob: '',
    phone: '',
    password: '',
    confirm_password: '',
    budget_cycle_day: 1
  })

  // Step 2 & 3 State
  const [selectedAssets, setSelectedAssets] = useState(['cash'])
  const [selectedBudgets, setSelectedBudgets] = useState([])
  const [hasExistingAccounts, setHasExistingAccounts] = useState(false)
  const [hasExistingBudgets, setHasExistingBudgets] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (profile?.is_onboarded) {
      navigate('/', { replace: true })
      return
    }

    // Pre-fill if profile exists
    if (profile) {
      setForm(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        nickname: profile.nickname || '',
        dob: profile.dob || '',
        phone: profile.phone || '',
        budget_cycle_day: profile.budget_cycle_day || 1
      }))
    }

    // Pre-fetch existing accounts/budgets to avoid overwriting
    const fetchExistingData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Set auth provider to determine if we show password field
      setAuthProvider(user.app_metadata?.provider || 'email')

      const [accRes, budRes] = await Promise.all([
        supabase.from('accounts').select('name').eq('user_id', user.id),
        supabase.from('budgets').select('category').eq('user_id', user.id)
      ])

      if (accRes.data?.length > 0) {
        setHasExistingAccounts(true)
        const existingNames = accRes.data.map(a => a.name.toLowerCase())
        const matched = ASSET_TEMPLATES.filter(t => existingNames.includes(t.name.toLowerCase())).map(t => t.id)
        if (matched.length > 0) setSelectedAssets(matched)
      }

      if (budRes.data?.length > 0) {
        setHasExistingBudgets(true)
        const existingCats = budRes.data.map(b => b.category.toLowerCase())
        const matched = BUDGET_TEMPLATES.filter(t => existingCats.includes(t.name.toLowerCase())).map(t => t.id)
        if (matched.length > 0) setSelectedBudgets(matched)
      }
    }

    fetchExistingData()
  }, [profile, navigate])

  const nextStep = () => {
    if (step === 1) {
      if (!form.full_name || !form.nickname) {
        toast.error('Mohon lengkapi Nama Lengkap & Panggilan')
        return
      }

      if (form.password && form.password !== form.confirm_password) {
        toast.error('Password tidak cocok')
        return
      }

      // SMART SKIP LOGIC
      // If user already has both, finish now
      if (hasExistingAccounts && hasExistingBudgets) {
        handleFinish()
        return
      }

      // If they have accounts, skip to step 3
      if (hasExistingAccounts) {
        setStep(3)
        return
      }
    }

    if (step === 2 && hasExistingBudgets) {
      handleFinish()
      return
    }

    setStep(s => s + 1)
  }

  const prevStep = () => {
    if (step === 3 && hasExistingAccounts) {
      setStep(1)
      return
    }
    setStep(s => s - 1)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Update Password ONLY if filled
      if (form.password) {
        const { error: authError } = await supabase.auth.updateUser({
          password: form.password
        })
        if (authError) throw authError
      }

      // 2. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          nickname: form.nickname,
          dob: form.dob || null,
          phone: form.phone || null,
          budget_cycle_day: parseInt(form.budget_cycle_day),
          is_onboarded: true
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 3. Insert Selected Assets (ONLY ones that don't exist yet)
      const { data: existingAccs } = await supabase.from('accounts').select('name').eq('user_id', user.id)
      const existingNames = (existingAccs || []).map(a => a.name.toLowerCase())

      const assetsToInsert = ASSET_TEMPLATES
        .filter(a => selectedAssets.includes(a.id) && !existingNames.includes(a.name.toLowerCase()))
        .map(a => ({
          user_id: user.id,
          name: a.name,
          balance: 0,
          icon: a.category === 'Cash' ? '💵' : (a.category === 'Bank' ? '🏦' : '📱')
        }))

      if (assetsToInsert.length > 0) {
        await supabase.from('accounts').insert(assetsToInsert)
      }

      // 4. Insert Selected Budgets (ONLY ones that don't exist yet)
      const { data: existingBudgets } = await supabase.from('budgets').select('category').eq('user_id', user.id)
      const existingCats = (existingBudgets || []).map(b => b.category.toLowerCase())

      const budgetsToInsert = BUDGET_TEMPLATES
        .filter(b => selectedBudgets.includes(b.id) && !existingCats.includes(b.name.toLowerCase()))
        .map(b => ({
          user_id: user.id,
          category: b.name,
          amount: 0,
          behavior_group: b.group
        }))

      if (budgetsToInsert.length > 0) {
        await supabase.from('budgets').insert(budgetsToInsert)
      }

      toast.success(`Selamat datang kembali, ${form.nickname}!`)
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Gagal menyelesaikan onboarding')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleAsset = (id) => {
    setSelectedAssets(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const toggleBudget = (id) => {
    setSelectedBudgets(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#fafafa] flex flex-col selection:bg-emerald-500/30 selection:text-emerald-900 scrollbar-thin">
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      {/* Sticky Progress Header */}
      <div className="sticky top-0 z-[110] w-full flex justify-center pt-10 pb-6 bg-[#fafafa]/80 backdrop-blur-md">
        <div className="w-full max-w-[500px] px-8 sm:px-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    step >= i ? "w-8 bg-emerald-500" : "w-3 bg-slate-200"
                  )} 
                />
              ))}
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Tahap {step} / 3
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-start md:justify-center p-4 pb-12">

      {/* Main Container */}
      <div className={cn(
        "relative z-10 w-full max-w-[500px] transition-all duration-1000 transform",
        mounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      )}>

        <div className="bg-white/80 backdrop-blur-3xl border border-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.04)]">

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Halo, Selamat Datang!</h1>
                <p className="text-slate-500 text-sm font-medium">Bantu Yui kenal kamu lebih dekat biar asistennya makin pinter.</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Lengkap</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 group-focus-within:text-emerald-500 size-4 transition-colors" />
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-[13px] font-bold text-slate-800 outline-none focus:border-emerald-500/50 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Panggilan</label>
                    <input
                      type="text"
                      value={form.nickname}
                      onChange={e => setForm({ ...form, nickname: e.target.value })}
                      placeholder="John"
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3.5 px-5 text-[13px] font-bold text-slate-800 outline-none focus:border-emerald-500/50 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tgl Lahir (Opsional)</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 group-focus-within:text-emerald-500 size-4 transition-colors" />
                      <input
                        type="date"
                        value={form.dob}
                        onChange={e => setForm({ ...form, dob: e.target.value })}
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-[13px] font-bold text-slate-800 outline-none focus:border-emerald-500/50 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">WA / Phone (Opsional)</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 group-focus-within:text-emerald-500 size-4 transition-colors" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="0812..."
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-[13px] font-bold text-slate-800 outline-none focus:border-emerald-500/50 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {authProvider === 'google' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Amankan Akun (Password)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 group-focus-within:text-emerald-500 size-4 transition-colors" />
                        <input
                          type="password"
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          placeholder="Password"
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-[13px] font-bold text-slate-800 outline-none focus:border-emerald-500/50 focus:bg-white transition-all shadow-sm"
                        />
                      </div>
                      <input
                        type="password"
                        value={form.confirm_password}
                        onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                        placeholder="Ulangi Password"
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3.5 px-5 text-[13px] font-bold text-slate-800 outline-none focus:border-emerald-500/50 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 pl-1 mt-1">Gunakan password ini jika ingin login lewat email nanti.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tanggal Gajian / Awal Cycle</label>
                  <select
                    value={form.budget_cycle_day}
                    onChange={e => setForm({ ...form, budget_cycle_day: e.target.value })}
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3.5 px-5 text-[13px] font-bold text-slate-800 outline-none focus:border-emerald-500/50 focus:bg-white transition-all shadow-sm appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23cbd5e1\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 1.25rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                  >
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>Tanggal {i + 1}</option>
                    ))}
                  </select>
                  <p className="text-[9px] font-bold text-slate-400 pl-1 mt-1">Gajian kamu nggak tentu? Pilih **Tanggal 1** aja biar gampang dipantau.</p>
                </div>
              </div>

              <button
                onClick={nextStep}
                disabled={!form.full_name || !form.nickname}
                className="w-full mt-10 group flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasExistingAccounts && hasExistingBudgets ? 'Simpan & Masuk Dashboard' : 'Lanjut Setup Finansial'}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4 border border-blue-100">
                  <Wallet size={24} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Sumber Dana</h1>
                <p className="text-slate-500 text-[13px] font-medium leading-relaxed">
                  Mana aja nih tempat kamu nyimpen uang? Pilih yang ada ya. <span className="text-emerald-600 font-bold">Bisa ditambah lagi nanti kok.</span>
                </p>
              </div>

              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Template</span>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-widest">
                  Terpilih {selectedAssets.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                {ASSET_TEMPLATES.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all text-center group min-h-[80px]",
                      selectedAssets.includes(asset.id)
                        ? "bg-emerald-50/50 border-emerald-500 shadow-sm"
                        : "bg-slate-50/30 border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <p className={cn("text-[11px] font-black uppercase tracking-tight", selectedAssets.includes(asset.id) ? "text-emerald-900" : "text-slate-500")}>
                      {asset.name}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">{asset.category}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-10">
                <button onClick={prevStep} className="px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={nextStep}
                  disabled={selectedAssets.length === 0}
                  className="flex-1 group flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Satu Langkah Lagi
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4 border border-emerald-100">
                  <PieChart size={24} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Kategori Budget</h1>
                <p className="text-slate-500 text-[13px] font-medium leading-relaxed">
                  Pilih kategori pengeluaran yang mau kamu pantau. <span className="text-emerald-600 font-bold">Bisa di-adjust lagi nanti kok.</span>
                </p>
              </div>

              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Kategori</span>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-widest">
                  Terpilih {selectedBudgets.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                {BUDGET_TEMPLATES.map((budget) => (
                  <button
                    key={budget.id}
                    onClick={() => toggleBudget(budget.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border-2 transition-all group",
                      selectedBudgets.includes(budget.id)
                        ? "bg-emerald-50/50 border-emerald-500 shadow-sm"
                        : "bg-slate-50/30 border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <p className={cn("text-[11px] font-black uppercase tracking-tight", selectedBudgets.includes(budget.id) ? "text-emerald-900" : "text-slate-500")}>
                        {budget.name}
                      </p>
                      <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest mt-1",
                        budget.group === 'Must' ? "bg-rose-100 text-rose-600" : (budget.group === 'Need' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600")
                      )}>
                        {budget.group}
                      </span>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                      selectedBudgets.includes(budget.id) ? "bg-emerald-500 text-white" : "border-2 border-slate-100"
                    )}>
                      {selectedBudgets.includes(budget.id) && <Check size={12} strokeWidth={4} />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-10">
                <button onClick={prevStep} className="px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading || selectedBudgets.length === 0}
                  className="flex-1 group flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Selesai
                      <Check size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Info */}
        <p className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          Powered by <span className="text-slate-900">Yui Financial Agent</span>
        </p>
      </div>
    </div>
  </div>
</div>
  )
}
