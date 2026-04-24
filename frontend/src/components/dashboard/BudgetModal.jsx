import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Save, Wallet, Plus, Trash2, Edit3, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BudgetModal({ open, onOpenChange, budgets, onSave, onRemove, onRename, onRefresh }) {
  const [localValues, setLocalValues] = useState({})
  const [localBudgets, setLocalBudgets] = useState([]) // List of current category names
  const [deletedCategories, setDeletedCategories] = useState([])
  const [renames, setRenames] = useState({}) // oldName -> newName
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && budgets) {
      const initialV = {}
      budgets.forEach(b => {
        initialV[b.category] = b.amount
      })
      setLocalValues(initialV)
      setLocalBudgets(budgets.map(b => b.category))
      setDeletedCategories([])
      setRenames({})
      setEditingCategory(null)
    }
  }, [open, budgets])

  const handleInputChange = (category, value) => {
    const sanitized = value.replace(/[^0-9]/g, '')
    setLocalValues(prev => ({ ...prev, [category]: sanitized }))
  }

  const handleAddCategory = () => {
    const name = newCategoryName.trim()
    if (!name || localBudgets.includes(name)) return

    setLocalBudgets(prev => [...prev, name])
    setLocalValues(prev => ({ ...prev, [name]: '0' }))
    setNewCategoryName('')
  }

  const handleRemoveCategory = (category) => {
    setLocalBudgets(prev => prev.filter(c => c !== category))

    // Track deletion if it was an original category (or a renamed version of an original)
    const isOriginal = budgets.find(b => b.category === category)
    const originalName = Object.keys(renames).find(old => renames[old] === category) || (isOriginal ? category : null)

    if (originalName) {
      setDeletedCategories(prev => [...prev, originalName])
    }
  }

  const startRename = (category) => {
    setEditingCategory(category)
    setEditingValue(category)
  }

  const confirmRename = (oldName) => {
    const newName = editingValue.trim()
    if (!newName || newName === oldName || localBudgets.includes(newName)) {
      setEditingCategory(null)
      return
    }

    // Update list
    setLocalBudgets(prev => prev.map(c => c === oldName ? newName : c))
    
    // Update values map
    setLocalValues(prev => {
      const next = { ...prev }
      next[newName] = next[oldName]
      delete next[oldName]
      return next
    })

    // Track the rename chain
    setRenames(prev => {
      const next = { ...prev }
      // If we are renaming something that was already renamed, find the REAL original
      const realOriginal = Object.keys(next).find(k => next[k] === oldName) || oldName
      next[realOriginal] = newName
      return next
    })

    setEditingCategory(null)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      // 1. Process Deletions
      for (const cat of deletedCategories) {
        await onRemove(cat)
      }

      // 2. Process Renames
      for (const [oldName, newName] of Object.entries(renames)) {
        // Skip if this category was eventually deleted
        if (deletedCategories.includes(oldName)) continue
        await onRename(oldName, newName)
      }

      // 3. Process Additions & Amount Updates
      // We process all current localBudgets. 
      // If a category was renamed, it will now exist as the newName in DB.
      // If it's a completely new category, it will be created.
      const promises = localBudgets.map(category => {
        const amount = localValues[category] || 0
        const trimmedCat = category.trim()
        
        // Find if it was original or renamed
        const originalName = Object.keys(renames).find(k => renames[k] === trimmedCat) || trimmedCat
        const original = budgets.find(b => b.category === originalName)

        // Save if:
        // - New category
        // - Amount changed
        if (!original || parseFloat(amount) !== parseFloat(original.amount)) {
          return onSave(trimmedCat, amount)
        }
        return Promise.resolve()
      })

      await Promise.all(promises)
      
      // Final Refresh and Close
      if (onRefresh) await onRefresh()
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save budget changes:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatRupiahInput = (val) => {
    if (!val && val !== 0) return ''
    return parseInt(val).toLocaleString('id-ID')
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-emerald-950/20 p-8 z-50 outline-none animate-in zoom-in-95 fade-in duration-300 border border-white focus:outline-none">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Wallet size={20} strokeWidth={2.5} />
              </div>
              <div>
                <Dialog.Title className="text-xl font-black text-slate-800 tracking-tight">Atur Anggaran</Dialog.Title>
                <Dialog.Description className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Kelola Kategori & Limit</Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 focus:outline-none">
              <X size={20} strokeWidth={2.5} />
            </Dialog.Close>
          </div>

          {/* Add New Category */}
          <div className="mb-6 relative group">
            <input
              type="text"
              placeholder="Tambah kategori baru..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              className="w-full pl-6 pr-14 py-4 bg-slate-100/50 border border-slate-100 rounded-[1.5rem] text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim() || saving}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all active:scale-90 disabled:opacity-30"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="max-h-[350px] overflow-y-auto pr-1 mb-8 space-y-3 no-scrollbar">
            {localBudgets.map((category) => (
              <div key={category} className="group flex flex-col p-4 bg-slate-50/50 hover:bg-white border border-transparent hover:border-emerald-100 rounded-[1.5rem] transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    {editingCategory === category ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          autoFocus
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && confirmRename(category)}
                          onBlur={() => confirmRename(category)}
                          className="flex-1 bg-white border border-emerald-500 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 outline-none"
                        />
                        <button onClick={() => confirmRename(category)} className="p-1 text-emerald-600">
                          <Check size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/name truncate">
                        <span className="font-bold text-slate-700 truncate">{category}</span>
                        <button 
                          onClick={() => startRename(category)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition-all"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rp</span>
                      <input
                        type="text"
                        value={formatRupiahInput(localValues[category])}
                        onChange={(e) => handleInputChange(category, e.target.value)}
                        className="w-28 sm:w-32 pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-right text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full h-14 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} strokeWidth={2.5} />}
            Simpan Perubahan
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
