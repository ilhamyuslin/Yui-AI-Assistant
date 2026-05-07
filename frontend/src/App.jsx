import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import Overview from '@/pages/Overview'
import Config from '@/pages/Config'
import Chat from '@/pages/Chat'
import Profile from '@/pages/Profile'

import Onboarding from '@/pages/Onboarding'

function PrivateRoute({ children }) {
  const { isAuthenticated, profile } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // If user is authenticated but not onboarded, redirect to onboarding
  // but allow them to stay on the onboarding page
  if (profile && !profile.is_onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  // If user IS onboarded but tries to access onboarding, send them home
  if (profile?.is_onboarded && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, profile } = useAuth()

  if (isAuthenticated) {
    if (profile && !profile.is_onboarded) return <Navigate to="/onboarding" replace />
    return <Navigate to="/" replace />
  }

  return children
}

import { Toaster } from 'sonner'
import { TourProvider } from '@/context/TourContext'
import ProductTour from '@/components/dashboard/ProductTour'

export default function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <TourProvider>
          <ProductTour />
          <Routes>
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />
          <Route path="/onboarding" element={
            <PrivateRoute>
              {/* Special case: Onboarding checks its own profile state */}
              <Onboarding />
            </PrivateRoute>
          } />
          <Route path="/" element={
            <PrivateRoute><DashboardLayout /></PrivateRoute>
          }>
            <Route index element={<Overview />} />
            <Route path="config" element={<Config />} />
            <Route path="chat" element={<Chat />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </TourProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
