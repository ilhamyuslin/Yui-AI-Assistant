import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useStats, useTransactions, getQuickFilterRange } from '@/hooks/useFinancial'
import { useBudgets } from '@/hooks/useBudgets'
import MetricCards from '@/components/dashboard/MetricCards'
import TrendChart from '@/components/dashboard/TrendChart'
import BudgetMonitor from '@/components/dashboard/BudgetMonitor'
import BudgetModal from '@/components/dashboard/BudgetModal'
import AccountPortfolio from '@/components/dashboard/AccountPortfolio'
import ExpenseCategoryChart from '@/components/dashboard/ExpenseCategoryChart'
import SmartAnalysisPanel from '@/components/dashboard/SmartAnalysisPanel'
import TransactionTable from '@/components/dashboard/TransactionTable'
import ConfirmModal from '@/components/dashboard/ConfirmModal'
import BehaviorAnalysis from '@/components/dashboard/BehaviorAnalysis'
const TransactionModal = lazy(() => import('@/components/dashboard/TransactionModal'))
import { useAccounts } from '@/hooks/useAccounts'
import { useInvestments } from '@/hooks/useInvestments'
import { configApi, statsApi } from '@/lib/api'
import { Check, Tag, Calendar, X, PieChart, LayoutList, Plus } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import InvestmentSection from '@/components/dashboard/InvestmentSection'
import GoalsSection from '@/components/dashboard/GoalsSection'

const QUICK_FILTERS = [
  { key: 'today', label: 'Today', short: 'D' },
  { key: 'week', label: 'Week', short: 'W' },
  { key: 'cycle', label: 'Monthly', short: 'M' },
  { key: 'all', label: 'All', short: 'All' },
]

function formatRupiah(v) {
  if (!v && v !== 0) return '–'
  return `Rp ${Math.abs(v).toLocaleString('id-ID')}`
}

export default function Overview() {
  const [activeFilter, setActiveFilter] = useState('cycle')
  const [payDay, setPayDay] = useState(25)
  const [dateRange, setDateRange] = useState(getQuickFilterRange('cycle', 25))
  const [selectedCategories, setSelectedCategories] = useState([])
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteConfig, setDeleteConfig] = useState({ id: null, type: 'transaction' })
  const [allCategories, setAllCategories] = useState([])

  const touchStartRef = useRef(0)

  const { stats, loading: statsLoading, fetch: fetchStats, error: statsError } = useStats()
  const { stats: trendStats, loading: trendLoading, fetch: fetchTrendStats } = useStats()
  const { stats: stableStats, loading: stableStatsLoading, fetch: fetchStableStats } = useStats()
  const { transactions, loading: txLoading, fetch: fetchTx, error: txError, remove, update, add } = useTransactions()
  const { budgets, loading: budgetLoading, fetch: fetchBudgets, update: updateBudget, remove_budget: removeBudget, rename: renameBudget } = useBudgets()
  const { accounts, totalAssets, loading: accountLoading, upsertAccount, deleteAccount, refresh: refreshAccounts } = useAccounts()
  const { investments, totalPortfolio, totalCost, loading: investLoading, fetch: fetchInvestments, add: addInvestment, update: updateInvestment, remove: removeInvestment } = useInvestments()

  const loading = statsLoading || txLoading || budgetLoading || accountLoading || stableStatsLoading
  const error = statsError || txError

  const loadAll = useCallback(async (range, categories = [], filterKey) => {
    const cycleRange = getQuickFilterRange('cycle', payDay)

    // For components that should ONLY show today (Stats, Behavior, History)
    let strictRange = range
    if (filterKey === 'today') {
      strictRange = {
        startDate: dayjs().startOf('day').toISOString(),
        endDate: dayjs().endOf('day').toISOString()
      }
    }

    await Promise.all([
      fetchStats(strictRange?.startDate, strictRange?.endDate, categories),
      fetchTrendStats(range?.startDate, range?.endDate), // Original range for Trend
      fetchStableStats(cycleRange.startDate, cycleRange.endDate),
      fetchTx({ startDate: strictRange?.startDate, endDate: strictRange?.endDate, category: categories }),
      fetchBudgets({ startDate: cycleRange.startDate, endDate: cycleRange.endDate }),
      refreshAccounts(),
      fetchInvestments(),
    ])
  }, [fetchStats, fetchTrendStats, fetchStableStats, fetchTx, fetchBudgets, refreshAccounts, fetchInvestments, payDay])

  // Refresh data if global transaction is saved
  useEffect(() => {
    const handleGlobalRefresh = () => {
      loadAll(dateRange, selectedCategories, activeFilter)
    }
    window.addEventListener('transaction-saved', handleGlobalRefresh)
    return () => window.removeEventListener('transaction-saved', handleGlobalRefresh)
  }, [loadAll, dateRange, selectedCategories, activeFilter])

  // Initial loads
  useEffect(() => {
    async function init() {
      try {
        const [{ data: cycleData }, { data: catData }] = await Promise.all([
          configApi.getCycle(),
          statsApi.getCategories()
        ])
        const pd = cycleData.payDay || 25
        setPayDay(pd)
        setAllCategories(catData || [])

        // Update range with actual payday
        const initialRange = getQuickFilterRange('cycle', pd)
        setDateRange(initialRange)
        loadAll(initialRange, [], 'cycle')
      } catch (err) {
        console.error('Failed to init filters:', err)
        loadAll(dateRange, [], activeFilter)
      }
    }
    init()
  }, []) // Run once on mount

  const handleQuickFilter = (key) => {
    setActiveFilter(key)
    const range = getQuickFilterRange(key, payDay)
    setDateRange(range)
    setCustomRange({ start: '', end: '' }) // Reset custom range
    loadAll(range, selectedCategories, key)
  }

  const handleFilterTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX
  }

  const handleFilterTouchEnd = (e) => {
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStartRef.current - touchEnd
    if (Math.abs(diff) > 50) {
      const keys = QUICK_FILTERS.map(f => f.key)
      const idx = keys.indexOf(activeFilter)
      if (diff > 0 && idx < keys.length - 1) handleQuickFilter(keys[idx + 1])
      else if (diff < 0 && idx > 0) handleQuickFilter(keys[idx - 1])
    }
  }

  const handleCategoryToggle = (cat) => {
    const newCats = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat]
    setSelectedCategories(newCats)
    loadAll(dateRange, newCats, activeFilter)
  }

  const handleApplyCustomDate = () => {
    if (!customRange.start || !customRange.end) return
    setActiveFilter('custom')
    const range = {
      startDate: dayjs(customRange.start).startOf('day').toISOString(),
      endDate: dayjs(customRange.end).endOf('day').toISOString()
    }
    setDateRange(range)
    loadAll(range, selectedCategories, 'custom')
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadAll(dateRange, selectedCategories, activeFilter)
      toast.success('Data diperbarui')
    } catch (err) {
      toast.error('Gagal memperbarui data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDelete = (id) => {
    setDeleteConfig({ id, type: 'transaction' })
    setIsDeleteConfirmOpen(true)
  }

  const handleDeleteAccount = (id) => {
    setDeleteConfig({ id, type: 'account' })
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    const { id, type } = deleteConfig
    if (!id) return

    try {
      if (type === 'transaction') {
        await remove(id)
        toast.success('Transaksi dihapus')
      } else {
        const result = await deleteAccount(id)
        if (result.success) {
          toast.success('Akun berhasil dihapus')
          refreshAccounts()
        } else {
          toast.error('Gagal menghapus akun: ' + (result.error || 'Unknown error'))
        }
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menghapus data')
    }

    setIsDeleteConfirmOpen(false)
    setDeleteConfig({ id: null, type: 'transaction' })
  }

  const handleUpdate = async (id, data) => {
    try {
      await update(id, data)
      fetchStats(dateRange.startDate, dateRange.endDate, selectedCategories)
      toast.success('Transaksi diperbarui')
    } catch (err) {
      toast.error('Gagal memperbarui transaksi')
    }
  }

  // Build category breakdown for donut-style list
  const categoryEntries = stats?.categories
    ? Object.entries(stats.categories).sort((a, b) => b[1] - a[1])
    : []

  // Aggregate Behavior Data (Must, Need, Want, Saving)
  const behaviorStats = useMemo(() => {
    const totals = { Must: 0, Need: 0, Want: 0, Saving: 0 }
    if (!stats?.categories) return totals

    Object.entries(stats.categories).forEach(([cat, amount]) => {
      const actualAmount = Math.abs(amount || 0)
      if (actualAmount <= 0) return // Skip categories with no spending

      // Find mapping from budgets
      const budget = budgets.find(b => b.category === cat)
      const group = budget?.behavior_group || 'Want' // Default to Want for 'wild' spending

      if (totals[group] !== undefined) {
        totals[group] += actualAmount
      }
    })
    return totals
  }, [stats, budgets])

  // Calculate Budgeted Behavior Distribution (Target)
  const behaviorBudgets = useMemo(() => {
    const totals = { Must: 0, Need: 0, Want: 0, Saving: 0 }
    if (!budgets) return totals

    budgets.forEach(b => {
      const group = b.behavior_group || 'Want'
      const amount = parseFloat(b.amount) || 0
      if (totals[group] !== undefined) {
        totals[group] += amount
      }
    })
    return totals
  }, [budgets])

  const totalExpense = stats?.total_expense || 0
  const CATEGORY_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']

  // Compute dynamic dates for the UI pill
  let displayStart = dateRange.startDate;
  let displayEnd = dateRange.endDate;
  let isDynamicLoading = false;

  if (activeFilter === 'all') {
    if (transactions && transactions.length > 0) {
      displayStart = transactions[transactions.length - 1].transaction_date;
      displayEnd = transactions[0].transaction_date;
    } else if (txLoading) {
      isDynamicLoading = true;
    } else {
      displayStart = new Date();
      displayEnd = new Date();
    }
  }

  return (
    <div className="relative w-full">
      {/* ── Page Header & Advanced Filters ── */}
      <div className="animate-fade-in flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 mt-2">
        <div className="flex flex-wrap items-center gap-4 min-w-0">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-black text-slate-900 tracking-tight leading-none mb-2">
              Financial Overview
            </h1>
            <p className="text-slate-500 text-[11px] sm:text-sm font-medium uppercase tracking-wider">
              Insights & Analytics
            </p>
            <div className="flex items-center gap-1.5 mt-3 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg w-fit max-w-full transition-all hover:bg-emerald-100/60 cursor-default">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[0.7rem] font-bold uppercase tracking-wider truncate">
                {isDynamicLoading ? 'MENYESUAIKAN...' : `${dayjs(displayStart).format('D MMM')} – ${dayjs(displayEnd).format('D MMM YYYY')}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Quick Filters Widget */}
      <div className="sticky top-[0.5rem] z-40 mb-8 lg:static lg:mb-10 lg:z-auto">
        <div className="flex items-center bg-white/70 backdrop-blur-2xl p-1.5 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-1 w-full sm:w-fit">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            title="Refresh Data"
            className={cn(
              'w-9 h-9 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/50 flex items-center justify-center transition-all shrink-0 outline-none focus:outline-none',
              isRefreshing && 'animate-spin-slow text-emerald-600'
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>

          <div className="w-[1px] h-5 bg-slate-100 mx-1 sm:mx-2" />

          {/* Quick Pills */}
          <div
            onTouchStart={handleFilterTouchStart}
            onTouchEnd={handleFilterTouchEnd}
            className="flex-1 sm:flex-none flex items-center gap-1 sm:gap-1.5 min-w-0"
          >
            {QUICK_FILTERS.map(({ key, label, short }) => (
              <button
                key={key}
                onClick={() => handleQuickFilter(key)}
                className={cn(
                  'flex-1 sm:flex-none px-2 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[0.7rem] sm:text-[0.8rem] font-black transition-all duration-300 whitespace-nowrap min-w-0 sm:min-w-[90px] flex items-center justify-center',
                  activeFilter === key
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 scale-[1.02]'
                    : 'text-slate-500 hover:bg-slate-50 active:bg-slate-100'
                )}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="inline sm:hidden">{short}</span>
              </button>
            ))}
          </div>

          <div className="w-[1px] h-5 bg-slate-100 mx-1 sm:mx-2 hidden sm:block" />

          {/* Category Filter Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={cn(
                "p-2 rounded-xl transition-all flex items-center gap-1.5 outline-none focus:outline-none",
                selectedCategories.length > 0
                  ? "bg-amber-50 text-amber-600 border border-amber-100"
                  : "text-slate-400 hover:bg-slate-100/50 border border-transparent"
              )}>
                <Tag className="w-4 h-4" />
                {selectedCategories.length > 0 && (
                  <span className="text-[0.7rem] font-bold pr-1">{selectedCategories.length}</span>
                )}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-[220px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="px-3 py-2 border-b border-slate-50 flex items-center justify-between">
                  <span className="text-[0.7rem] font-black text-slate-400 uppercase tracking-wider">Kategori</span>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedCategories([]); loadAll(dateRange, []); }}
                      className="text-[0.65rem] font-bold text-red-500 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto no-scrollbar py-1">
                  {allCategories.map(cat => (
                    <DropdownMenu.Item
                      key={cat}
                      onSelect={(e) => e.preventDefault()}
                      onClick={() => handleCategoryToggle(cat)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-[0.8rem] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer outline-none transition-colors"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        selectedCategories.includes(cat) ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-200"
                      )}>
                        {selectedCategories.includes(cat) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </div>
                      {cat}
                    </DropdownMenu.Item>
                  ))}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Custom Date Range Popover */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={cn(
                "p-2 rounded-xl transition-all outline-none focus:outline-none",
                activeFilter === 'custom'
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "text-slate-400 hover:bg-slate-100/50 border border-transparent"
              )}>
                <Calendar className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-[280px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <h3 className="text-[0.8rem] font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Rentang Tanggal
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest pl-1">Mulai</label>
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[0.8rem] text-slate-600 outline-none focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest pl-1">Selesai</label>
                    <input
                      type="date"
                      value={customRange.end}
                      onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[0.8rem] text-slate-600 outline-none focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                </div>
                <button
                  onClick={handleApplyCustomDate}
                  className="w-full bg-slate-900 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-black transition-all shadow-lg shadow-black/10 active:scale-[0.98]"
                >
                  Terapkan Filter
                </button>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* ── 1. Section: Trend Chart + Budget Monitor ── */}
      <div className="animate-fade-in">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(320px,400px)] gap-8 mb-8">
          {/* Trend Chart */}
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent-subtle text-accent flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-[0.95rem] font-bold text-primary">Trend Keuangan</p>
                  <p className="text-[0.8rem] text-[#7da890] font-normal hidden sm:block">Income vs Pengeluaran</p>
                </div>
              </div>
              {/* Legend - Responsive Wrap */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
                {[['#10b981', 'Pemasukan'], ['#ef4444', 'Pengeluaran']].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#7da890]">
                    <span className="block w-[14px] h-[3px] rounded-full" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col" style={{ minHeight: 260 }}>
              <TrendChart
                dailyTrend={trendStats?.daily_trend}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                loading={trendLoading || statsLoading}
              />
            </div>
          </div>

          {/* Budget Monitor */}
          <div className="lg:col-span-1">
            <BudgetMonitor
              budgets={budgets}
              loading={budgetLoading}
              onOpenSettings={() => setIsBudgetModalOpen(true)}
            />
          </div>
        </div>

        {/* ── 2. Section: Metric Cards ── */}
        <MetricCards
          stats={{
            ...(stableStats || { total_income: 0, net_savings: 0 }),
            total_expense: stats?.total_expense || 0
          }}
          loading={loading}
        />

        {/* ── 3. Section: Account Portfolio ── */}
        <AccountPortfolio
          accounts={accounts}
          totalAssets={totalAssets}
          loading={accountLoading}
          onUpdate={async (data) => {
            const result = await upsertAccount(data)
            if (result.success) {
              toast.success(`Akun ${data.name || ''} berhasil disimpan`)
            } else {
              toast.error('Gagal menyimpan akun: ' + (result.error || 'Unknown error'))
            }
          }}
          onDelete={(id) => {
            setDeleteConfig({ id, type: 'account' })
            setIsDeleteConfirmOpen(true)
          }}
        />

        {/* ── 4. Section: Investment Portfolio ── */}
        <InvestmentSection
          investments={investments}
          totalPortfolio={totalPortfolio}
          totalCost={totalCost}
          loading={investLoading}
          onAdd={addInvestment}
          onUpdate={updateInvestment}
          onDelete={removeInvestment}
        />

        {/* ── 5. Section: Financial Goals ── */}
        <GoalsSection />

        {/* ── 6. Section: Transaction Analysis ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(400px,_max-content)_1fr] gap-8 mt-10 mb-2">
          {/* Left: Category Distribution Chart (Expanded) + Smart Analysis below it */}
          <div className="flex flex-col gap-8 h-full">
            <div className="bg-gradient-to-br from-white to-amber-50/40 backdrop-blur-xl border border-white rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-slate-200/40 transition-all duration-500 flex flex-col h-fit">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Analisis Kategori</h3>
                  <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mt-1">Detailed spending distribution</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <ExpenseCategoryChart
                  categories={stats?.categories || {}}
                  loading={statsLoading}
                />
              </div>
            </div>

            <BehaviorAnalysis
              data={behaviorStats}
              budgetData={behaviorBudgets}
              loading={statsLoading}
            />

            <SmartAnalysisPanel
              income={stableStats?.total_income || 0}
              totalExpense={stats?.total_expense || 0}
              payDay={payDay}
              categories={stats?.categories || {}}
              budgets={budgets}
              loading={statsLoading}
              className="flex-1"
            />
          </div>

          {/* Right: Transaction Table (Condensed) */}
          <div className="bg-gradient-to-br from-white to-blue-50/40 backdrop-blur-xl border border-white rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-slate-200/40 transition-all duration-500 flex flex-col xl:min-h-[600px] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                  <LayoutList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Riwayat</h3>
                  <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mt-1">History</p>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <TransactionTable
                transactions={transactions}
                loading={txLoading}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                categories={allCategories}
                accounts={accounts}
              />
            </div>
          </div>
        </div>

        {/* Budget Modal */}
        <BudgetModal
          open={isBudgetModalOpen}
          onOpenChange={setIsBudgetModalOpen}
          budgets={budgets}
          onSave={async (category, amount, behaviorGroup) => {
            try {
              const success = await updateBudget(category, amount, behaviorGroup)
              if (success) {
                const cycleRange = getQuickFilterRange('cycle', payDay)
                fetchBudgets({ startDate: cycleRange.startDate, endDate: cycleRange.endDate })
                fetchStats(dateRange.startDate, dateRange.endDate, selectedCategories)
                // Refresh category list
                const { data: catData } = await statsApi.getCategories()
                setAllCategories(catData || [])
                toast.success(`Budget ${category} disimpan`)
              } else {
                toast.error('Gagal menyimpan budget')
              }
              return success
            } catch (err) {
              toast.error('Terjadi kesalahan saat menyimpan')
              return false
            }
          }}
          onRemove={async (category) => {
            try {
              const success = await removeBudget(category)
              if (success) {
                const cycleRange = getQuickFilterRange('cycle', payDay)
                fetchBudgets({ startDate: cycleRange.startDate, endDate: cycleRange.endDate })
                fetchStats(dateRange.startDate, dateRange.endDate, selectedCategories)
                // Refresh category list
                const { data: catData } = await statsApi.getCategories()
                setAllCategories(catData || [])
                toast.success(`Budget ${category} dihapus`)
              } else {
                toast.error('Gagal menghapus budget')
              }
              return success
            } catch (err) {
              toast.error('Terjadi kesalahan saat menghapus')
              return false
            }
          }}
          onRename={async (oldName, newName) => {
            try {
              const success = await renameBudget(oldName, newName)
              if (success) {
                const cycleRange = getQuickFilterRange('cycle', payDay)
                fetchBudgets({ startDate: cycleRange.startDate, endDate: cycleRange.endDate })
                fetchStats(dateRange.startDate, dateRange.endDate, selectedCategories)
                // Refresh category list
                const { data: catData } = await statsApi.getCategories()
                setAllCategories(catData || [])
                toast.success(`Kategori diubah ke ${newName}`)
              } else {
                toast.error('Gagal mengubah kategori')
              }
              return success
            } catch (err) {
              toast.error('Terjadi kesalahan saat mengubah kategori')
              return false
            }
          }}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          title={deleteConfig.type === 'transaction' ? "Hapus Transaksi?" : "Hapus Akun Aset?"}
          description={
            deleteConfig.type === 'transaction'
              ? "Data transaksi ini akan dihapus permanen dari riwayat keuangan Anda. Lanjutkan?"
              : "Seluruh saldo dan riwayat yang terhubung dengan akun ini akan terhapus. Lanjutkan?"
          }
          confirmText={deleteConfig.type === 'transaction' ? "Ya, Hapus Data" : "Ya, Hapus Akun"}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  )
}
