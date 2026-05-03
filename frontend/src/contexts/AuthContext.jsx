import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1. Initial check
    checkSession()

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    } catch {
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email, password) => {
    const { success, user } = await authApi.login(email, password)
    if (success) setIsAuthenticated(true)
    return { success, user }
  }

  const register = async (email, password) => {
    const { success, user } = await authApi.signUp(email, password)
    if (success && user) setIsAuthenticated(true)
    return { success, user }
  }

  const loginWithGoogle = async () => {
    await authApi.signInWithGoogle()
  }

  const logout = async () => {
    await authApi.logout()
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06100a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-light border-t-transparent rounded-full animate-spin-slow" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
