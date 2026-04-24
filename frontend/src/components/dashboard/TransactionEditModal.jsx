import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Calendar as CalIcon, Tag, CreditCard, ShoppingBag, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

export default function TransactionEditModal({ open, onOpenChange, transaction, onSave, categories = [] }) {
  const [formData, setFormData] = useState({
    item_name: '',
    amount: '',
    category: '',
    transaction_type: 'Expense',
    transaction_date: '',
    source_of_fund: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (transaction) {
      setFormData({
        item_name: transaction.item_name || '',
        amount: Math.abs(transaction.amount) || '',
        category: transaction.category || '',
        transaction_type: transaction.transaction_type || 'Expense',
        transaction_date: dayjs(transaction.transaction_date).format('YYYY-MM-DD'),
        source_of_fund: transaction.source_of_fund || ''
      })
    }
  }, [transaction])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(transaction.id, {
        ...formData,
        amount: parseFloat(formData.amount)
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save transaction:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-emerald-950/20 p-8 z-50 outline-none animate-in zoom-in-95 fade-in duration-300 border border-white focus:outline-none">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <ShoppingBag size={20} strokeWidth={2.5} />
              </div>
              <div>
                <Dialog.Title className="text-xl font-black text-slate-800 tracking-tight">Edit Transaksi</Dialog.Title>
                <Dialog.Description className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Update Transaction Details</Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 focus:outline-none">
              <X size={20} strokeWidth={2.5} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Name */}
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Detail Item / Catatan</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={e => setFormData(p => ({ ...p, item_name: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  placeholder="Contoh: Nasi Goreng"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  placeholder="0"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Tanggal</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={e => setFormData(p => ({ ...p, transaction_date: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Category & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none appearance-none cursor-pointer"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Tipe</label>
                <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl h-[52px]">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, transaction_type: 'Expense' }))}
                    className={cn(
                      "flex-1 rounded-xl flex items-center justify-center transition-all",
                      formData.transaction_type === 'Expense' ? "bg-white shadow-sm text-red-500" : "text-slate-400"
                    )}
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, transaction_type: 'Income' }))}
                    className={cn(
                      "flex-1 rounded-xl flex items-center justify-center transition-all",
                      formData.transaction_type === 'Income' ? "bg-white shadow-sm text-emerald-500" : "text-slate-400"
                    )}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Dialog.Close className="flex-1 h-14 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all outline-none focus:outline-none">
                Batal
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] h-14 bg-slate-900 hover:bg-black text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
