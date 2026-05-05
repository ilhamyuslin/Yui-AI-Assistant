import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ChevronDown, ChevronRight, Gem, TrendingUp, Coins, PieChart, Landmark, ScrollText, Check } from 'lucide-react'

// ─── Investment type config with lucide icons ─────────────────────────────────
const TYPES = [
  { value:'emas',       label:'Emas',       sub:'Logam mulia — satuan gram',              Icon:Gem,        color:'amber'   },
  { value:'saham',      label:'Saham',      sub:'Saham BEI — satuan lot (100 lembar)',    Icon:TrendingUp, color:'blue'    },
  { value:'crypto',     label:'Crypto',     sub:'Aset kripto dalam USD + kurs manual',    Icon:Coins,      color:'violet'  },
  { value:'reksa_dana', label:'Reksa Dana', sub:'Reksa dana berdasarkan NAB/unit',        Icon:PieChart,   color:'emerald' },
  { value:'deposito',   label:'Deposito',   sub:'Simpanan bank berbunga tetap',           Icon:Landmark,   color:'sky'     },
  { value:'obligasi',   label:'Obligasi',   sub:'Surat utang negara/korporasi + kupon',  Icon:ScrollText, color:'rose'    },
]

const C = {
  amber:   { bg:'bg-amber-50',   border:'border-amber-200',  text:'text-amber-600',   icon:'text-amber-500',   ring:'ring-amber-200'   },
  blue:    { bg:'bg-blue-50',    border:'border-blue-200',   text:'text-blue-600',    icon:'text-blue-500',    ring:'ring-blue-200'    },
  violet:  { bg:'bg-violet-50',  border:'border-violet-200', text:'text-violet-600',  icon:'text-violet-500',  ring:'ring-violet-200'  },
  emerald: { bg:'bg-emerald-50', border:'border-emerald-200',text:'text-emerald-600', icon:'text-emerald-500', ring:'ring-emerald-200' },
  sky:     { bg:'bg-sky-50',     border:'border-sky-200',    text:'text-sky-600',     icon:'text-sky-500',     ring:'ring-sky-200'     },
  rose:    { bg:'bg-rose-50',    border:'border-rose-200',   text:'text-rose-600',    icon:'text-rose-500',    ring:'ring-rose-200'    },
}

const CRYPTO_COINS   = ['BTC','ETH','BNB','SOL','USDT','USDC','XRP','ADA','DOGE','AVAX','MATIC','LINK','Lainnya']
const REKSA_TYPES    = ['Pasar Uang','Pendapatan Tetap','Campuran','Saham']
const OBLIGASI_TYPES = ['ORI','SBR','SR (Sukuk Ritel)','ST (Sukuk Tabungan)','Korporasi']
const KUPON_TYPES    = ['Tetap (Fixed)','Mengambang (Floating)']
const TENOR_YEARS    = ['1','2','3','4','5','6','7','10']
const TENOR_MONTHS   = ['1','3','6','12','24']

// ─── Shared input atoms ───────────────────────────────────────────────────────
const inputCls = 'w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-[0.85rem] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all'

function F({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Txt({ className='', ...p }) {
  return <input {...p} className={`${inputCls} ${className}`} />
}

function Sel({ children, ...p }) {
  return (
    <div className="relative">
      <select {...p} className={`${inputCls} appearance-none pr-10`}>{children}</select>
      <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  )
}

// Currency input — IDR format: dots as thousand sep, comma as decimal sep
// e.g. display "1.500,80" → stores "1500.80"
function Rp({ value='', onChange, placeholder='', ...p }) {
  // Build display string from a numeric string like "1500.80"
  const toDisp = (raw) => {
    if (!raw && raw !== 0) return ''
    const str = String(raw)
    const [intPart, decPart] = str.split('.')
    const intNum = parseInt(intPart || '0', 10)
    const intFmt = isNaN(intNum) ? '' : intNum.toLocaleString('id-ID')
    return decPart !== undefined ? `${intFmt},${decPart}` : intFmt
  }

  const [disp, setDisp] = useState(() => toDisp(value))

  const handle = (e) => {
    const input = e.target.value
    // Allow only digits, dots (thousand sep display), and one comma (decimal)
    if (!/^[\d.,]*$/.test(input)) return
    if ((input.match(/,/g) || []).length > 1) return

    // Strip thousand-separator dots, convert comma → dot for internal value
    const stripped = input.replace(/\./g, '').replace(',', '.')

    // Rebuild display: format int part, preserve decimal as typed
    const hasComma  = input.includes(',')
    const [intRaw, decRaw] = input.replace(/\./g, '').split(',')
    const intNum    = parseInt(intRaw || '0', 10)
    const intFmt    = isNaN(intNum) || intRaw === '' ? '' : intNum.toLocaleString('id-ID')
    const newDisp   = hasComma ? `${intFmt},${decRaw ?? ''}` : intFmt

    setDisp(newDisp)
    onChange(stripped) // e.g. "1500.80"
  }

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[0.75rem] font-black text-slate-400 pointer-events-none">Rp</span>
      <input type="text" inputMode="decimal" value={disp} onChange={handle} placeholder={placeholder}
        {...p}
        className={`${inputCls} pl-10`}
      />
    </div>
  )
}

// USD input — shows $ prefix
function Usd({ value='', onChange, placeholder='', ...p }) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[0.75rem] font-black text-slate-400 pointer-events-none">$</span>
      <input type="number" step="any" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        {...p}
        className={`${inputCls} pl-9`}
      />
    </div>
  )
}

// ─── Type-specific field groups ───────────────────────────────────────────────
function Fields({ type, form, set }) {
  const s = (k,v) => set(k,v)
  switch(type) {
    case 'emas': return (<>
      <F label="Berat (gram)" required><Txt type="number" step="0.01" placeholder="e.g. 5.5" value={form.gram||''} onChange={e=>s('gram',e.target.value)} /></F>
      <F label="Harga Beli / gram" required><Rp value={form.buy_price_per_gram||''} onChange={v=>s('buy_price_per_gram',v)} placeholder="e.g. 1.500.000" /></F>
      <F label="Harga Terkini / gram" required><Rp value={form.current_price_per_gram||''} onChange={v=>s('current_price_per_gram',v)} placeholder="Harga emas sekarang" /></F>
    </>)
    case 'saham': return (<>
      <F label="Kode Saham" required><Txt type="text" placeholder="BBCA / GOTO / TLKM" value={form.ticker||''} onChange={e=>s('ticker',e.target.value.toUpperCase())} /></F>
      <F label="Jumlah Lot" required><Txt type="number" step="1" min="1" placeholder="e.g. 10" value={form.lot||''} onChange={e=>s('lot',e.target.value)} /></F>
      <F label="Harga Beli / lembar" required><Rp value={form.buy_price_per_share||''} onChange={v=>s('buy_price_per_share',v)} placeholder="e.g. 8.500" /></F>
      <F label="Harga Terkini / lembar" required><Rp value={form.current_price_per_share||''} onChange={v=>s('current_price_per_share',v)} placeholder="Harga saham sekarang" /></F>
      <F label="Fee Broker (%)"><Txt type="number" step="0.01" placeholder="e.g. 0.15" value={form.broker_fee||''} onChange={e=>s('broker_fee',e.target.value)} /></F>
    </>)
    case 'crypto': return (<>
      <F label="Jenis Coin" required>
        <Sel value={form.coin||''} onChange={e=>s('coin',e.target.value)}>
          <option value="">Pilih coin...</option>
          {CRYPTO_COINS.map(c=><option key={c} value={c}>{c}</option>)}
        </Sel>
      </F>
      {form.coin==='Lainnya'&&<F label="Nama Coin"><Txt type="text" placeholder="PEPE, WIF..." value={form.coin_custom||''} onChange={e=>s('coin_custom',e.target.value)} /></F>}
      <F label="Jumlah Coin" required><Txt type="number" step="any" placeholder="e.g. 0.05" value={form.amount||''} onChange={e=>s('amount',e.target.value)} /></F>
      <F label="Harga Beli / coin" required><Usd value={form.buy_price_usd||''} onChange={v=>s('buy_price_usd',v)} placeholder="e.g. 65000" /></F>
      <F label="Harga Terkini / coin" required><Usd value={form.current_price_usd||''} onChange={v=>s('current_price_usd',v)} placeholder="Harga sekarang" /></F>
      <F label="Kurs USD → IDR" required><Rp value={form.usd_to_idr||''} onChange={v=>s('usd_to_idr',v)} placeholder="e.g. 16.200" /></F>
      <F label="Platform"><Txt type="text" placeholder="Indodax / Pintu / Binance" value={form.platform||''} onChange={e=>s('platform',e.target.value)} /></F>
    </>)
    case 'reksa_dana': return (<>
      <F label="Nama Produk" required><Txt type="text" placeholder="e.g. Bibit Saham Unggulan" value={form.product||''} onChange={e=>s('product',e.target.value)} /></F>
      <F label="Jenis Reksa Dana" required>
        <Sel value={form.reksadana_type||''} onChange={e=>s('reksadana_type',e.target.value)}>
          <option value="">Pilih jenis...</option>
          {REKSA_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </Sel>
      </F>
      <F label="Platform"><Txt type="text" placeholder="Bibit / Bareksa / Tokopedia" value={form.platform||''} onChange={e=>s('platform',e.target.value)} /></F>
      <F label="Nilai Investasi" required><Rp value={form.investment_value||''} onChange={v=>s('investment_value',v)} placeholder="e.g. 5.000.000" /></F>
      <F label="NAB / unit saat beli" required><Rp value={form.nab_buy||''} onChange={v=>s('nab_buy',v)} placeholder="e.g. 1.500" /></F>
      <F label="NAB / unit terkini" required><Rp value={form.nab_current||''} onChange={v=>s('nab_current',v)} placeholder="Harga NAB sekarang" /></F>
    </>)
    case 'deposito': return (<>
      <F label="Nama Bank" required><Txt type="text" placeholder="BCA / Mandiri / BNI" value={form.bank||''} onChange={e=>s('bank',e.target.value)} /></F>
      <F label="Nominal Pokok" required><Rp value={form.principal||''} onChange={v=>s('principal',v)} placeholder="e.g. 10.000.000" /></F>
      <F label="Suku Bunga (% / tahun)" required><Txt type="number" step="0.01" placeholder="e.g. 5.5" value={form.rate||''} onChange={e=>s('rate',e.target.value)} /></F>
      <F label="Tenor" required>
        <Sel value={form.tenor_months||''} onChange={e=>s('tenor_months',e.target.value)}>
          <option value="">Pilih tenor...</option>
          {TENOR_MONTHS.map(t=><option key={t} value={t}>{t} bulan</option>)}
        </Sel>
      </F>
      <F label="Pajak Bunga (%)"><Txt type="number" placeholder="20" value={form.tax_rate??'20'} onChange={e=>s('tax_rate',e.target.value)} /></F>
    </>)
    case 'obligasi': return (<>
      <F label="Nama / Seri" required><Txt type="text" placeholder="ORI025 / SBR013" value={form.series||''} onChange={e=>s('series',e.target.value)} /></F>
      <F label="Jenis Obligasi" required>
        <Sel value={form.obligasi_type||''} onChange={e=>s('obligasi_type',e.target.value)}>
          <option value="">Pilih jenis...</option>
          {OBLIGASI_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </Sel>
      </F>
      <F label="Platform / Bank"><Txt type="text" placeholder="BCA / Bibit / Mandiri" value={form.platform||''} onChange={e=>s('platform',e.target.value)} /></F>
      <F label="Nilai Investasi" required><Rp value={form.investment_value||''} onChange={v=>s('investment_value',v)} placeholder="e.g. 10.000.000" /></F>
      <F label="Kupon (% / tahun)" required><Txt type="number" step="0.01" placeholder="e.g. 6.25" value={form.coupon_rate||''} onChange={e=>s('coupon_rate',e.target.value)} /></F>
      <F label="Jenis Kupon">
        <Sel value={form.coupon_type||'Tetap (Fixed)'} onChange={e=>s('coupon_type',e.target.value)}>
          {KUPON_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </Sel>
      </F>
      <F label="Tenor (tahun)" required>
        <Sel value={form.tenor_years||''} onChange={e=>s('tenor_years',e.target.value)}>
          <option value="">Pilih tenor...</option>
          {TENOR_YEARS.map(t=><option key={t} value={t}>{t} tahun</option>)}
        </Sel>
      </F>
      <F label="Pajak Kupon (%)"><Txt type="number" placeholder="10" value={form.tax_rate??'10'} onChange={e=>s('tax_rate',e.target.value)} /></F>
    </>)
    default: return null
  }
}

// ─── Compute values ───────────────────────────────────────────────────────────
function computeValues(type, m) {
  switch(type) {
    case 'emas':      return { purchase_value:(parseFloat(m.gram)||0)*(parseFloat(m.buy_price_per_gram)||0), current_value:(parseFloat(m.gram)||0)*(parseFloat(m.current_price_per_gram)||0) }
    case 'saham':     return { purchase_value:(parseFloat(m.lot)||0)*100*(parseFloat(m.buy_price_per_share)||0), current_value:(parseFloat(m.lot)||0)*100*(parseFloat(m.current_price_per_share)||0) }
    case 'crypto':    { const k=parseFloat(m.usd_to_idr)||1; return { purchase_value:(parseFloat(m.amount)||0)*(parseFloat(m.buy_price_usd)||0)*k, current_value:(parseFloat(m.amount)||0)*(parseFloat(m.current_price_usd)||0)*k } }
    case 'reksa_dana':{ const nb=parseFloat(m.nab_buy)||1,nc=parseFloat(m.nab_current)||nb,iv=parseFloat(m.investment_value)||0; return { purchase_value:iv, current_value:(iv/nb)*nc } }
    case 'deposito':  { const p=parseFloat(m.principal)||0,r=parseFloat(m.rate)||0,t=parseFloat(m.tenor_months)||0,tx=(parseFloat(m.tax_rate??20))/100; return { purchase_value:p, current_value:p+p*(r/100)*(t/12)*(1-tx) } }
    case 'obligasi':  { const p=parseFloat(m.investment_value)||0,r=parseFloat(m.coupon_rate)||0,tx=(parseFloat(m.tax_rate??10))/100,sd=m.start_date?new Date(m.start_date):new Date(),now=new Date(),mo=Math.max(0,(now.getFullYear()-sd.getFullYear())*12+(now.getMonth()-sd.getMonth())); return { purchase_value:p, current_value:p+p*(r/100)/12*(1-tx)*mo } }
    default: return { purchase_value:0, current_value:0 }
  }
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function InvestmentModal({ open, onOpenChange, onSave, editData=null }) {
  const isEdit = !!editData
  const [type,  setType]  = useState(editData?.type||'')
  const [name,  setName]  = useState(editData?.name||'')
  const [date,  setDate]  = useState(editData?.purchase_date || dayjs().format('YYYY-MM-DD'))
  const [notes, setNotes] = useState(editData?.notes||'')
  const [meta,  setMeta]  = useState(editData?.metadata||{})
  const [saving,setSaving]= useState(false)

  useEffect(()=>{
    if(!open&&!isEdit){ setType('');setName('');setMeta({});setNotes('');setDate(dayjs().format('YYYY-MM-DD')) }
  },[open,isEdit])

  const setField = (k,v)=>setMeta(p=>({...p,[k]:v}))
  const active   = TYPES.find(t=>t.value===type)
  const c        = active ? C[active.color] : null

  const handleSubmit = async(e)=>{
    e.preventDefault()
    if(!type||!name||!date) return
    setSaving(true)
    try {
      const {purchase_value,current_value} = computeValues(type,meta)
      await onSave({type,name,purchase_date:date,purchase_value,current_value,metadata:meta,notes}, isEdit?editData.id:null)
      onOpenChange(false)
    } finally{ setSaving(false) }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[190] bg-slate-900/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed z-[200] bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg w-full bg-white rounded-t-[2rem] sm:rounded-[2rem] border border-slate-100 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              {active && (
                <div className={`w-10 h-10 rounded-2xl ${c.bg} ${c.border} border flex items-center justify-center`}>
                  <active.Icon size={18} className={c.icon} strokeWidth={2} />
                </div>
              )}
              <div>
                <Dialog.Title className="text-[0.95rem] font-black text-slate-900">
                  {isEdit ? `Edit ${active?.label||'Investasi'}` : 'Tambah Investasi'}
                </Dialog.Title>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-0.5">
                  {active ? active.sub : 'Pilih jenis investasi'}
                </p>
              </div>
            </div>
            <Dialog.Close className="w-9 h-9 flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <X size={17} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">

              {/* ── Type Picker (premium list style) ── */}
              {!isEdit && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Jenis Investasi<span className="text-rose-400 ml-0.5">*</span></p>
                  {TYPES.map(t => {
                    const tc      = C[t.color]
                    const isActive = type === t.value
                    return (
                      <button key={t.value} type="button"
                        onClick={()=>{ setType(t.value); setMeta({}) }}
                        className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-200 text-left ${
                          isActive
                            ? `${tc.bg} ${tc.border} ring-1 ${tc.ring}`
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {/* Icon box */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                          isActive ? `${tc.bg} border ${tc.border}` : 'bg-slate-50 border border-slate-100'
                        }`}>
                          <t.Icon size={17} strokeWidth={2} className={isActive ? tc.icon : 'text-slate-400'} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[0.82rem] font-black leading-tight ${isActive ? tc.text : 'text-slate-700'}`}>{t.label}</p>
                          <p className="text-[0.68rem] text-slate-400 font-medium mt-0.5 truncate">{t.sub}</p>
                        </div>

                        {/* Right indicator */}
                        {isActive
                          ? <div className={`w-5 h-5 rounded-full flex items-center justify-center ${tc.bg} ${tc.border} border flex-shrink-0`}><Check size={10} className={tc.icon} strokeWidth={3} /></div>
                          : <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                        }
                      </button>
                    )
                  })}
                </div>
              )}

              {/* ── Shared Fields + Type Fields ── */}
              {type && (
                <>
                  <div className="pt-1 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 mt-3">Informasi Umum</p>
                    <div className="space-y-3">
                      <F label="Nama Investasi" required>
                        <Txt type="text" placeholder={`Beri nama untuk ${active?.label} ini`} value={name} onChange={e=>setName(e.target.value)} />
                      </F>
                      <F label="Tanggal Pembelian" required>
                        <Txt type="date" value={date} onChange={e=>setDate(e.target.value)} />
                      </F>
                    </div>
                  </div>

                  <div className={`rounded-2xl border ${c?.border} ${c?.bg} p-4 space-y-3`}>
                    <div className="flex items-center gap-2">
                      {active && <active.Icon size={13} className={c?.icon} strokeWidth={2.5} />}
                      <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${c?.text}`}>Detail {active?.label}</p>
                    </div>
                    <Fields type={type} form={meta} set={setField} />
                  </div>

                  <F label="Catatan (opsional)">
                    <textarea rows={2} placeholder="Tambah catatan..." value={notes} onChange={e=>setNotes(e.target.value)}
                      className={`${inputCls} resize-none`}
                    />
                  </F>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <Dialog.Close asChild>
                <button type="button" className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-[0.72rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                  Batal
                </button>
              </Dialog.Close>
              <button type="submit" disabled={saving||!type||!name}
                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-[0.72rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-40"
              >
                {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Investasi'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
