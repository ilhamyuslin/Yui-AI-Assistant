import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

// Inisialisasi Memori Pusat (Query Client)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // Data dianggap "fresh" selama 5 menit
      gcTime: 1000 * 60 * 30,       // Data disimpan di cache selama 30 menit
      retry: 1,                    // Coba lagi 1x kalau gagal
      refetchOnWindowFocus: false, // Jangan refresh otomatis pas pindah tab (biar irit database)
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
