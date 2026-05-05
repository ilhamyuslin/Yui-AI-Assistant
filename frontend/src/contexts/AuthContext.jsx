import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1. Initial check
    checkSession()

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthDebug] Event:', event)
      setIsAuthenticated(!!session)
      
      if (session?.user) {
        // JANGAN DI-AWAIT! INI SUMBER DEADLOCK!
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      
      // Paksa loading berhenti biar gak gantung
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setProfile(data)
        // Sync ke TanStack Query jika perlu
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
    } catch {
      setIsAuthenticated(false)
    } finally {
      // Pastikan loading berhenti di sini jika listener nggak kepicu
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  const login = async (email, password) => {
    const { success, user } = await authApi.login(email, password)
    if (success) {
      setIsAuthenticated(true)
      await fetchProfile(user.id)
    }
    return { success, user }
  }

  const register = async (email, password) => {
    const { success, user } = await authApi.signUp(email, password)
    if (success && user) {
      setIsAuthenticated(true)
      await fetchProfile(user.id)
    }
    return { success, user }
  }

  const loginWithGoogle = async () => {
    await authApi.signInWithGoogle()
  }

  const logout = async () => {
    await authApi.logout()
    setIsAuthenticated(false)
    setProfile(null)
  }

  const reauthenticate = async (password) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password
    })
    if (error) throw new Error('Password lama salah!')
    return true
  }

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (error) throw error
    return data
  }

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) await fetchProfile(session.user.id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06100a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, profile, login, register, loginWithGoogle, logout, reauthenticate, updatePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
