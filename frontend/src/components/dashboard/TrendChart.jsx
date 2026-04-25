import { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import dayjs from 'dayjs'

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Filler, Tooltip, Legend)

function formatRupiah(v) {
  if (v === 0) return '0'
  // Handle log scale ticks that might be powers of 10
  const absV = Math.abs(v)
  if (absV >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
  if (absV >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return String(v)
}

export default function TrendChart({ dailyTrend, startDate, endDate, loading }) {
  const [isLogScale, setIsLogScale] = useState(false)

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

  // Pre-process data to fill missing dates
  const trendData = dailyTrend || {}
  const chartLabels = []
  const incomeValues = []
  const expenseValues = []

  // If we have a range, fill all dates in between
  if (startDate && endDate) {
    let current = dayjs(startDate).startOf('day')
    const end = dayjs(endDate).startOf('day')

    // Safety break to prevent infinite loop (max 400 days)
    let count = 0
    while ((current.isBefore(end) || current.isSame(end)) && count < 400) {
      const dateKey = current.format('YYYY-MM-DD')
      const entry = trendData[dateKey] || { income: 0, expense: 0 }

      chartLabels.push(current.format('D')) // Just the day number
      incomeValues.push(entry.income)
      expenseValues.push(entry.expense)

      current = current.add(1, 'day')
      count++
    }
  } else {
    // Fallback if no range (e.g. "All" view before first load or manual filters)
    const sortedDates = Object.keys(trendData).sort()
    if (sortedDates.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-sm text-[#94a3b8] min-h-[220px] font-bold">
          Belum ada data untuk dirender
        </div>
      )
    }

    sortedDates.forEach(dateKey => {
      chartLabels.push(dayjs(dateKey).format('D'))
      incomeValues.push(trendData[dateKey].income)
      expenseValues.push(trendData[dateKey].expense)
    })
  }

  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Pemasukan',
        // Map 0 to 1 for Log scale to prevent line breaks
        data: isLogScale ? incomeValues.map(v => v > 0 ? v : 1) : incomeValues,
        borderColor: '#10b981',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(16, 185, 129, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#10b981',
        pointBorderWidth: 2,
        borderWidth: 3,
      },
      {
        label: 'Pengeluaran',
        // Map 0 to 1 for Log scale to prevent line breaks
        data: isLogScale ? expenseValues.map(v => v > 0 ? v : 1) : expenseValues,
        borderColor: '#f43f5e',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(244, 63, 94, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
          gradient.addColorStop(1, 'rgba(244, 63, 94, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#f43f5e',
        pointBorderWidth: 2,
        borderWidth: 3,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#94a3b8',
        titleFont: { size: 10, weight: '800' },
        bodyColor: '#f8fafc',
        bodyFont: { size: 12, weight: '700' },
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          title: (ctx) => `Tanggal ${ctx[0].label}`,
          label: (ctx) => {
            // Restore actual value for tooltip even if data was mapped to 1
            const datasetIndex = ctx.datasetIndex;
            const dataIndex = ctx.dataIndex;
            const originalValue = datasetIndex === 0 ? incomeValues[dataIndex] : expenseValues[dataIndex];
            return ` ${ctx.dataset.label}: Rp ${originalValue.toLocaleString('id-ID')}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 9, weight: '700' },
          maxTicksLimit: 15, // Don't crowd the x-axis
        },
      },
      y: {
        type: isLogScale ? 'logarithmic' : 'linear',
        // Log scale must start at 1 minimum
        min: isLogScale ? 1 : 0,
        grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 9, weight: '700' },
          callback: (v) => {
            // Only show major powers of 10 in Log scale to avoid clutter/misalignment
            if (isLogScale) {
              const log = Math.log10(v);
              if (Math.abs(Math.round(log) - log) < 1e-10) {
                return formatRupiah(v);
              }
              return null; // Skip non-power-of-10 ticks
            }
            return formatRupiah(v);
          },
          maxTicksLimit: isLogScale ? 8 : 5,
        },
      },
    },
  }

  return (
    <div className="flex-1 flex flex-col min-h-[180px] relative mt-2">
      <div className="absolute top-0 right-0 z-10">
        <button
          onClick={() => setIsLogScale(!isLogScale)}
          className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all duration-300 border ${isLogScale
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100'
              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:text-slate-600'
            }`}
        >
          {isLogScale ? 'Scaling: ON' : 'Scaling: OFF'}
        </button>
      </div>
      <div className="flex-1 relative">
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
