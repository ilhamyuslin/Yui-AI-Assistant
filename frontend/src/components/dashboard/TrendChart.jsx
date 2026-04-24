import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

function formatRupiah(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return String(v)
}

export default function TrendChart({ dailyTrend, loading }) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[#94a3b8] min-h-[220px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-bold tracking-widest uppercase text-[10px]">Menyiapkan Grafik...</span>
        </div>
      </div>
    )
  }

  if (!dailyTrend || Object.keys(dailyTrend).length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[#94a3b8] min-h-[220px] font-bold">
        Belum ada data untuk dirender
      </div>
    )
  }

  const labels = Object.keys(dailyTrend).map(d => {
    const parts = d.split('-')
    return parts[2] // Day number
  })

  const incomeData  = Object.values(dailyTrend).map(d => d.income)
  const expenseData = Object.values(dailyTrend).map(d => d.expense)

  const data = {
    labels,
    datasets: [
      {
        label: 'Pemasukan',
        data: incomeData,
        borderColor: '#10b981', // Emerald 500
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'rgba(16, 185, 129, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.45, // Sleek bezier curve
        pointRadius: 0, // Clean line without dots
        pointHoverRadius: 7, // Big dot on hover
        pointBackgroundColor: '#fff',
        pointBorderColor: '#10b981',
        pointBorderWidth: 3,
        borderWidth: 3.5,
        borderJoinStyle: 'round',
        borderCapStyle: 'round',
      },
      {
        label: 'Pengeluaran',
        data: expenseData,
        borderColor: '#f43f5e', // Rose 500
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'rgba(244, 63, 94, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
          gradient.addColorStop(1, 'rgba(244, 63, 94, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.45,
        pointRadius: 0,
        pointHoverRadius: 7,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#f43f5e',
        pointBorderWidth: 3,
        borderWidth: 3.5,
        borderJoinStyle: 'round',
        borderCapStyle: 'round',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { 
      mode: 'index', 
      intersect: false 
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)', // Slate 900 Glass
        titleColor: '#94a3b8',
        titleFont: { size: 11, family: 'Plus Jakarta Sans', weight: '800' },
        bodyColor: '#f8fafc',
        bodyFont: { size: 13, family: 'Plus Jakarta Sans', weight: '700' },
        padding: 16,
        cornerRadius: 16,
        displayColors: true,
        boxPadding: 8,
        usePointStyle: true,
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        caretSize: 6,
        callbacks: {
          title: (ctx) => `Tanggal ${ctx[0].label}`,
          label: (ctx) => ` ${ctx.dataset.label}: Rp ${ctx.parsed.y.toLocaleString('id-ID')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, family: 'Plus Jakarta Sans', weight: '700' },
          maxRotation: 0,
          padding: 12,
        },
      },
      y: {
        beginAtZero: true,
        grid: { 
          color: 'rgba(0,0,0,0.04)', 
          drawBorder: false, 
          tickLength: 0,
          borderDash: [5, 5] // Dashed sleek grid
        },
        border: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, family: 'Plus Jakarta Sans', weight: '700' },
          padding: 16,
          callback: (v) => formatRupiah(v),
          maxTicksLimit: 6,
        },
      },
    },
  }

  return (
    <div className="flex-1 min-h-[180px] relative mt-2">
      <Line data={data} options={options} />
    </div>
  )
}

