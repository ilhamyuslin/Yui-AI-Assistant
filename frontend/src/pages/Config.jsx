import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { configApi } from '@/lib/api'

const GEMINI_MODELS = [
  'gemini-3.1-pro',
  'gemini-3.1-flash',
  'gemini-3.1-flash-lite',
  'gemma-4-31b',
  'gemma-4-26b-a4b-it',
]

function InputField({ label, id, type = 'text', value, onChange, placeholder, hint, rows, className }) {
  const shared = 'w-full px-5 py-4 rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-xl text-[13px] font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-inner shadow-slate-100/50'
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <label htmlFor={id} className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      {rows ? (
        <textarea id={id} rows={rows} value={value} onChange={onChange} placeholder={placeholder} className={cn(shared, 'resize-none flex-1 min-h-[120px]')} />
      ) : (
        <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} className={shared} />
      )}
      {hint && <p className="text-[10px] font-bold text-slate-400 pl-1">{hint}</p>}
    </div>
  )
}

function WhitelistEditor({ label, hint, value, onChange }) {
  const users = value ? value.split('\n').filter(Boolean) : []
  const [input, setInput] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const newUsers = [...users, input.trim()]
    // Pass fake event to maintain compatibility with the set() logic
    onChange({ target: { value: newUsers.join('\n') } })
    setInput('')
  }

  const handleRemove = (index) => {
    const newUsers = users.filter((_, i) => i !== index)
    onChange({ target: { value: newUsers.join('\n') } })
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>

      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-xl shadow-inner shadow-slate-100/50 min-h-[140px] flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 sm:gap-2.5">
          {users.map((user, i) => (
            <div key={i} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-200/60 shadow-sm animate-in zoom-in-95 duration-200">
              <span className="tracking-wide">{user}</span>
              <button type="button" onClick={() => handleRemove(i)} className="text-amber-400 hover:text-red-500 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          {users.length === 0 && <p className="text-xs font-bold text-slate-300 italic py-1.5">Kosong. Tambahkan ID di bawah.</p>}
        </div>

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-auto pt-2">
          <input
            type="number"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ketik ID Telegram..."
            className="flex-1 w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
          <button type="submit" disabled={!input.trim()} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-white px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95">
            Tambah
          </button>
        </form>
      </div>

      {hint && <p className="text-[10px] font-bold text-slate-400 pl-1">{hint}</p>}
    </div>
  )
}

function PaydaySelector({ label, hint, value, onChange }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const selectedDay = parseInt(value) || 1

  return (
    <div className="flex flex-col gap-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>

      <div className="p-4 sm:p-6 rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-xl shadow-inner shadow-slate-100/50 flex flex-col gap-4">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => onChange({ target: { value: String(day) } })}
              className={cn(
                "h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs font-black transition-all flex items-center justify-center",
                selectedDay === day
                  ? "bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-lg shadow-cyan-500/30 scale-110 z-10"
                  : "bg-white text-slate-500 border border-slate-200/60 hover:border-cyan-300 hover:text-cyan-600 hover:bg-cyan-50"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {hint && <p className="text-[10px] font-bold text-slate-400 pl-1">{hint}</p>}
    </div>
  )
}

export default function Config() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingGemini, setTestingGemini] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [isEditingTelegram, setIsEditingTelegram] = useState(false)
  const [isEditingGemma, setIsEditingGemma] = useState(false)
  const [testResultTelegram, setTestResultTelegram] = useState(null)
  const [testResultGemma, setTestResultGemma] = useState(null)

  const [form, setForm] = useState({
    telegram_token: '',
    gemini_api_key: '',
    gemini_model: '',
    system_instruction: '',
    budget_cycle_day: '',
    whitelisted_users: '',
  })

  useEffect(() => {
    configApi.get().then(({ data }) => {
      setConfig(data)
      setForm({
        telegram_token: data.telegram_token || '',
        gemini_api_key: data.gemini_api_key || '',
        gemini_model: data.gemini_model || '',
        system_instruction: data.system_instruction || '',
        budget_cycle_day: data.budget_cycle_day || '',
        whitelisted_users: (data.whitelisted_users || []).join('\n'),
      })
      // Auto-lock if data exists
      if (data.telegram_token) setIsEditingTelegram(false)
      if (data.gemini_api_key) setIsEditingGemma(false)
    }).catch(() => {
      toast.error('Gagal memuat konfigurasi')
    }).finally(() => setLoading(false))
  }, [])

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (key === 'telegram_token') setTestResultTelegram(null)
    if (key === 'gemini_api_key') setTestResultGemma(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await configApi.update(form)
      toast.success('Konfigurasi disimpan. Bot sedang restart...')
      setIsEditingTelegram(false)
      setIsEditingGemma(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan konfigurasi')
    } finally {
      setSaving(false)
    }
  }

  const handleTestGemini = async () => {
    setTestingGemini(true)
    setTestResultGemma(null)
    try {
      // Pengecekan "Silent" cuma buat mastiin API Key valid tanpa minta AI ngomong
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${form.gemini_api_key}`)
      const data = await res.json()

      if (res.ok) {
        setTestResultGemma({ response: 'API Key Valid' })
        toast.success('AI Engine Berhasil Terkoneksi')
      } else {
        const errorMsg = data.error?.message || 'API Key salah atau tidak valid'
        toast.error(`Gagal: ${errorMsg}`)
      }
    } catch (err) {
      toast.error('Gagal menghubungi server Google AI')
    } finally {
      setTestingGemini(false)
    }
  }

  const handleCancelTelegram = () => {
    setForm(f => ({ ...f, telegram_token: config.telegram_token || '' }))
    setIsEditingTelegram(false)
    setTestResultTelegram(null)
  }

  const handleCancelGemma = () => {
    setForm(f => ({ ...f, gemini_api_key: config.gemini_api_key || '' }))
    setIsEditingGemma(false)
    setTestResultGemma(null)
  }

  const handleTestTelegram = async () => {
    setTestingTelegram(true)
    setTestResultTelegram(null)
    try {
      const res = await fetch(`https://api.telegram.org/bot${form.telegram_token}/getMe`)
      const data = await res.json()

      if (data.ok) {
        setTestResultTelegram({ name: data.result.first_name, username: data.result.username })
        toast.success('Telegram Berhasil Terkoneksi')
      } else {
        toast.error(`Token Salah: ${data.description || 'Tidak valid'}`)
      }
    } catch (err) {
      toast.error('Gagal menghubungi server Telegram')
    } finally {
      setTestingTelegram(false)
    }
  }

  return (
    <div className="relative w-full pb-16">
      {/* ── Page Header ── */}
      <div className="animate-fade-in flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 mt-2">
        <div className="flex flex-wrap items-center gap-4 min-w-0">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-black text-slate-900 tracking-tight leading-none mb-2">
              Sistem AI
            </h1>
            <p className="text-slate-500 text-[11px] sm:text-sm font-medium uppercase tracking-wider">
              Konfigurasi Engine & Keamanan
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Save Widget (Floating Capsule Style) */}
      <div className="sticky top-[0.5rem] z-40 mx-0 px-2 py-2 mb-8 bg-white/70 backdrop-blur-3xl rounded-full border border-white/50 shadow-lg flex items-center justify-end lg:static lg:bg-transparent lg:backdrop-blur-none lg:border-none lg:shadow-none lg:p-0 lg:m-0 lg:mb-10 lg:z-auto">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full lg:w-auto flex items-center justify-center gap-3 px-8 py-3 sm:py-4 rounded-full text-xs font-black text-white transition-all disabled:opacity-60 hover:opacity-90 hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-95 flex-shrink-0 shadow-xl shadow-emerald-500/20"
          style={{ background: 'linear-gradient(135deg, #0f766e, #10b981)' }}
        >
          {saving ? (
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              MENYIMPAN...
            </span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              SIMPAN & RESTART BOT
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-xl">
          <div className="w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-bold tracking-widest uppercase text-[10px] text-slate-400">Menyiapkan Engine AI...</span>
        </div>
      ) : (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          
          {/* Kolom Kiri: Telegram & Whitelist */}
          <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-8">
            {/* Telegram Card */}
            <div className="bg-white/60 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden flex flex-col">
              <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-white/60 bg-white/40 flex items-center gap-4 sm:gap-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Telegram Gateway</p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Koneksi Antarmuka Bot</p>
                </div>
                {config?._has_telegram_token && (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] sm:text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100 shadow-sm">Aktif</span>
                  </div>
                )}
              </div>
              <div className="p-5 sm:p-8 flex flex-col gap-6 flex-1 bg-gradient-to-b from-transparent to-slate-50/30">
                <div className="relative group">
                  <div className={cn("transition-all duration-300", !isEditingTelegram && "opacity-50 pointer-events-none grayscale-[0.5]")}>
                    <InputField
                      label="Bot Token (Credential)"
                      id="telegramToken"
                      type={isEditingTelegram ? "text" : "password"}
                      value={form.telegram_token}
                      onChange={set('telegram_token')}
                      placeholder="1234567890:ABCdef..."
                      hint="Token rahasia dari @BotFather."
                    />
                  </div>
                  {!isEditingTelegram && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-2xl backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/80 px-3 py-1.5 rounded-full shadow-sm">Token Terkunci</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto pt-2 sm:pt-4">
                  <button
                    onClick={() => isEditingTelegram ? handleCancelTelegram() : setIsEditingTelegram(true)}
                    className={cn("flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black border-2 uppercase tracking-widest", isEditingTelegram ? "border-rose-100 text-rose-600 bg-rose-50" : "border-slate-100 text-slate-600 hover:bg-slate-50")}
                  >
                    {isEditingTelegram ? 'Batal' : 'Ubah Token'}
                  </button>
                  <button
                    onClick={handleTestTelegram}
                    disabled={testingTelegram || !form.telegram_token}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-40 uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    {testingTelegram ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Periksa'}
                  </button>
                </div>

                {testResultTelegram && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">OK</div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-tight">{testResultTelegram.name}</p>
                        <p className="text-[9px] font-bold text-emerald-600">@{testResultTelegram.username}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Whitelist Card */}
            <div className="bg-white/60 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden flex flex-col">
              <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-white/60 bg-white/40 flex items-center gap-4 sm:gap-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Whitelist Keamanan</p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Hak Akses Eksklusif</p>
                </div>
              </div>
              <div className="p-5 sm:p-8 flex-1 bg-gradient-to-b from-transparent to-slate-50/30">
                <WhitelistEditor
                  label="Daftar ID Telegram Aktif"
                  value={form.whitelisted_users}
                  onChange={set('whitelisted_users')}
                  hint="Sistem otomatis menendang user yang ID-nya tidak ada di daftar ini."
                />
              </div>
            </div>
          </div>

          {/* Kolom Kanan: AI Engine & Budget Cycle */}
          <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8">
            {/* Gemma Card */}
            <div className="bg-white/60 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden flex flex-col h-full">
              <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-white/60 bg-white/40 flex items-center gap-4 sm:gap-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">AI Engine (Gemma)</p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Otak Pintar Asisten</p>
                </div>
                {config?._has_gemini_key && <span className="ml-auto text-[8px] sm:text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100 shadow-sm">Aktif</span>}
              </div>
              <div className="p-5 sm:p-8 flex flex-col gap-6 flex-1 bg-gradient-to-b from-transparent to-slate-50/30">
                <div className="relative group">
                  <div className={cn("transition-all duration-300", !isEditingGemma && "opacity-50 pointer-events-none grayscale-[0.5]")}>
                    <InputField
                      label="API Key (Credential)"
                      id="geminiKey"
                      type={isEditingGemma ? "text" : "password"}
                      value={form.gemini_api_key}
                      onChange={set('gemini_api_key')}
                      placeholder="AIza..."
                      hint="Kunci akses Google AI Studio."
                    />
                  </div>
                  {!isEditingGemma && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-2xl backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/80 px-3 py-1.5 rounded-full shadow-sm">Key Terkunci</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  <label htmlFor="geminiModel" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Arsitektur Model AI</label>
                  <select
                    id="geminiModel"
                    value={form.gemini_model}
                    onChange={set('gemini_model')}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-xl text-[12px] sm:text-[13px] font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner shadow-slate-100/50 appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 1.25rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                  >
                    {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto pt-2 sm:pt-4">
                  <button
                    onClick={() => isEditingGemma ? handleCancelGemma() : setIsEditingGemma(true)}
                    className={cn("flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black border-2 uppercase tracking-widest", isEditingGemma ? "border-rose-100 text-rose-600 bg-rose-50" : "border-slate-100 text-slate-600 hover:bg-slate-50")}
                  >
                    {isEditingGemma ? 'Batal' : 'Ubah Key'}
                  </button>
                  <button
                    onClick={handleTestGemini}
                    disabled={testingGemini || !form.gemini_api_key}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-40 uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    {testingGemini ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Periksa'}
                  </button>
                </div>

                {testResultGemma && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">AI</div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-tight">AI Engine Ready</p>
                        <p className="text-[9px] font-bold text-emerald-600 italic">"{testResultGemma.response}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Baris Bawah: System Instruction & Siklus Keuangan */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* System Instruction (8/12) */}
            <div className="lg:col-span-8">
              <div className="bg-white/60 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden flex flex-col h-full">
                <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-white/60 bg-white/40 flex items-center gap-4 sm:gap-5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">System Instruction</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Instruksi untuk AI</p>
                  </div>
                </div>
                <div className="p-5 sm:p-8 flex-1 flex flex-col bg-gradient-to-b from-transparent to-slate-50/30">
                  <InputField
                    label="Instruksi Utama"
                    id="sysInstruction"
                    value={form.system_instruction}
                    onChange={set('system_instruction')}
                    placeholder="Kamu adalah asisten keuangan pribadi bernama Yui..."
                    hint="Sangat krusial: Mengatur bagaimana AI bersikap, memformat laporan, dan menjawab chat telegram."
                    rows={10}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Budget Cycle Card (4/12) */}
            <div className="lg:col-span-4">
              <div className="bg-white/60 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden flex flex-col h-full">
                <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-white/60 bg-white/40 flex items-center gap-4 sm:gap-5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Siklus Keuangan</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pengaturan Batas Waktu</p>
                  </div>
                </div>
                <div className="p-5 sm:p-8 flex-1 bg-gradient-to-b from-transparent to-slate-50/30">
                  <PaydaySelector
                    label="Pilih Tanggal Gajian"
                    value={form.budget_cycle_day}
                    onChange={set('budget_cycle_day')}
                    hint="Laporan ditarik dari tanggal ini di bulan lalu hingga H-1 di bulan ini."
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
