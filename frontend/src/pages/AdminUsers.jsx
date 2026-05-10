import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { 
  Users, 
  Search, 
  UserPlus, 
  Trash2, 
  Mail, 
  Shield, 
  ChevronRight,
  MoreHorizontal,
  UserCheck,
  UserX,
  Clock,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminUsers() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  // Fetch users from our new admin API
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession())
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setUsers(data.users || [])
    } catch (err) {
      toast.error('Gagal mengambil data user: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [users, searchQuery])

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.is_onboarded).length,
      pending: users.filter(u => !u.is_onboarded).length
    }
  }, [users])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail) return
    
    setIsInviting(true)
    try {
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession())
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      toast.success('Undangan berhasil dikirim ke ' + inviteEmail)
      setInviteEmail('')
      setIsInviteModalOpen(false)
      fetchUsers() // Refresh list
    } catch (err) {
      toast.error('Gagal mengirim undangan: ' + err.message)
    } finally {
      setIsInviting(false)
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user ${userEmail}? Tindakan ini tidak bisa dibatalkan.`)) return

    try {
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession())
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      toast.success('User berhasil dihapus')
      fetchUsers()
    } catch (err) {
      toast.error('Gagal menghapus user: ' + err.message)
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Memuat Data User...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full pb-32 lg:pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 mt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-black text-slate-900 tracking-tight leading-none mb-3">
            User Access Management
          </h1>
          <p className="text-slate-500 text-[11px] sm:text-sm font-medium uppercase tracking-wider">
            Kontrol Akses, Pantau Pengguna & Kelola Izin
          </p>
        </div>

        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
        >
          <UserPlus size={18} />
          INVITE NEW USER
        </button>
      </div>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Active (Onboarded)', value: stats.active, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Access', value: stats.pending, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50' }
        ].map((s, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-xl border border-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center gap-5">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", s.bg, s.color)}>
              <s.icon size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Container ── */}
      <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative group flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Cari user berdasarkan nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:border-emerald-500/30 focus:bg-white rounded-2xl text-sm font-bold text-slate-800 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
             <button 
               onClick={fetchUsers}
               className="p-3 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
               title="Refresh Data"
             >
               <Clock size={20} />
             </button>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role & Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Join Date</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Users size={32} />
                      </div>
                      <p className="text-slate-400 font-bold text-sm">Tidak ada user ditemukan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                          {u.nickname ? u.nickname.substring(0, 2).toUpperCase() : '??'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate">{u.full_name || u.nickname || 'Unnamed User'}</p>
                          <p className="text-slate-400 text-xs font-medium truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                           <span className={cn(
                             "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                             u.role === 'admin' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                           )}>
                             {u.role || 'user'}
                           </span>
                           {u.is_onboarded ? (
                             <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-wider">
                               <UserCheck size={10} /> Active
                             </span>
                           ) : (
                             <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                               <Clock size={10} /> Pending
                             </span>
                           )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-bold text-slate-600">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </p>
                      <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">
                        Last seen: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Invite Modal ── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setIsInviteModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Invite User</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Kirim Undangan Akses</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alamat Email</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input 
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl text-[13px] font-bold text-slate-800 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3">
                <Shield size={18} className="text-amber-600 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700/80 leading-relaxed uppercase tracking-tighter">
                  User akan menerima link aktivasi melalui email. Setelah login, mereka akan diarahkan ke proses onboarding.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-4 bg-slate-50 text-slate-600 text-xs font-black rounded-2xl hover:bg-slate-100 transition-all active:scale-95"
                >
                  BATAL
                </button>
                <button 
                  type="submit"
                  disabled={isInviting}
                  className="flex-[2] py-4 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
                >
                  {isInviting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      MENGIRIM...
                    </>
                  ) : (
                    <>KIRIM UNDANGAN</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
