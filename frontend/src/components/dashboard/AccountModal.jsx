import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Wallet, Trash2, Banknote, CreditCard, Landmark, Smartphone, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

const IconComponent = ({ name, size = 20 }) => {
  const icons = {
    Wallet,
    Banknote,
    CreditCard,
    Landmark,
    Smartphone,
    Coins
  }
  const Icon = icons[name] || Wallet
  return <Icon size={size} />
}

export default function AccountModal({ open, onOpenChange, accounts, onSave, onDelete, defaultAccount = null }) {
  const [formData, setFormData] = useState({ name: '', balance: '', icon: '💰' })
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState(null)

  // Reset form when opening — pre-fill if defaultAccount is provided
  useEffect(() => {
    if (open) {
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id)
        setFormData({
          name: defaultAccount.name,
          balance: defaultAccount.balance.toLocaleString('id-ID'),
          icon: defaultAccount.icon || '💰'
        })
      } else {
        setSelectedAccountId(null)
        setFormData({ name: '', balance: '', icon: 'Wallet' })
      }
    }
  }, [open, defaultAccount])

  const handleSave = (e) => {
    e.preventDefault()
    onSave({
      id: selectedAccountId,
      ...formData,
      balance: parseFloat(String(formData.balance).replace(/[^\d]/g, '')) || 0
    })
    setSelectedAccountId(null)
  }

  const handleSelectAccount = (acc) => {
    setSelectedAccountId(acc.id)
    setFormData({
      name: acc.name,
      balance: acc.balance.toLocaleString('id-ID'),
      icon: acc.icon || '💰'
    })
  }

  const formatInputCurrency = (val) => {
    const num = val.replace(/[^\d]/g, '')
    if (!num) return ''
    return parseInt(num).toLocaleString('id-ID')
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => {
      if (!o) setSelectedAccountId(null)
      onOpenChange(o)
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-emerald-950/20 p-8 z-50 border border-white animate-in zoom-in-95 fade-in duration-300 outline-none">

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Wallet size={20} strokeWidth={2.5} />
              </div>
              <Dialog.Title className="text-xl font-black text-slate-800 tracking-tight">
                Kelola Portofolio
              </Dialog.Title>
            </div>
            <Dialog.Close className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <X size={20} strokeWidth={2.5} />
            </Dialog.Close>
          </div>

          {/* Account Selector (Horizontal Scroll) */}
          <div className="mb-8 overflow-x-auto pb-2 flex gap-2 no-scrollbar">
            <button
              onClick={() => {
                setSelectedAccountId(null)
                setFormData({ name: '', balance: '', icon: 'Wallet' })
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border",
                !selectedAccountId
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
              )}
            >
              + Akun Baru
            </button>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => handleSelectAccount(acc)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center justify-center",
                  selectedAccountId === acc.id
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                )}
              >
                <span>{acc.name}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-[1fr] gap-4">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Nama Akun</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-3xl px-6 font-bold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
                  placeholder="Misal: Bank BCA, Dana..."
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Pilih Ikon Flat Premium</label>
              <div className="grid grid-cols-6 gap-2">
                {['Wallet', 'Banknote', 'CreditCard', 'Landmark', 'Smartphone', 'Coins'].map((iconName) => {
                  const IconComp = {
                    Wallet: Wallet,
                    Banknote: Wallet, // fallback or similar
                    CreditCard: CreditCard,
                    Landmark: Landmark,
                    Smartphone: Smartphone,
                    Coins: Coins
                  }[iconName] || Wallet;

                  // Using specific icons for better flat design look
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                      className={cn(
                        "h-12 flex items-center justify-center rounded-2xl border transition-all",
                        formData.icon === iconName
                          ? "bg-slate-800 text-emerald-400 border-slate-800 shadow-lg"
                          : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200"
                      )}
                    >
                      {/* We'll import these icons below */}
                      <IconComponent name={iconName} size={20} />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Saldo Saat Ini</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300">Rp</span>
                <input
                  type="text"
                  required
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: formatInputCurrency(e.target.value) })}
                  className="w-full h-16 bg-slate-800 border-none rounded-3xl pl-14 pr-6 font-black text-2xl text-emerald-400 placeholder:text-emerald-900/30 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all shadow-xl"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              {selectedAccountId && (
                <button
                  type="button"
                  onClick={() => onDelete(selectedAccountId)}
                  className="h-14 w-14 flex items-center justify-center bg-rose-50 text-rose-500 rounded-3xl hover:bg-rose-100 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button
                type="submit"
                className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
              >
                {selectedAccountId ? 'Perbarui Akun' : 'Tambah Akun'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
