import { useState, useEffect, Suspense, lazy } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Plus, LogOut, AlertTriangle, HelpCircle } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useFinancial'
import { useCategories } from '@/hooks/useCategories'
import { useTour } from '@/context/TourContext'
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
      {
        to: '/chat',
        label: 'Yui AI',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Pengaturan',
    items: [
      {
        to: '/profile',
        label: 'Profile',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
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
  {
    section: 'Administrator',
    adminOnly: true,
    items: [
      {
        to: '/admin/users',
        label: 'User Management',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
]

export default function DashboardLayout() {
  const { profile, logout } = useAuth()
  const { startTour } = useTour()
  const navigate = useNavigate()
  
  const filteredNavItems = NAV_ITEMS.filter(section => {
    if (section.adminOnly && profile?.role !== 'admin') return false
    return true
  })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isNavigationBlocked, setIsNavigationBlocked] = useState(false)

  const { accounts, refresh: refreshAccounts } = useAccounts()
  const { categories, refresh: refreshCategories } = useCategories()
  const { add } = useTransactions()

  const handleSaveTransaction = async (data) => {
    try {
      await add(data)
      toast.success('Transaksi berhasil disimpan')
      await refreshAccounts()
      await refreshCategories()
      setIsTransactionModalOpen(false)
      // Signal pages to refresh data
      window.dispatchEvent(new CustomEvent('transaction-saved'))
    } catch (err) {
      toast.error('Gagal menyimpan transaksi')
      console.error(err)
    }
  }

  const handleLogout = async () => {
    setShowLogoutModal(true)
  }

  const [viewportHeight, setViewportHeight] = useState(window.innerHeight)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const location = useLocation()
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'
  const isChat = location.pathname === '/chat'

  // Detect keyboard visibility and viewport height on mobile
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      setViewportHeight(vv.height);
      const isCurrentlyOpen = vv.height < window.innerHeight * 0.85;
      setIsKeyboardOpen(isCurrentlyOpen);

      // Force no scroll
      if (isCurrentlyOpen) {
        window.scrollTo(0, 0);
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    }
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 overflow-hidden bg-[#fafafa] flex flex-col lg:flex-row"
      style={{ height: `${viewportHeight}px` }}
    >

      {/* ── Premium Light Background ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-emerald-50/50" />
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-200/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
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
        <div className={cn(
          "pt-8 pb-6 relative flex-shrink-0 transition-all duration-300",
          collapsed ? "px-0" : "px-6"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            collapsed ? "flex-col gap-6" : "justify-between"
          )}>
            <div className={cn(
              "flex items-center transition-all duration-300",
              collapsed ? "gap-0 mx-auto" : "gap-4"
            )}>
              <div className="w-[42px] h-[42px] rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-[0_8px_16px_rgba(16,185,129,0.2)] transition-all duration-500"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  transform: collapsed ? 'scale(0.85)' : 'scale(1)'
                }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className={cn('overflow-hidden transition-all duration-500', collapsed ? 'opacity-0 w-0 invisible' : 'opacity-100 w-auto')}>
                <span className="block text-lg font-black text-slate-900 tracking-tight leading-tight whitespace-nowrap">Yui AI</span>
                <span className="block text-[0.6rem] font-black text-emerald-600/60 uppercase tracking-[0.2em] mt-1 whitespace-nowrap">Financial Agent</span>
              </div>
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "hidden lg:flex items-center justify-center rounded-xl transition-all duration-300 group/toggle",
                collapsed
                  ? "w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-200 shadow-sm"
                  : "w-8 h-8 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                className={cn('transition-transform duration-500', collapsed && 'rotate-180')}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 pt-4 flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
          {filteredNavItems.map((section) => (
            <div key={section.section} className="mb-4">
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
                    'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[0.85rem] font-bold transition-all duration-300 relative overflow-hidden whitespace-nowrap group',
                    isActive
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                    collapsed && 'justify-center px-0 w-[48px] mx-auto',
                    isNavigationBlocked && 'opacity-50 pointer-events-none cursor-not-allowed'
                  )}
                  id={item.to === '/chat' ? 'tour-nav-chat-desktop' : item.to === '/profile' ? 'tour-nav-profile-desktop' : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn(
                        "w-5 h-5 flex-shrink-0 flex items-center justify-center transition-all duration-300",
                        "group-hover:text-emerald-600 group-hover:scale-110"
                      )}>
                        {item.icon}
                      </span>
                      <span className={cn('overflow-hidden transition-all duration-500', collapsed ? 'opacity-0 w-0 invisible' : 'opacity-100 w-auto')}>
                        {item.label}
                      </span>
                      {isActive && !collapsed && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r-full transition-all duration-300" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn(
          "p-4 pb-8 border-t border-slate-100 flex-shrink-0 flex flex-col gap-2 transition-all duration-300",
          collapsed ? "items-center" : "items-stretch"
        )}>
          <div className={cn(
            'flex items-center transition-all duration-300',
            collapsed
              ? 'justify-center w-11 h-11 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm shadow-emerald-500/5'
              : 'gap-3 px-4 py-3 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl overflow-hidden whitespace-nowrap'
          )}>
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-emerald-500/20 blur-sm rounded-full animate-pulse" />
              <div className="relative w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <span className={cn('text-[0.7rem] font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-500', collapsed ? 'opacity-0 w-0 invisible' : 'opacity-100 w-auto')}>
              Online
            </span>
          </div>

          <div className="w-full h-[1px] bg-slate-100 my-2" />

          {/* Product Tour Trigger */}
          <button
            onClick={() => {
              if (mobileOpen) setMobileOpen(false)
              startTour()
            }}
            className={cn(
              'flex items-center rounded-2xl text-[0.8rem] font-bold text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/50 transition-all text-left whitespace-nowrap overflow-hidden group',
              collapsed
                ? 'justify-center w-10 h-10'
                : 'gap-3.5 w-full px-4 py-3',
            )}
          >
            <HelpCircle size={18} strokeWidth={2.5}
              className="flex-shrink-0 transition-transform duration-300 group-hover:rotate-12" />
            <span className={cn('transition-all duration-500', collapsed ? 'opacity-0 w-0 invisible' : 'opacity-100 w-auto')}>Pelajari Fitur</span>
          </button>

          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center rounded-2xl text-[0.8rem] font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all text-left whitespace-nowrap overflow-hidden group',
              collapsed
                ? 'justify-center w-10 h-10'
                : 'gap-3.5 w-full px-4 py-3',
              isNavigationBlocked && 'opacity-50 pointer-events-none'
            )}
            disabled={isNavigationBlocked}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="flex-shrink-0 transition-transform duration-300 group-hover:translate-x-0.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className={cn('transition-all duration-500', collapsed ? 'opacity-0 w-0 invisible' : 'opacity-100 w-auto')}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 relative z-10 flex flex-col h-full overflow-hidden bg-transparent">
        {/* Mobile top bar (Floating Island Style - Top) */}
        <div
          className="lg:hidden fixed top-4 left-4 right-4 z-50 flex items-center justify-between px-5 py-2.5 bg-white/70 backdrop-blur-3xl rounded-full border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center gap-3">
            <span className="text-slate-900 font-black text-[10px] uppercase tracking-[0.15em]">Yui AI</span>
            <div className="w-[1px] h-3 bg-slate-200/50" />
            <span className="text-emerald-600/60 font-bold text-[0.5rem] uppercase tracking-widest mt-0.5 whitespace-nowrap overflow-hidden">Financial Dashboard</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startTour}
              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-all duration-300"
              title="Pelajari Fitur"
            >
              <HelpCircle size={18} strokeWidth={2.5} />
            </button>
            <NavLink
              to="/config"
              className={({ isActive }) => cn(
                "p-2 rounded-full transition-all duration-300",
                isActive ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:bg-slate-50"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </NavLink>
            <button
              onClick={handleLogout}
              className="p-2 text-rose-300/80 hover:bg-rose-50 rounded-full transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Page content - Fixed viewport for Chat, Scrollable for others */}
        <main className={cn(
          "flex-1 relative min-h-0 bg-transparent lg:pt-0 lg:pb-0 transition-all duration-300 overscroll-none",
          !isKeyboardOpen ? "pt-[71px] pb-16" : "pt-[71px] pb-0",
          isChat ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden no-scrollbar"
        )}>
          <div className={cn(
            "max-w-[1600px] w-full mx-auto h-full",
            !isChat ? "p-6 md:p-10" : "p-0"
          )}>
            <Outlet context={{ setIsNavigationBlocked }} />
          </div>
        </main>

        {/* ── Mobile Floating Island Navigation ── */}
        <nav className={cn(
          "lg:hidden fixed bottom-5 left-6 right-6 z-[100] bg-white/70 backdrop-blur-3xl rounded-[2.5rem] px-3 py-2.5 shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-white/50 transition-all duration-500",
          isKeyboardOpen ? "translate-y-32 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        )}>
          <div className="flex items-center justify-around">
            {(() => {
              const allItems = filteredNavItems.flatMap(section => section.items)
              // Ensure we show up to 3 items for mobile, or whatever is available
              const mobileItems = allItems.slice(0, 3)

              return mobileItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-500",
                    isActive
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50",
                    isNavigationBlocked && 'opacity-50 pointer-events-none cursor-not-allowed'
                  )}
                  id={item.to === '/chat' ? 'tour-nav-chat-mobile' : item.to === '/profile' ? 'tour-nav-profile-mobile' : undefined}
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

        {/* Global Floating Transaction Widget */}
        {isDashboard && (
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className={cn(
              "fixed bottom-[90px] lg:bottom-[34px] left-1/2 -translate-x-1/2 z-[110] group flex items-center gap-2.5 p-1.5 pr-5 bg-white/40 backdrop-blur-3xl border border-white/50 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:shadow-emerald-200/40 hover:scale-105 active:scale-95 transition-all duration-500",
              isNavigationBlocked && 'opacity-50 pointer-events-none scale-95 grayscale'
            )}
            disabled={isNavigationBlocked}
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
              categories={categories}
              onSave={handleSaveTransaction}
            />
          )}
        </Suspense>
      </div>

      {/* ── Custom Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
            onClick={() => setShowLogoutModal(false)} />

          {/* Modal Content */}
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-rose-500/10 border border-rose-50 animate-scale-in flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
              <div className="w-14 h-14 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-500/40">
                <AlertTriangle size={28} />
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-3">Yakin mau keluar?</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
              Kamu akan keluar dari sesi Yui AI. Semua data tetap aman tersimpan.
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={async () => {
                  setShowLogoutModal(false)
                  const toastId = toast.loading('Keluar dari sistem...')
                  await logout()
                  toast.dismiss(toastId)
                  navigate('/login')
                }}
                className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-rose-200 active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                YA, KELUAR SEKARANG
              </button>

              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 text-sm font-black rounded-2xl transition-all active:scale-95"
              >
                BATAL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
