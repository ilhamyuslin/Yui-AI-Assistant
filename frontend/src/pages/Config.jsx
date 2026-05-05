import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { configApi } from '@/lib/api'
import { useConfig } from '@/hooks/useConfig'

const GEMINI_MODELS = [
  'gemma-4-26b-a4b-it',
  'gemma-4-31b-it',
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



export default function Config() {
  const { config, loading, isSaving, update } = useConfig()
  const [testingGemini, setTestingGemini] = useState(false)
  const [isEditingGemma, setIsEditingGemma] = useState(false)
  const [testResultGemma, setTestResultGemma] = useState(null)

  const [form, setForm] = useState({
    gemini_api_key: '',
    gemini_model: '',
    system_instruction: '',
  })

  useEffect(() => {
    if (config) {
      setForm({
        gemini_api_key: config.gemini_api_key || '',
        gemini_model: config.gemini_model || '',
        system_instruction: config.system_instruction || '',
      })
      if (config.gemini_api_key) setIsEditingGemma(false)
    }
  }, [config])

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (key === 'gemini_api_key') setTestResultGemma(null)
  }

  const handleSave = async () => {
    try {
      await update(form)
      toast.success('Konfigurasi AI berhasil diperbarui.')
      setIsEditingGemma(false)
    } catch (err) {
      toast.error('Gagal menyimpan konfigurasi')
    }
  }

  const handleTestGemini = async () => {
    setTestingGemini(true)
    setTestResultGemma(null)
    try {
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

  const handleCancelGemma = () => {
    setForm(f => ({ ...f, gemini_api_key: config.gemini_api_key || '' }))
    setIsEditingGemma(false)
    setTestResultGemma(null)
  }

  return (
    <div className="relative w-full pb-16">
      {/* ── Page Header ── */}
      <div className="animate-fade-in flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 mt-2">
        <div className="flex flex-wrap items-center gap-4 min-w-0">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-black text-slate-900 tracking-tight leading-none mb-2">
              Konfigurasi AI
            </h1>
            <p className="text-slate-500 text-[11px] sm:text-sm font-medium uppercase tracking-wider">
              Konfigurasi Engine & Keamanan
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Save Widget */}
      <div className="sticky top-[0.5rem] z-40 mx-0 px-2 py-2 mb-8 bg-white/70 backdrop-blur-3xl rounded-full border border-white/50 shadow-lg flex items-center justify-end lg:static lg:bg-transparent lg:backdrop-blur-none lg:border-none lg:shadow-none lg:p-0 lg:m-0 lg:mb-10 lg:z-auto">
        <button
          onClick={handleSave}
          disabled={isSaving || loading}
          className="w-full lg:w-auto flex items-center justify-center gap-3 px-8 py-3 sm:py-4 rounded-full text-xs font-black text-white transition-all disabled:opacity-60 hover:opacity-90 hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-95 flex-shrink-0 shadow-xl shadow-emerald-500/20"
          style={{ background: 'linear-gradient(135deg, #0f766e, #10b981)' }}
        >
          {isSaving ? (
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              MENYIMPAN...
            </span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              SIMPAN KONFIGURASI
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
        <div className="animate-fade-in flex flex-col gap-8">

          {/* Card AI Engine */}
          <div className="bg-white/60 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
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
            <div className="p-5 sm:p-8 flex flex-col gap-6 bg-gradient-to-b from-transparent to-slate-50/30">
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

              <div className="grid grid-cols-2 gap-3">
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

          {/* Card System Instruction */}
          <div className="bg-white/60 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
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
            <div className="p-5 sm:p-8 bg-gradient-to-b from-transparent to-slate-50/30">
              <InputField
                label="Instruksi Utama"
                id="sysInstruction"
                value={form.system_instruction}
                onChange={set('system_instruction')}
                placeholder="Kamu adalah asisten keuangan pribadi bernama Yui..."
                hint="Sangat krusial: Mengatur bagaimana AI bersikap, memformat laporan, dan menjawab chat."
                rows={10}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
