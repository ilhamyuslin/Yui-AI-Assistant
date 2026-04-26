import { useState, Suspense, lazy } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useFinancial'
import { toast } from 'sonner'

const TransactionModal = lazy(() => import('@/components/dashboard/TransactionModal'))

const NAV_ITEMS = [
  {
    section: 'Menu Utama',
    items: [
      {
        to: '/',
        end: true,
        label: 'Dashboard',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Bot & Konfigurasi',
    items: [
      {
        to: '/status',
        label: 'Status',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6" /><path d="M9 12h6" /><path d="M9 15h4" />
          </svg>
        ),
      },
      {
        to: '/config',
        label: 'Konfigurasi',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
]

export default function DashboardLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)

  const { accounts, refresh: refreshAccounts } = useAccounts()
  const { add } = useTransactions()

  const handleSaveTransaction = async (data) => {
    try {
      await add(data)
      toast.success('Transaksi berhasil disimpan')
      await refreshAccounts()
      setIsTransactionModalOpen(false)
      // Signal pages to refresh data
      window.dispatchEvent(new CustomEvent('transaction-saved'))
    } catch (err) {
      toast.error('Gagal menyimpan transaksi')
      console.error(err)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const location = useLocation()
  const isDashboard = location.pathname === '/'

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-transparent selection:bg-emerald-500/10 selection:text-emerald-700">

      {/* ── Premium Light Background ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Subtle Gradient Base - More vibrant to avoid 'stark white' look */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-emerald-50/50" />

        {/* Soft Ambient Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-200/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Modern Grid overlay */}
        <div className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />

        {/* Futuristic AI HUD Elements */}
        <div className="absolute top-10 right-10 text-emerald-900/[0.04] font-mono text-sm tracking-[0.5em] select-none pointer-events-none">
          SYS.YUI.AI // V.3.0.1 // ACTIVE
        </div>
        <div className="absolute bottom-10 left-10 text-emerald-900/[0.04] font-mono text-xs tracking-widest select-none pointer-events-none rotate-[-90deg] origin-bottom-left">
          NEURAL_ENGINE: OPTIMIZED
        </div>
        <div className="absolute top-1/2 left-10 text-emerald-900/[0.04] font-mono text-xs tracking-[0.2em] select-none pointer-events-none rotate-[-90deg] origin-bottom-left">
          DATA_STREAM_01
        </div>
        <div className="absolute bottom-10 right-10 text-emerald-900/[0.03] font-mono text-[8rem] font-black tracking-tighter select-none pointer-events-none leading-none">
          01
        </div>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] border border-emerald-900/[0.02] rounded-full select-none pointer-events-none flex items-center justify-center">
          <div className="w-[300px] h-[300px] border border-emerald-900/[0.02] rounded-full border-dashed"></div>
        </div>

        {/* Additional HUD Details */}
        <div className="absolute top-20 left-20 text-emerald-900/[0.06] font-mono text-2xl select-none pointer-events-none leading-none">+</div>
        <div className="absolute bottom-20 right-20 text-emerald-900/[0.06] font-mono text-2xl select-none pointer-events-none leading-none">+</div>

        <div className="absolute top-1/3 right-12 text-emerald-900/[0.03] font-mono text-[0.6rem] tracking-[0.2em] select-none pointer-events-none rotate-90 origin-top-right whitespace-nowrap">
          01011001 01010101 01001001 // SYNC
        </div>

        <div className="absolute bottom-32 left-1/3 w-[250px] h-[1px] bg-emerald-900/[0.05] select-none pointer-events-none flex justify-between">
          <div className="w-[1px] h-2 bg-emerald-900/[0.05] -mt-[0.5px]"></div>
          <div className="w-[1px] h-2 bg-emerald-900/[0.05] -mt-[0.5px]"></div>
          <div className="w-[1px] h-2 bg-emerald-900/[0.05] -mt-[0.5px]"></div>
          <div className="w-[1px] h-2 bg-emerald-900/[0.05] -mt-[0.5px]"></div>
          <div className="w-[1px] h-3 bg-emerald-900/[0.05] -mt-[1px]"></div>
        </div>

        <div className="absolute top-40 left-32 text-emerald-900/[0.03] font-mono text-[3rem] font-bold select-none pointer-events-none leading-none tracking-tighter">
          X-99
        </div>
      </div>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed lg:relative z-50 lg:z-auto flex flex-col h-full bg-white/70 backdrop-blur-2xl border-r border-white/40 transition-all duration-300 overflow-hidden flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]',
          collapsed ? 'w-[76px]' : 'w-[280px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-6 relative flex-shrink-0">
          <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
            {/* Logo icon */}
            <div className="w-[42px] h-[42px] rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-[0_8px_16px_rgba(16,185,129,0.2)]"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            {/* Logo text */}
            <div className={cn('overflow-hidden transition-all duration-300', collapsed ? 'opacity-0 w-0' : 'opacity-100')}>
              <span className="block text-lg font-black text-slate-900 tracking-tight leading-tight whitespace-nowrap">Yui AI</span>
              <span className="block text-[0.6rem] font-black text-emerald-600/60 uppercase tracking-[0.2em] mt-1 whitespace-nowrap">Financial Agent</span>
            </div>
          </div>

          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-10 w-6 h-6 bg-white/80 backdrop-blur-md border border-white/50 shadow-sm rounded-full items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-200 transition-all z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              className={cn('transition-transform duration-300', collapsed && 'rotate-180')}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 pt-4 flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((section) => (
            <div key={section.section} className="mb-4">
              {/* Section label */}
              <p className={cn(
                'text-[0.6rem] font-black uppercase tracking-[0.25em] text-slate-400 px-4 py-2 mb-1 transition-all duration-300 overflow-hidden whitespace-nowrap',
                collapsed ? 'opacity-0 max-h-0 py-0' : 'opacity-100 max-h-10'
              )}>
                {section.section}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[0.85rem] font-bold transition-all duration-200 relative overflow-hidden whitespace-nowrap group',
                    isActive
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                    collapsed && 'justify-center px-0 w-[50px] mx-auto',
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 flex-shrink-0 flex items-center justify-center transition-colors",
                    "group-hover:text-emerald-600"
                  )}>
                    {item.icon}
                  </span>
                  <span className={cn('overflow-hidden transition-all duration-300', collapsed ? 'opacity-0 w-0' : 'opacity-100')}>
                    {item.label}
                  </span>
                  {/* Active Indicator Bar */}
                  {item.to === window.location.pathname && (
                    <div className={cn(
                      "absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r-full transition-all duration-300",
                      collapsed && "hidden"
                    )} />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 pb-8 border-t border-slate-100 flex-shrink-0 flex flex-col gap-2">
          {/* Bot status pill */}
          <div className={cn(
            'flex items-center gap-3 px-4 py-3 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl overflow-hidden whitespace-nowrap',
            collapsed && 'justify-center px-0 w-[50px] mx-auto'
          )}>
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-emerald-500/20 blur-sm rounded-full animate-pulse" />
              <div className="relative w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <span className={cn('text-[0.7rem] font-bold text-emerald-600/60 uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-300', collapsed && 'opacity-0 w-0')}>
              System Online
            </span>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3.5 w-full px-4 py-3 rounded-2xl text-[0.8rem] font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all text-left whitespace-nowrap overflow-hidden',
              collapsed && 'justify-center px-0 w-[50px] mx-auto'
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className={cn('transition-all duration-300', collapsed && 'opacity-0 w-0')}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 relative z-10 overflow-hidden bg-transparent">
        {/* Mobile top bar (Floating Island Style - Top) */}
        <div
          className="lg:hidden fixed top-4 left-6 right-6 z-50 flex items-center justify-between px-6 py-3 bg-white/70 backdrop-blur-3xl rounded-full border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center gap-3">
            <span className="text-slate-900 font-black text-xs uppercase tracking-[0.15em]">Yui AI</span>
            <div className="w-[1px] h-3 bg-slate-200/50" />
            <span className="text-emerald-600/60 font-bold text-[0.55rem] uppercase tracking-widest mt-0.5 whitespace-nowrap overflow-hidden">Financial Dashboard</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        {/* Page content - Scrollable */}
        <main className="h-full overflow-y-auto overflow-x-hidden no-scrollbar bg-transparent pt-[71px] pb-16 lg:pt-0 lg:pb-0">
          <div className="p-6 md:p-10 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </div>
        </main>

        {/* ── Mobile Floating Island Navigation (Premium 2026 Light Glass) ── */}
        <nav className="lg:hidden fixed bottom-5 left-6 right-6 z-[100] bg-white/70 backdrop-blur-3xl rounded-[2.5rem] px-3 py-2.5 shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-white/50">
          <div className="flex items-center justify-around">
            {(() => {
              const allItems = NAV_ITEMS.flatMap(section => section.items)
              // Custom order for mobile: [Status, Dashboard, Config]
              const mobileItems = [allItems[1], allItems[0], allItems[2]]

              return mobileItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-500",
                    isActive
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn(
                        "transition-transform duration-300",
                        isActive ? "scale-110" : "scale-100"
                      )}>
                        {item.icon}
                      </span>
                      {isActive && (
                        <span className="text-[0.7rem] font-black uppercase tracking-wider animate-in slide-in-from-left-2 duration-300">
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))
            })()}
          </div>
        </nav>

        {/* Global Floating Transaction Widget (Centered Glass Style) */}
        {isDashboard && (
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="fixed bottom-[90px] lg:bottom-[34px] left-1/2 -translate-x-1/2 z-[110] group flex items-center gap-2.5 p-1.5 pr-5 bg-white/40 backdrop-blur-3xl border border-white/50 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:shadow-emerald-200/40 hover:scale-105 active:scale-95 transition-all duration-500"
          >
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg group-hover:rotate-90 transition-transform duration-500">
              <Plus size={18} strokeWidth={3} />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Add New</span>
              <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500/80">Transaction</span>
            </div>
          </button>
        )}

        <Suspense fallback={null}>
          {isTransactionModalOpen && (
            <TransactionModal
              open={isTransactionModalOpen}
              onOpenChange={setIsTransactionModalOpen}
              accounts={accounts}
              categories={['Makan & Minum', 'Belanja Bulanan', 'Transportasi', 'Tagihan & Utilitas', 'Kesehatan', 'Hiburan', 'Sedekah & Hadiah', 'Lainnya']}
              onSave={handleSaveTransaction}
            />
          )}
        </Suspense>
      </div>
    </div>
  )
}
