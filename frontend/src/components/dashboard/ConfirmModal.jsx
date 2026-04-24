import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ConfirmModal({ 
  open, 
  onOpenChange, 
  title = "Hapus Data?", 
  description = "Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin?", 
  onConfirm, 
  loading = false,
  confirmText = "Ya, Hapus",
  variant = "danger"
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[360px] bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 z-50 outline-none animate-in zoom-in-95 duration-300 border border-white/50">
          
          <div className="flex flex-col items-center text-center">
            {/* Warning Icon */}
            <div className={cn(
              "w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 animate-bounce-subtle",
              variant === "danger" ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"
            )}>
              <AlertCircle size={40} strokeWidth={2.5} />
            </div>

            <Dialog.Title className="text-2xl font-black text-slate-800 tracking-tight mb-2">
              {title}
            </Dialog.Title>
            
            <Dialog.Description className="text-sm font-semibold text-slate-400 leading-relaxed mb-8 px-2">
              {description}
            </Dialog.Description>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  "h-14 w-full rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                  variant === "danger" 
                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25" 
                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25"
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={18} strokeWidth={2.5} />
                    {confirmText}
                  </>
                )}
              </button>

              <Dialog.Close asChild>
                <button className="h-14 w-full rounded-3xl font-black text-sm uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all outline-none">
                  Batal
                </button>
              </Dialog.Close>
            </div>
          </div>

          <Dialog.Close className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-300">
            <X size={20} strokeWidth={2.5} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
