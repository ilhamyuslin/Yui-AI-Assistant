import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import {
  Utensils,
  ShoppingBag,
  Car,
  Zap,
  Heart,
  Play,
  Gift,
  MoreHorizontal,
  TrendingDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController)

const CATEGORY_CONFIG = {
  'Makan & Minum': { color: '#10b981', icon: Utensils },
  'Belanja Bulanan': { color: '#6366f1', icon: ShoppingBag },
  'Transportasi': { color: '#f59e0b', icon: Car },
  'Tagihan & Utilitas': { color: '#ef4444', icon: Zap },
  'Kesehatan': { color: '#ec4899', icon: Heart },
  'Hiburan': { color: '#8b5cf6', icon: Play },
  'Sedekah & Hadiah': { color: '#14b8a6', icon: Gift },
  'Lainnya': { color: '#94a3b8', icon: MoreHorizontal },
}

const DEFAULT_CONFIG = { color: '#cbd5e1', icon: MoreHorizontal }

export default function ExpenseCategoryChart({ categories, loading }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [hoveredData, setHoveredData] = useState(null)
  const itemsPerPage = 4

  const activeCategories = Object.entries(categories || {})
    .filter(([_, value]) => Math.abs(value) > 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

  const totalPages = Math.ceil(activeCategories.length / itemsPerPage)

  // Swipe logic
  const [touchStart, setTouchStart] = useState(null)
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStart === null) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentPage < totalPages - 1) setCurrentPage(p => p + 1)
      if (diff < 0 && currentPage > 0) setCurrentPage(p => p - 1)
    }
    setTouchStart(null)
  }


  const labels = activeCategories.map(([name]) => name)
  const dataValues = activeCategories.map(([_, value]) => value)
  const total = dataValues.reduce((a, b) => a + b, 0)

  // Use a ref for tracking the index to avoid triggering 'options' re-memoization
  const hoveredIndexRef = useRef(null)

  const chartData = useMemo(() => {
    const backgroundColors = labels.map(l => (CATEGORY_CONFIG[l] || DEFAULT_CONFIG).color)
    return {
      labels,
      datasets: [
        {
          data: dataValues,
          backgroundColor: backgroundColors,
          borderColor: '#fff',
          borderWidth: 4,
          hoverOffset: 20, // Increased for a clear effect
          cutout: '82%',
          borderRadius: 20,
          spacing: 0, // Removed spacing for smoother appearance
        },
      ],
    }
  }, [labels, dataValues])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '82%',
    layout: {
      padding: 20 // Extra padding to prevent clipping when segments expand
    },
    onHover: (event, elements) => {
      const idx = elements && elements.length > 0 ? elements[0].index : null
      if (idx !== hoveredIndexRef.current) {
        hoveredIndexRef.current = idx
        if (idx !== null) {
          setHoveredData({
            label: labels[idx],
            value: dataValues[idx]
          })
        } else {
          setHoveredData(null)
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    hover: {
      mode: 'nearest',
      intersect: true,
    },
    animation: {
      duration: 500, // Slightly slower for more premium feel
      easing: 'easeOutQuart'
    }
  }), [labels, dataValues])

  if (loading) {
    return (
      <div className="w-full aspect-square flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (activeCategories.length === 0) {
    return (
      <div className="w-full aspect-square flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-50 rounded-[2rem]">
        <TrendingDown size={32} strokeWidth={1.5} className="opacity-20" />
        <span className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40">No Activity</span>
      </div>
    )
  }

  const visibleCategories = activeCategories.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  )

  const formatCenterValue = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
    return v.toString()
  }

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col md:flex-row items-center justify-center lg:justify-start gap-8 lg:gap-14 py-2 w-full h-full min-w-0"
    >
      {/* Chart Container */}
      <div className="relative w-full max-w-[220px] aspect-square flex-shrink-0">
        <Doughnut data={chartData} options={options} />

        {/* Center Text - Apple Style */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-300">
          <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
            {hoveredData ? hoveredData.label : 'Total'}
          </span>
          <span className="text-xl font-bold text-slate-900 tracking-tight animate-in fade-in duration-300">
            {formatCenterValue(hoveredData ? hoveredData.value : total)}
          </span>
        </div>
      </div>

      {/* Minimalist Legend with Auto-Sliding Pagination */}
      <div className="flex flex-col justify-center gap-6 min-w-[180px] w-full md:w-auto">
        <div className="flex flex-col gap-4 h-auto">
          {visibleCategories.map(([name, value]) => {
            const pct = ((Math.abs(value) / total) * 100).toFixed(1)
            const config = CATEGORY_CONFIG[name] || DEFAULT_CONFIG
            const Icon = config.icon

            return (
              <div 
                key={name} 
                onClick={() => {
                  if (hoveredData?.label === name) {
                    setHoveredData(null)
                  } else {
                    setHoveredData({ label: name, value: Math.abs(value) })
                  }
                }}
                className={cn(
                  "group flex items-center justify-between animate-in fade-in slide-in-from-right-2 duration-500 w-full cursor-pointer p-2 rounded-2xl transition-all active:scale-[0.98]",
                  hoveredData?.label === name ? "bg-slate-50 shadow-sm" : "hover:bg-slate-50/50"
                )}
              >
                <div className="flex items-center gap-4 flex-1 w-full">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                      hoveredData?.label === name ? "scale-110" : "group-hover:scale-110"
                    )}
                    style={{ backgroundColor: `${config.color}15`, color: config.color }}
                  >
                    <Icon size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={cn(
                      "text-[0.85rem] font-bold truncate transition-colors",
                      hoveredData?.label === name ? "text-slate-900" : "text-slate-700"
                    )}>
                      {name}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%`, backgroundColor: config.color }}
                        />
                      </div>
                      <span className="text-[0.7rem] font-bold text-slate-400 shrink-0">{pct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination Dots - Centered Auto Layout */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500 outline-none",
                  currentPage === i ? "w-6 bg-slate-400" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
