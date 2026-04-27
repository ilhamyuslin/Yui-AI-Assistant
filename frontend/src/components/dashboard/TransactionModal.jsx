import { useState, memo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Save, Plus, Minus, Tag, Calendar, Wallet, ReceiptText, ShoppingBag, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

const TransactionModal = memo(({ open, onOpenChange, accounts = [], categories = [], onSave }) => {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('Expense')
  const [itemName, setItemName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState('')
  const [destAccountId, setDestAccountId] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))

  const handleAmountChange = (val) => {
    const sanitized = val.replace(/[^0-9]/g, '')
    setAmount(sanitized)
  }

  const formatRupiah = (val) => {
    if (!val) return '0'
    return parseInt(val).toLocaleString('id-ID')
  }

  const handleSave = async () => {
    if (!amount || !category || !accountId || !itemName) {
      return
    }

    if (type === 'Transfer' && !destAccountId) {
      return
    }

    setLoading(true)
    try {
      const account = accounts.find(acc => acc.id === accountId)
      const destAccount = accounts.find(acc => acc.id === destAccountId)
      
      const payload = {
        transaction_type: type,
        amount: parseFloat(amount),
        item_name: itemName,
        category: category,
        source_of_fund: account?.name || 'Unknown',
        destination_account: type === 'Transfer' ? (destAccount?.name || 'Unknown') : null,
        transaction_notes: description,
        transaction_date: dayjs(date).toISOString()
      }

      await onSave(payload)
      
      // Reset form on success
      setItemName('')
      setAmount('')
      setCategory('')
      setDescription('')
      setAccountId('')
      setDestAccountId('')
      setType('Expense')
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-7 z-50 outline-none animate-in zoom-in-95 fade-in duration-300 border border-white max-h-[90vh] overflow-y-auto no-scrollbar">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                type === 'Expense' ? "bg-rose-500/10 text-rose-600" : 
                type === 'Income' ? "bg-emerald-500/10 text-emerald-600" :
                "bg-indigo-500/10 text-indigo-600"
              )}>
                {type === 'Expense' ? <Minus size={18} strokeWidth={3} /> : 
                 type === 'Income' ? <Plus size={18} strokeWidth={3} /> :
                 <ArrowRightLeft size={18} strokeWidth={3} />}
              </div>
              <Dialog.Title className="text-lg font-black text-slate-800 tracking-tight">Transaksi Baru</Dialog.Title>
            </div>
            <Dialog.Close className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 outline-none">
              <X size={18} strokeWidth={2.5} />
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Nominal Transaksi</div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-300">Rp</span>
                <input
                  autoFocus
                  type="text"
                  value={formatRupiah(amount)}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="bg-transparent text-2xl font-black tracking-tighter outline-none w-full text-slate-800 placeholder:text-slate-200"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setType('Expense')}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  type === 'Expense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400"
                )}
              >
                Expense
              </button>
              <button
                onClick={() => setType('Income')}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  type === 'Income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"
                )}
              >
                Income
              </button>
              <button
                onClick={() => setType('Transfer')}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  type === 'Transfer' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                )}
              >
                Transfer
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Nama Item</label>
                <div className="relative">
                  <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Nasi Padang..."
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Kategori</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 appearance-none outline-none focus:bg-white transition-all"
                  >
                    <option value="">Pilih</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">
                  {type === 'Transfer' ? 'Dari Akun' : 'Sumber'}
                </label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 appearance-none outline-none focus:bg-white transition-all"
                  >
                    <option value="">Pilih</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {type === 'Transfer' && (
                <div className="col-span-2 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Ke Akun</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={14} />
                    <select
                      value={destAccountId}
                      onChange={(e) => setDestAccountId(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl text-xs font-bold text-slate-700 appearance-none outline-none focus:bg-white transition-all"
                    >
                      <option value="">Pilih Tujuan</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold text-slate-700 outline-none focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Catatan</label>
                <div className="relative">
                  <ReceiptText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading || !amount || !category || !accountId || !itemName || (type === 'Transfer' && !destAccountId)}
              className={cn(
                "w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] mt-2",
                "bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={16} strokeWidth={2.5} />
                  Simpan Transaksi
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
})

TransactionModal.displayName = 'TransactionModal'
export default TransactionModal
