import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TourContext = createContext();

export const TOUR_STEPS = [
  {
    id: 'tour-welcome',
    title: 'Selamat Datang!',
    content: 'Halo! Aku Yui, asisten finansial pribadimu. Yuk, aku tunjukin cara pakai dashboard ini biar kamu makin jago kelola uang!',
    route: '/'
  },
  {
    id: 'tour-filters',
    title: 'Quick Filters',
    content: 'Gunakan tombol ini untuk melihat ringkasan keuanganmu berdasarkan Hari ini, Minggu ini, atau Siklus Gajian (Bulanan).',
    route: '/'
  },
  {
    id: 'tour-trend',
    title: 'Tren Keuangan',
    content: 'Grafik ini menunjukkan pergerakan saldo, pemasukan, dan pengeluaranmu secara visual. Kamu bisa melihat tren keuanganmu naik atau turun di sini.',
    route: '/'
  },
  {
    id: 'tour-budgets',
    title: 'Budget Monitor',
    content: 'Pantau sisa budget bulananmu di sini. Ada indikator "Pace" yang kasih tahu apakah belanjamu terlalu cepat atau masih aman.',
    route: '/'
  },
  {
    id: 'tour-metrics',
    title: 'Ringkasan Angka',
    content: 'Di sini kamu bisa melihat total Pemasukan, Pengeluaran, dan Sisa Uang secara instan untuk periode yang kamu pilih.',
    route: '/'
  },
  {
    id: 'tour-assets',
    title: 'Aset & Portfolio',
    content: 'Semua saldo bank, dompet digital, hingga cash kamu tercatat di sini. Total kekayaan bersihmu dihitung otomatis.',
    route: '/'
  },
  {
    id: 'tour-invest',
    title: 'Investasi',
    content: 'Pantau pertumbuhan portofolio investasimu (Reksadana, Saham, Emas) langsung dari satu tempat.',
    route: '/'
  },
  {
    id: 'tour-categories',
    title: 'Analisis Kategori',
    content: 'Lihat pengeluaranmu paling banyak lari ke mana. Sangat berguna untuk mengevaluasi kebiasaan jajanmu!',
    route: '/'
  },
  {
    id: 'tour-insight',
    title: 'Yui Insight',
    content: 'Ini adalah fitur AI-ku! Aku akan memberikan analisis cerdas dan tips khusus berdasarkan perilaku keuanganmu.',
    route: '/'
  },
  {
    id: 'tour-history',
    title: 'Riwayat Transaksi',
    content: 'Catatan lengkap semua transaksi keluar-masuk. Kamu bisa edit, hapus, atau filter transaksi di sini.',
    route: '/'
  },
  {
    id: 'tour-nav-chat',
    title: 'Tanya Yui AI',
    content: 'Butuh bantuan lebih detail? Klik di sini untuk ngobrol langsung sama aku tentang apapun soal keuanganmu.',
    route: '/'
  },
  {
    id: 'tour-nav-profile',
    title: 'Pengaturan & Profil',
    content: 'Kelola data diri, ganti tema, atau atur preferensi akunmu di menu ini.',
    route: '/'
  },
  {
    id: 'tour-finish',
    title: 'Siap Beraksi!',
    content: 'Sekarang kamu sudah siap menguasai keuanganmu! Kalau butuh bantuan lagi, klik icon bintang di atas ya. Semangat!',
    route: '/'
  }
];

export function TourProvider({ children }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    if (location.pathname !== '/') {
      navigate('/');
    }
  }, [navigate, location.pathname]);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    const nextIdx = currentStep + 1;
    if (nextIdx < TOUR_STEPS.length) {
      const nextStepData = TOUR_STEPS[nextIdx];
      
      // Auto-navigate if route changes
      if (nextStepData.route && location.pathname !== nextStepData.route) {
        navigate(nextStepData.route);
      }
      
      setCurrentStep(nextIdx);
    } else {
      endTour();
    }
  }, [currentStep, endTour, navigate, location.pathname]);

  const prevStep = useCallback(() => {
    const prevIdx = currentStep - 1;
    if (prevIdx >= 0) {
      const prevStepData = TOUR_STEPS[prevIdx];
      if (prevStepData.route && location.pathname !== prevStepData.route) {
        navigate(prevStepData.route);
      }
      setCurrentStep(prevIdx);
    }
  }, [currentStep, navigate, location.pathname]);

  return (
    <TourContext.Provider value={{ 
      isActive, 
      currentStep, 
      steps: TOUR_STEPS, 
      startTour, 
      endTour, 
      nextStep, 
      prevStep 
    }}>
      {children}
    </TourContext.Provider>
  );
}

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
