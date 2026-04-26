import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Target, Calendar, Sparkles, TrendingUp, Save, Trash2, Car, Smartphone, Plane, Wallet, MoreHorizontal, Home, Heart, GraduationCap, LineChart, AlertCircle, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

export const CATEGORIES = [
  { id: 'Vehicle', label: 'Vehicle', icon: Car, activeClass: "bg-indigo-600 text-white border-indigo-600 shadow-indigo-100" },
  { id: 'Gadget', label: 'Gadget', icon: Smartphone, activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-emerald-100" },
  { id: 'Travel', label: 'Travel', icon: Plane, activeClass: "bg-amber-500 text-white border-amber-500 shadow-amber-100" },
  { id: 'Savings', label: 'Savings', icon: Wallet, activeClass: "bg-sky-500 text-white border-sky-500 shadow-sky-100" },
  { id: 'House', label: 'House', icon: Home, activeClass: "bg-rose-500 text-white border-rose-500 shadow-rose-100" },
  { id: 'Wedding', label: 'Wedding', icon: Heart, activeClass: "bg-violet-500 text-white border-violet-500 shadow-violet-100" },
  { id: 'Education', label: 'Education', icon: GraduationCap, activeClass: "bg-lime-600 text-white border-lime-600 shadow-lime-100" },
  { id: 'Investment', label: 'Investment', icon: LineChart, activeClass: "bg-teal-600 text-white border-teal-600 shadow-teal-100" },
  { id: 'Emergency', label: 'Emergency', icon: AlertCircle, activeClass: "bg-red-600 text-white border-red-600 shadow-red-100" },
  { id: 'Other', label: 'Other', icon: MoreHorizontal, activeClass: "bg-slate-600 text-white border-slate-600 shadow-slate-100" },
]

const PRIORITIES = [
  { id: 'Low', label: 'Low', color: 'bg-slate-50 text-slate-400 border-slate-100', active: 'bg-slate-500 text-white border-slate-500' },
  { id: 'Medium', label: 'Medium', color: 'bg-amber-50 text-amber-500 border-amber-100', active: 'bg-amber-500 text-white border-amber-500' },
  { id: 'High', label: 'High', color: 'bg-rose-50 text-rose-500 border-rose-100', active: 'bg-rose-500 text-white border-rose-500' },
]

export default function GoalModal({ open, onOpenChange, goal = null, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    title: '',
    target_amount: '',
    current_amount: '',
    target_date: '',
    category: 'Other',
    priority: 'Medium'
  })

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title || '',
        target_amount: goal.target_amount?.toString() || '',
        current_amount: goal.current_amount?.toString() || '',
        target_date: goal.target_date || '',
        category: goal.category || 'Other',
        priority: goal.priority || 'Medium'
      })
    } else {
      setFormData({
        title: '',
        target_amount: '',
        current_amount: '',
        target_date: '',
        category: 'Other',
        priority: 'Medium'
      })
    }
  }, [goal, open])

  // Helper to format currency display
  const formatDisplay = (val) => {
    if (!val) return ''
    const num = val.toString().replace(/\D/g, '')
    return Number(num).toLocaleString('id-ID')
  }

  // Helper to strip non-digits for state storage
  const stripFormatting = (val) => {
    return val.toString().replace(/\D/g, '')
  }

  const targetAmountNum = Number(formData.target_amount) || 0
  const currentAmountNum = Number(formData.current_amount) || 0
  const monthsLeft = formData.target_date ? dayjs(formData.target_date).diff(dayjs(), 'month') : 0
  const monthlyTarget = monthsLeft > 0 ? (targetAmountNum - currentAmountNum) / monthsLeft : 0
  const progress = targetAmountNum > 0 ? (currentAmountNum / targetAmountNum) * 100 : 0

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[150] bg-[#010a05]/60 backdrop-blur-sm animate-in fade-in duration-300" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[160] w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 p-4 outline-none animate-in fade-in zoom-in-95 duration-300">
          <div className="relative overflow-hidden bg-white rounded-[1.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-slate-100">
            <div className="relative p-6">
              <Dialog.Close className="absolute right-5 top-5 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <X size={16} className="text-slate-400" />
              </Dialog.Close>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                  <Target size={18} />
                </div>
                <div>
                  <Dialog.Title className="text-sm font-black text-slate-900 leading-tight">
                    {goal ? 'Goal Detail' : 'Add Goal'}
                  </Dialog.Title>
                  <Dialog.Description className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    Manage your financial target
                  </Dialog.Description>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Goal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. New Car"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Category</label>
                  <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 -mx-1 px-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border shrink-0",
                          formData.category === cat.id
                            ? `${cat.activeClass} shadow-md`
                            : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                        )}
                      >
                        <cat.icon size={10} strokeWidth={3} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITIES.map((prio) => (
                      <button
                        key={prio.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, priority: prio.id }))}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all border",
                          formData.priority === prio.id ? prio.active : prio.color
                        )}
                      >
                        <ShieldAlert size={9} strokeWidth={3} />
                        {prio.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Target</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[9px]">Rp</div>
                      <input
                        type="text"
                        placeholder="0"
                        value={formatDisplay(formData.target_amount)}
                        onChange={e => setFormData(prev => ({ ...prev, target_amount: stripFormatting(e.target.value) }))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-7 pr-3 text-[11px] font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Date</label>
                    <input
                      type="date"
                      value={formData.target_date}
                      onChange={e => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/30 border border-indigo-100/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="text-indigo-500" size={10} />
                      <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Saved So Far</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600">{Math.round(progress)}%</span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max={targetAmountNum || 100}
                      value={currentAmountNum}
                      onChange={e => setFormData(prev => ({ ...prev, current_amount: e.target.value }))}
                      className="w-full h-1 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex items-center justify-between">
                      <div className="relative max-w-[120px]">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-[8px]">Rp</div>
                        <input
                          type="text"
                          value={formatDisplay(formData.current_amount)}
                          onChange={e => setFormData(prev => ({ ...prev, current_amount: stripFormatting(e.target.value) }))}
                          className="w-full bg-white border border-indigo-100 rounded-lg py-1.5 pl-6 pr-2 text-[10px] font-bold text-indigo-900 outline-none focus:border-indigo-500"
                        />
                      </div>
                      {targetAmountNum > 0 && formData.target_date && (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white rounded-full shadow-sm shadow-emerald-100">
                          <TrendingUp size={10} />
                          <span className="text-[8px] font-black">Rp {Math.round(monthlyTarget).toLocaleString('id-ID')}/mo</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {goal && (
                    <button
                      type="button"
                      onClick={() => onDelete?.(goal.id)}
                      className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-all active:scale-90"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => onSave(formData)}
                    className="flex-1 h-10 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-slate-100 active:scale-[0.98]"
                  >
                    <Save size={14} />
                    {goal ? 'Update' : 'Save Goal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
