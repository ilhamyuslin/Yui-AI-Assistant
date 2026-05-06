import { useState, useEffect } from 'react'
import { Target, TrendingUp, Calendar, ChevronRight, Plus, Sparkles, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { goalApi } from '@/lib/api'
import { toast } from 'sonner'
import dayjs from 'dayjs'

import GoalModal, { CATEGORIES } from '@/components/dashboard/GoalModal'

const PRIORITY_STYLES = {
  Low: "bg-slate-50 text-slate-500 border-slate-100",
  Medium: "bg-amber-50 text-amber-600 border-amber-100",
  High: "bg-rose-50 text-rose-600 border-rose-100"
}

export default function GoalsSection() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const { data } = await goalApi.getAll()
      setGoals(data)
    } catch (err) {
      console.error('Failed to fetch goals:', err)
      toast.error('Gagal mengambil data goals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const handleAddGoal = () => {
    setSelectedGoal(null)
    setIsModalOpen(true)
  }

  const handleEditGoal = (goal) => {
    setSelectedGoal(goal)
    setIsModalOpen(true)
  }

  const handleSave = async (formData) => {
    try {
      const sanitizedData = {
        ...formData,
        target_amount: Number(formData.target_amount) || 0,
        current_amount: Number(formData.current_amount) || 0,
        target_date: formData.target_date || dayjs().add(1, 'year').format('YYYY-MM-DD')
      }

      if (selectedGoal) {
        await goalApi.update(selectedGoal.id, sanitizedData)
        toast.success('Goal berhasil diupdate!')
      } else {
        await goalApi.create(sanitizedData)
        toast.success('Goal baru berhasil ditambah!')
      }
      setIsModalOpen(false)
      fetchGoals()
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Gagal menyimpan goal')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin mau hapus goal ini?')) return
    try {
      await goalApi.delete(id)
      toast.success('Goal dihapus')
      setIsModalOpen(false)
      fetchGoals()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Gagal menghapus goal')
    }
  }

  if (loading && goals.length === 0) {
    return (
      <div className="mt-8 mb-6 flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading your dreams...</p>
      </div>
    )
  }

  return (
    <div className="mt-10 mb-10">
      {/* ── Header (Matched exactly with InvestmentSection) ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Financial Goals</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Dream bigger, save smarter</p>
        </div>
        <button
          onClick={handleAddGoal}
          className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-bold text-xs shadow-sm transition-all active:scale-95 group"
        >
          <Plus size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500 shrink-0" />
          <span className="hidden md:inline">Tambah Goal</span>
          <span className="inline md:hidden">Tambah</span>
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 -mx-6 md:-mx-10 px-6 md:px-10">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onClick={() => handleEditGoal(goal)} />
        ))}

        {goals.length === 0 && !loading && (
          <div className="hidden md:flex items-center justify-start px-8 py-4 w-full">
            <p className="text-[0.8rem] text-slate-400 font-bold">Belum ada financial goals. Klik <span className="text-emerald-600">+ Tambah Goal</span> untuk mulai.</p>
          </div>
        )}

        {/* Add Card (Matched exactly with InvestmentSection) */}
        {!loading && (
          <button
            onClick={handleAddGoal}
            className="min-w-[240px] h-[380px] bg-slate-50/40 border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-500 transition-all group shrink-0"
          >
            <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={20} strokeWidth={3} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Tambah Goal</span>
          </button>
        )}
      </div>

      <GoalModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        goal={selectedGoal}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}

function GoalCard({ goal, onClick }) {
  const target = Number(goal.target_amount) || 1
  const current = Number(goal.current_amount) || 0
  const progress = Math.min((current / target) * 100, 100)
  
  const createdDate = dayjs(goal.created_at)
  const targetDate = dayjs(goal.target_date)
  const today = dayjs()
  
  const totalDays = targetDate.diff(createdDate, 'day') || 1
  const daysElapsed = today.diff(createdDate, 'day')
  const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100)
  
  const isBehind = progress < expectedProgress && progress < 100
  const isCompleted = progress >= 100

  const categoryInfo = CATEGORIES.find(c => c.id === goal.category) || CATEGORIES[CATEGORIES.length - 1]
  const catColorBase = categoryInfo.activeClass.split(' ')[0].replace('bg-', '').replace('-600', '').replace('-500', '')

  return (
    <div 
      onClick={onClick}
      className="group relative min-w-[280px] h-[380px] bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden cursor-pointer flex flex-col"
    >
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 blur-[80px] opacity-10 transition-all duration-700 group-hover:opacity-20",
        `bg-${catColorBase}-500`
      )} />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-colors",
                `bg-${catColorBase}-50 text-${catColorBase}-600 border-${catColorBase}-100`
              )}>
                {goal.category}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-1",
                PRIORITY_STYLES[goal.priority] || PRIORITY_STYLES.Medium
              )}>
                <ShieldAlert size={8} />
                {goal.priority}
              </span>
            </div>
            <h4 className="text-base font-black text-slate-900 line-clamp-1">{goal.title}</h4>
          </div>
          <div className="flex flex-col items-end">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-wider",
              isCompleted ? "text-emerald-500" : isBehind ? "text-rose-500" : "text-emerald-500"
            )}>
              {isCompleted ? 'Completed' : isBehind ? 'Behind' : 'On Track'}
            </span>
            <span className="text-[9px] font-bold text-slate-300">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center py-2">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-50" />
              <circle
                cx="48"
                cy="48"
                r="42"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * progress) / 100}
                strokeLinecap="round"
                fill="transparent"
                className={cn(
                  "transition-all duration-1000 ease-out",
                  isCompleted ? "text-emerald-500" : isBehind ? "text-rose-500" : `text-${catColorBase}-500`
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Sparkles className={cn("w-3 h-3 mb-0.5 opacity-60", isCompleted ? "text-emerald-400" : isBehind ? "text-rose-400" : `text-${catColorBase}-400`)} />
              <span className="text-base font-black text-slate-900 leading-none">
                {Math.round(progress)}<span className="text-[10px]">%</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-3.5">
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saved So Far</p>
              <p className="text-[13px] font-black text-slate-900">Rp {current.toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Target</p>
              <p className="text-[10px] font-bold text-slate-400">Rp {target.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className={cn(
            "p-3 rounded-[1.2rem] border flex items-center gap-2.5 transition-all",
            isCompleted ? "bg-emerald-50 border-emerald-100" : isBehind ? "bg-rose-50/40 border-rose-100/50" : "bg-emerald-50/40 border-emerald-100/50"
          )}>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
              isCompleted ? "bg-emerald-600 text-white" : isBehind ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
            )}>
              {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : isBehind ? <TrendingUp className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <p className={cn("text-[9px] font-black uppercase tracking-tight", isCompleted ? "text-emerald-600" : isBehind ? "text-rose-600" : "text-emerald-600")}>
                {isCompleted ? 'Goal Achieved!' : isBehind ? 'Action Required' : 'On Schedule'}
              </p>
              <p className="text-[8px] font-medium text-slate-500 truncate">
                {isCompleted ? 'Congratulations on your success!' : isBehind ? 'Increase savings to catch up' : 'You are on track to your goal!'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar size={10} />
              <span className="text-[9px] font-bold">{dayjs(goal.target_date).format('MMM YYYY')}</span>
            </div>
            <div className="flex items-center gap-0.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
              Details <ChevronRight size={12} strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
