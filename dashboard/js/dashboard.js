/**
 * dashboard.js
 * handles financial charts, stats, and AI insights
 */

import { API } from './api.js';
import { formatIDR, showToast } from './utils.js';

let trendChart = null;
let categoryChart = null;
let selectedCategories = []; // Global multi-select category filter state
let fpInstance = null; // Store flatpickr instance
let currentPeriod = new Date().toISOString().substring(0, 7);

// Pagination State
let allTransactions = [];
let currentPage = 1;
const txPerPage = 5; // Reduced from 7 to compact row 2

let allBudgets = [];
let currentBudgetPage = 1;
const budgetPerPage = 4; // Reduced from 6 to compact row 1

// Slider Portfolio State
let currentSliderIndex = 0;
let sliderAutoInterval = null;

const CATEGORY_ICONS = {
  'Makan & Minum': '🍔',
  'Transportasi': '🚗',
  'Belanja Bulanan': '🛒',
  'Tagihan & Utilitas': '🔌',
  'Kesehatan': '🏥',
  'Hiburan & Hobi': '🎮',
  'Pendidikan': '📚',
  'Cicilan & Hutang': '💸',
  'Sedekah & Hadiah': '🎁',
  'Tabungan & Investasi': '📈',
  'Tempat Tinggal': '🏠',
  'Lainnya': '✨'
};

function getIcon(cat) {
  return CATEGORY_ICONS[cat] || '💰';
}

export function initDashboard() {
  setupDatePicker();
  setupCategoryFilter();

  // Handle format titik otomatis saat mengetik di modal budget
  document.getElementById('budgetFormList')?.addEventListener('input', (e) => {
    if (e.target.classList.contains('budget-input')) {
      let val = e.target.value.replace(/\D/g, '');
      e.target.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  });
  
  // Generic Modal Close Handler (for 'x' buttons)
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      closeBudgetModal();
      closeAccountModal();
    });
  });

  // Budget Modal Control
  document.getElementById('openBudgetModalBtn')?.addEventListener('click', openBudgetModal);
  document.getElementById('saveBudgetBtn')?.addEventListener('click', saveAllBudgets);
  document.getElementById('cancelBudgetBtn')?.addEventListener('click', closeBudgetModal);
  
  // Account Modal Control
  document.getElementById('openAccountModalBtn')?.addEventListener('click', openAccountModal);
  document.getElementById('closeAccountModalBtn')?.addEventListener('click', closeAccountModal);
  document.getElementById('saveAccountsBtn')?.addEventListener('click', saveAccounts);
  document.getElementById('addNewAccountBtn')?.addEventListener('click', addNewAccountRow);

  // Handle auto-format for account inputs (delegated)
  document.getElementById('accountFormList')?.addEventListener('input', (e) => {
    if (e.target.classList.contains('account-balance-input')) {
      let val = e.target.value.replace(/\D/g, '');
      e.target.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  });

  // Quick Filter Listeners
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => handleQuickFilter(btn.dataset.type));
  });

  // Manual Refresh Listener
  document.getElementById('refreshDataBtn')?.addEventListener('click', manualRefresh);
}

async function manualRefresh() {
  const btn = document.getElementById('refreshDataBtn');
  if (!btn) return;

  // Add spinning animation
  btn.classList.add('spinning');
  
  // Get current dates from Flatpickr instance, or use defaults
  const currentDates = fpInstance ? fpInstance.selectedDates : null;
  
  try {
    await refreshDashboardData(currentDates, selectedCategories);
    showToast('Data berhasil diperbarui', 'info');
  } catch (err) {
    showToast('Gagal menyegarkan data', 'error');
  } finally {
    // Remove spinning after a small delay for better UX feel
    setTimeout(() => {
      btn.classList.remove('spinning');
    }, 600);
  }
}

async function handleQuickFilter(type) {
  const now = new Date();
  let start, end;

  // Clear active classes
  document.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.quick-filter-btn[data-type="${type}"]`)?.classList.add('active');

  switch (type) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = now;
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      break;
    case 'cycle':
      try {
        const cycleRes = await fetch(API.config + '/cycle');
        const { payDay } = await cycleRes.json();
        start = new Date(now.getFullYear(), now.getMonth(), payDay);
        if (now.getDate() < payDay) start.setMonth(start.getMonth() - 1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, payDay - 1, 23, 59, 59);
      } catch (err) {
        console.error('Cycle fetch error:', err);
        return handleQuickFilter('month');
      }
      break;
    case 'all':
      start = new Date(2000, 0, 1);
      end = now;
      break;
  }

  // Hide custom range feedback when using quick filters
  const trigger = document.getElementById('calendarTrigger');
  const display = document.getElementById('selectedRangeText');
  if (trigger) trigger.classList.remove('active');
  if (display) display.classList.remove('visible');

  if (fpInstance) {
    fpInstance.setDate([start, end]);
    refreshDashboardData([start, end], selectedCategories);
  }
}

/**
 * Premium Multi-Select Category Filter Setup
 */
function setupCategoryFilter() {
  const trigger = document.getElementById('categoryTrigger');
  const dropdown = document.getElementById('categoryDropdown');
  if (!trigger || !dropdown) return;

  // Toggle dropdown
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  // Close when clicking outside
  document.addEventListener('click', () => dropdown.classList.remove('show'));
  dropdown.addEventListener('click', (e) => e.stopPropagation());

  // Initial Populate
  renderCategoryOptions();

  function renderCategoryOptions() {
    const cats = Object.keys(CATEGORY_ICONS);
    let html = cats.map(cat => {
      const isActive = selectedCategories.includes(cat);
      return `
        <div class="category-option ${isActive ? 'active' : ''}" data-cat="${cat}">
          <div class="category-checkbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="category-label">${cat}</span>
        </div>
      `;
    }).join('');

    // Add 'Clear All' 
    html += `
      <div class="category-option clear-opt" data-cat="all">
        Clear All Filters
      </div>
    `;

    dropdown.innerHTML = html;
    attachOptionListeners();
  }

  function attachOptionListeners() {
    dropdown.querySelectorAll('.category-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        const cat = opt.dataset.cat;
        
        if (cat === 'all') {
          selectedCategories = [];
          trigger.classList.remove('active');
          showToast('Semua filter kategori dihapus', 'info');
        } else {
          if (selectedCategories.includes(cat)) {
            selectedCategories = selectedCategories.filter(c => c !== cat);
          } else {
            selectedCategories.push(cat);
          }
          
          if (selectedCategories.length > 0) {
            trigger.classList.add('active');
          } else {
            trigger.classList.remove('active');
          }
        }

        // Re-render internal state for checkmarks
        renderCategoryOptions();
        
        // Refresh dashboard data immediately
        const currentDates = fpInstance ? fpInstance.selectedDates : null;
        refreshDashboardData(currentDates, selectedCategories);
      });
    });
  }
}

function setupDatePicker() {
  if (typeof flatpickr === 'undefined') return;
  
  const trigger = document.getElementById('calendarTrigger');
  const display = document.getElementById('selectedRangeText');

  fpInstance = flatpickr("#dateFilter", {
    mode: "range",
    dateFormat: "Y-m-d",
    onOpen: () => {
      trigger?.classList.add('active');
    },
    onClose: (selectedDates) => {
      if (selectedDates.length < 2) {
        trigger?.classList.remove('active');
      }
    },
    onChange: (selectedDates) => {
      if (selectedDates.length === 2) {
        // Remove quick filter active state if user picks custom range
        document.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));
        
        // Show range text
        if (display) {
          const s = selectedDates[0].toLocaleDateString('id-ID', { day:'2-digit', month:'short' });
          const e = selectedDates[1].toLocaleDateString('id-ID', { day:'2-digit', month:'short' });
          display.textContent = `${s} - ${e}`;
          display.classList.add('visible');
        }
        
        trigger?.classList.add('active');
        refreshDashboardData(selectedDates);
      }
    }
  });

  // Open on button click
  trigger?.addEventListener('click', () => {
    fpInstance.open();
  });
}

export async function refreshDashboardData(dates = null, categories = []) {
  let start, end;
  if (dates && dates.length === 2) {
    start = dates[0].toISOString();
    end = dates[1].toISOString();
  } else {
    // Default to this month
    start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    end = new Date().toISOString();
  }

  await Promise.all([
    fetchOverviewStats(start, end, categories),
    loadBudgets(start, end),
    loadAccounts(),
    loadTransactions(start, end, categories)
  ]);
}

async function fetchOverviewStats(start, end, categories = []) {
  try {
    const params = new URLSearchParams({ 
      startDate: start, 
      endDate: end,
      period: currentPeriod
    });
    
    // Append multiple categories if any
    if (categories && categories.length > 0) {
      categories.forEach(cat => params.append('category', cat));
    }

    const res = await fetch(`${API.stats}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    if (!data) return;

    document.getElementById('totalExpense').textContent = formatIDR(data.total_expense);
    document.getElementById('totalIncome').textContent = formatIDR(data.total_income);
    document.getElementById('netSavings').textContent = formatIDR(data.net_savings);

    // Saving Rate Calculation
    const income = parseFloat(data.total_income) || 0;
    const net = parseFloat(data.net_savings) || 0;
    const rate = income > 0 ? ((net / income) * 100).toFixed(1) : 0;
    
    const rateEl = document.getElementById('savingRateValue');
    if (rateEl) rateEl.textContent = `${rate}%`;

    const savingsStatus = document.getElementById('savingsStatus');
    if (savingsStatus) {
      savingsStatus.classList.remove('surplus', 'minus', 'neutral');
      
      if (data.net_savings > 0) {
        savingsStatus.textContent = 'Surplus';
        savingsStatus.classList.add('surplus');
        savingsStatus.style.color = ''; // Reset inline color
      } else if (data.net_savings < 0) {
        savingsStatus.textContent = 'Minus';
        savingsStatus.classList.add('minus');
        savingsStatus.style.color = ''; // Reset inline color
      } else {
        savingsStatus.textContent = 'Balanced';
        savingsStatus.classList.add('neutral');
        savingsStatus.style.color = ''; // Reset inline color
      }
    }

    renderCharts(data);
    updateAIInsights(data);
  } catch (err) {
    console.error('Stats error:', err);
  }
}

async function loadBudgets(start = null, end = null) {
  const container = document.getElementById('budgetList');
  if (!container) return;
  
  try {
    const q = new URLSearchParams({ period: currentPeriod });
    if (start) q.set('startDate', start);
    if (end) q.set('endDate', end);
    
    const res = await fetch(`${API.budgets}?${q.toString()}`);
    allBudgets = await res.json();
    currentBudgetPage = 1;

    let totalBudget = 0;
    let totalActual = 0;
    
    allBudgets.forEach(b => {
      totalBudget += parseFloat(b.amount);
      totalActual += parseFloat(b.actual);
    });

    renderPaginatedBudgets();

    const totalBudgetEl = document.getElementById('totalBudgetText');
    if (totalBudgetEl) {
      totalBudgetEl.innerHTML = `
        <span class="val-current">${formatIDR(totalActual)}</span>
        <span class="val-sep">/</span>
        <span class="val-limit">${formatIDR(totalBudget)}</span>
      `;
    }

    // Prepare modal form
    const formList = document.getElementById('budgetFormList');
    if (formList) {
      formList.innerHTML = allBudgets.map(b => {
        const formattedAmount = b.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `
          <div class="budget-row-grid budget-form-item">
            <div class="category-name-group">
              ${b.category}
            </div>
            <div class="account-input-group">
              <span class="prefix">Rp</span>
              <input type="text" 
                     class="account-balance-input budget-input" 
                     data-category="${b.category}" 
                     value="${formattedAmount}" 
                     placeholder="0" />
            </div>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    container.innerHTML = '<div class="error-msg">Gagal memuat budget.</div>';
  }
}

function renderPaginatedBudgets() {
  const container = document.getElementById('budgetList');
  if (!container) return;

  if (allBudgets.length === 0) {
    container.innerHTML = '<div class="text-center" style="padding: 20px; color: #94a3b8;">Belum ada budget.</div>';
    renderBudgetPaginationUI(0);
    return;
  }

  const startIdx = (currentBudgetPage - 1) * budgetPerPage;
  const endIdx = startIdx + budgetPerPage;
  const paginated = allBudgets.slice(startIdx, endIdx);

  container.innerHTML = paginated.map(b => {
    const percent = b.amount > 0 ? Math.min((b.actual / b.amount) * 100, 100) : 0;
    const fillClass = percent > 90 ? 'danger' : percent > 70 ? 'warning' : '';
    
    return `
      <div class="budget-item">
        <div class="budget-item-header">
          <span class="budget-category">${b.category}</span>
          <span class="budget-amounts">${formatIDR(b.actual)} / ${formatIDR(b.amount)}</span>
        </div>
        <div class="budget-bar-track">
          <div class="budget-bar-fill ${fillClass}" style="width: ${percent}%; background: var(--accent); height: 100%; border-radius: 99px;"></div>
        </div>
      </div>
    `;
  }).join('');

  renderBudgetPaginationUI(allBudgets.length);
}

function renderBudgetPaginationUI(totalItems) {
  const container = document.getElementById('budgetPaginationContainer');
  if (!container) return;

  const totalPages = Math.ceil(totalItems / budgetPerPage);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button class="page-btn" ${currentBudgetPage === 1 ? 'disabled' : ''} onclick="changeBudgetPage(${currentBudgetPage - 1})">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="page-btn ${i === currentBudgetPage ? 'active' : ''}" onclick="changeBudgetPage(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="page-btn" ${currentBudgetPage === totalPages ? 'disabled' : ''} onclick="changeBudgetPage(${currentBudgetPage + 1})">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  `;

  container.innerHTML = html;
}

function changeBudgetPage(page) {
  currentBudgetPage = page;
  renderPaginatedBudgets();
}

window.changeBudgetPage = changeBudgetPage;

async function loadTransactions(start, end, categories = []) {
  const container = document.getElementById('transactionList');
  if (!container) return;
  
  try {
    const params = new URLSearchParams({ startDate: start, endDate: end });
    if (categories && categories.length > 0) {
      categories.forEach(cat => params.append('category', cat));
    }
    const res = await fetch(`${API.transactions}?${params.toString()}`);
    allTransactions = await res.json();
    currentPage = 1; // Reset to page 1 on new date range
    renderPaginatedTransactions();
  } catch (err) {
    container.innerHTML = '<tr><td colspan="5" class="text-center error-msg">Gagal memuat transaksi.</td></tr>';
  }
}

function renderPaginatedTransactions() {
  const container = document.getElementById('transactionList');
  if (!container) return;

  if (allTransactions.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px; color: #94a3b8;">Tidak ada transaksi di rentang ini.</td></tr>';
    renderPaginationUI(0);
    return;
  }

  const startIdx = (currentPage - 1) * txPerPage;
  const endIdx = startIdx + txPerPage;
  const paginated = allTransactions.slice(startIdx, endIdx);

  container.innerHTML = paginated.map(tx => {
    const isIncome = tx.transaction_type === 'Income';
    const dateObj = new Date(tx.transaction_date);
    const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

    return `
      <tr>
        <td class="td-date">${dateStr}</td>
        <td><div class="td-item">${tx.item_name}</div></td>
        <td><span class="td-category-badge">${tx.category}</span></td>
        <td class="td-nominal ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'}${formatIDR(tx.amount)}
        </td>
        <td>
          <div class="td-actions">
            <button class="btn-action" onclick="openEditTransactionModal('${tx.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-action danger" onclick="confirmDelete('${tx.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPaginationUI(allTransactions.length);
}

function renderPaginationUI(totalItems) {
  const container = document.getElementById('paginationContainer');
  if (!container) return;

  const totalPages = Math.ceil(totalItems / txPerPage);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  `;

  container.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  renderPaginatedTransactions();
}

window.changePage = changePage;

function renderCharts(data) {
  if (!data || !data.daily_trend || typeof Chart === 'undefined') return;

  // 1. Trend Chart
  const trendCtx = document.getElementById('trendChart')?.getContext('2d');
  if (trendCtx) {
    if (trendChart) trendChart.destroy();
    const dates = Object.keys(data.daily_trend).sort();
    const labels = dates.map(d => d.split('-')[2]); // Just show the day number
    const incomeData = dates.map(d => data.daily_trend[d].income);
    const expenseData = dates.map(d => data.daily_trend[d].expense);
    
    trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: incomeData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            fill: true,
            tension: 0.45,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            pointHitRadius: 20
          },
          {
            label: 'Pengeluaran',
            data: expenseData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            fill: true,
            tension: 0.45,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            pointHitRadius: 20
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false }
        },
        scales: {
          y: { 
            grid: { color: '#f1f5f9', drawBorder: false }, 
            ticks: { 
              color: '#94a3b8', 
              font: { size: 11, weight: '600' },
              callback: (val) => val >= 1000 ? (val/1000) + 'K' : val
            }
          },
          x: { 
            offset: true,
            grid: { display: false }, 
            ticks: { color: '#94a3b8', font: { size: 11, weight: '600' } }
          }
        }
      }
    });
  }

  // 2. Category Chart (Donut)
  const catCtx = document.getElementById('categoryChart')?.getContext('2d');
  if (catCtx) {
    if (categoryChart) categoryChart.destroy();
    const catLabels = Object.keys(data.categories);
    const values = Object.values(data.categories);
    const total = values.reduce((a, b) => a + b, 0);

    // Update Donut Center
    const donutValEl = document.getElementById('totalExpenseDonut');
    if (donutValEl) donutValEl.textContent = formatIDR(total);

    const colors = ['#6ee7b7', '#99f6e4', '#93c5fd', '#c4b5fd', '#fdba74', '#fca5a5', '#fde68a', '#94a3b8'];

    categoryChart = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 12
        },
        plugins: { 
          legend: { display: false },
          tooltip: { enabled: false } // Disable floating tooltips
        },
        onHover: (event, elements) => {
          const dl = document.getElementById('donutLabel');
          const dv = document.getElementById('totalExpenseDonut');
          if (!dl || !dv) return;

          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const label = catLabels[index];
            const value = values[index];
            
            dl.textContent = label.toUpperCase();
            dv.textContent = formatIDR(value);
          } else {
            // Revert to Total
            dl.textContent = 'Total';
            dv.textContent = formatIDR(total);
          }
        },
        cutout: '75%'
      }
    });

    // Render Custom Legend
    const legendContainer = document.getElementById('categoryLegend');
    if (legendContainer) {
      legendContainer.innerHTML = catLabels.map((cat, i) => {
        const val = values[i];
        const perc = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
        return `
          <div class="legend-row">
            <div class="legend-info">
              <div class="legend-bar-indicator" style="background: ${colors[i % colors.length]}"></div>
              <span class="legend-name">${cat}</span>
            </div>
            <div class="legend-divider"></div>
            <span class="legend-percentage">${perc}%</span>
          </div>
        `;
      }).join('');
    }
  }
}

function updateAIInsights(data) {
  const el = document.getElementById('aiInsightMessage');
  if (!el) return;
  const insights = [];
  if (data.net_savings < 0) {
    insights.push("Gawat! Pengeluaranmu lebih besar dari pemasukan bulan ini. Coba cek kategori yang paling boros.");
  } else if (data.net_savings > 0 && data.total_expense > data.total_income * 0.8) {
    insights.push("Ups, pengeluaranmu sudah mencapai 80% dari pemasukan. Hati-hati ya!");
  }
  const cats = Object.keys(data.categories);
  if (cats.length > 0) {
    const top = cats.reduce((a, b) => data.categories[a] > data.categories[b] ? a : b);
    if (data.categories[top] > data.total_expense * 0.5) {
      insights.push(`Kategori **${top}** menyumbang lebih dari 50% pengeluaranmu. Mungkin perlu dievaluasi?`);
    }
  }
  if (insights.length === 0) insights.push("Keuanganmu terlihat sehat sejauh ini. Teruskan pencatatan transaksinya!");
  el.innerHTML = insights[0].replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--accent)">$1</b>');
}

function openBudgetModal() {
  document.getElementById('budgetModal')?.classList.remove('hidden');
}

function closeBudgetModal() {
  document.getElementById('budgetModal')?.classList.add('hidden');
}

async function saveAllBudgets() {
  const inputs = document.querySelectorAll('.budget-input:not(.account-balance-input)');
  const btn = document.getElementById('saveBudgetBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-text">Menyimpan...</span>';
  }

  try {
    const promises = Array.from(inputs).map(input => {
      const numericValue = parseFloat(input.value.replace(/\./g, '')) || 0;
      return fetch(API.budgets, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: input.dataset.category, amount: numericValue })
      });
    });
    await Promise.all(promises);
    showToast('✓ Semua budget diperbarui!', 'success');
    closeBudgetModal();
    
    // Refresh entire dashboard to keep charts and budget lists in sync
    refreshDashboardData(fpInstance?.selectedDates);
  } catch (err) {
    showToast('✗ Gagal menyimpan budget', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-text">Simpan</span>';
    }
  }
}

async function loadAccounts() {
  const fixedContainer = document.getElementById('portfolioTotalCard');
  const sliderTrack = document.getElementById('accountsSlider');
  if (!fixedContainer || !sliderTrack) return;

  try {
    const res = await fetch(API.accounts);
    const { accounts, totalAssets } = await res.json();

    const icons = {
      coins: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="M17 10h1v4"/></svg>`,
      cash:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`
    };

    // 1. Render Fixed Total Card
    fixedContainer.innerHTML = `
      <div class="asset-card total-card">
        <div class="account-info">
          <div class="account-info-left">
            <div class="account-icon">${icons.coins}</div>
            <span class="account-name">Total Aset</span>
          </div>
        </div>
        <div class="asset-value">${formatIDR(totalAssets)}</div>
      </div>
    `;

    // 2. Render Slider Accounts
    if (accounts.length === 0) {
      sliderTrack.innerHTML = '<div class="loading-text">Belum ada akun tambahan.</div>';
      return;
    }

    sliderTrack.innerHTML = accounts.map(acc => `
      <div class="asset-card">
        <div class="account-info">
          <div class="account-info-left">
            <div class="account-icon">${icons.cash}</div>
            <span class="account-name">${acc.name}</span>
          </div>
          <span class="account-status-pill">Sinkron</span>
        </div>
        <div class="asset-value">${formatIDR(acc.balance)}</div>
      </div>
    `).join('');

    // 3. Initialize/Reset Slider logic
    initPortfolioSlider();

  } catch (err) {
    console.error('Load accounts error:', err);
    if (fixedContainer) fixedContainer.innerHTML = '<div class="asset-card error">Gagal memuat</div>';
  }
}

function initPortfolioSlider() {
  const track = document.getElementById('accountsSlider');
  const dotsContainer = document.getElementById('portfolioDots');
  if (!track || !dotsContainer) return;

  const cards = track.querySelectorAll('.asset-card');
  if (cards.length === 0) return;

  // Clear existing dots and interval
  dotsContainer.innerHTML = '';
  if (sliderAutoInterval) clearInterval(sliderAutoInterval);
  currentSliderIndex = 0;
  track.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
  track.style.transform = `translateX(0)`;

  // Determine how many cards to show per slide
  let cardsPerView = window.innerWidth <= 640 ? 1 : (window.innerWidth <= 1024 ? 2 : 3);
  const totalSlides = Math.ceil(cards.length / cardsPerView);
  
  if (totalSlides <= 1) return;

  // Create Dots
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('div');
    dot.className = `dot ${i === 0 ? 'active' : ''}`;
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  }

  function goToSlide(index) {
    currentSliderIndex = index;
    const offset = index * 100;
    track.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    track.style.transform = `translateX(-${offset}%)`;
    
    dotsContainer.querySelectorAll('.dot').forEach((d, idx) => {
      d.classList.toggle('active', idx === index);
    });
  }

  function nextSlide() {
    let next = currentSliderIndex + 1;
    if (next >= totalSlides) next = 0;
    goToSlide(next);
  }

  function prevSlide() {
    let prev = currentSliderIndex - 1;
    if (prev < 0) prev = totalSlides - 1;
    goToSlide(prev);
  }

  // --- DRAG LOGIC ---
  let isDragging = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;
  let dragThreshold = 100; // Pixels to trigger slide

  const viewport = track.parentElement;

  // Start drag
  const onStart = (e) => {
    isDragging = true;
    startX = (e.type.includes('touch')) ? e.touches[0].clientX : e.clientX;
    prevTranslate = -currentSliderIndex * viewport.offsetWidth;
    track.style.transition = 'none'; // Disable for smooth dragging
    clearInterval(sliderAutoInterval);
  };

  // Dragging
  const onMove = (e) => {
    if (!isDragging) return;
    const x = (e.type.includes('touch')) ? e.touches[0].clientX : e.clientX;
    const walk = x - startX;
    currentTranslate = prevTranslate + walk;
    track.style.transform = `translateX(${currentTranslate}px)`;
  };

  // End drag
  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    const movedBy = currentTranslate - prevTranslate;

    track.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';

    if (movedBy < -dragThreshold && currentSliderIndex < totalSlides - 1) {
      currentSliderIndex += 1;
    } else if (movedBy > dragThreshold && currentSliderIndex > 0) {
      currentSliderIndex -= 1;
    }

    goToSlide(currentSliderIndex);
    
    // Restart Interval
    clearInterval(sliderAutoInterval);
    sliderAutoInterval = setInterval(nextSlide, 5000);
  };

  // Event Listeners
  track.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  
  track.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);

  // Prevention for links/images dragging
  track.addEventListener('dragstart', (e) => e.preventDefault());

  // Auto Rotation (5 seconds)
  sliderAutoInterval = setInterval(nextSlide, 5000);

  // Pause on hover
  viewport.onmouseenter = () => clearInterval(sliderAutoInterval);
  viewport.onmouseleave = () => {
    if (!isDragging) {
      clearInterval(sliderAutoInterval);
      sliderAutoInterval = setInterval(nextSlide, 5000);
    }
  };
}

function openAccountModal() {
  document.getElementById('accountModal')?.classList.remove('hidden');
  renderAccountForm();
}

function closeAccountModal() {
  document.getElementById('accountModal')?.classList.add('hidden');
}

async function renderAccountForm() {
  const container = document.getElementById('accountFormList');
  if (!container) return;

  try {
    const res = await fetch(API.accounts);
    const { accounts } = await res.json();

    container.innerHTML = accounts.map(acc => `
      <div class="account-row-grid account-row" data-id="${acc.id}">
        <div class="account-name-group">
          <input type="text" class="account-name-input-flat" value="${acc.name}" placeholder="Nama Akun..." />
        </div>
        <div class="account-input-group">
          <span class="prefix">Rp</span>
          <input type="text" 
                 class="account-balance-input" 
                 value="${acc.balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}" 
                 placeholder="0" />
        </div>
        <button class="btn-trash" onclick="this.parentElement.remove()" title="Hapus Akun">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = 'Gagal memuat data akun.';
  }
}

function addNewAccountRow() {
  const container = document.getElementById('accountFormList');
  const div = document.createElement('div');
  div.className = 'account-row-grid account-row new-account';
  div.innerHTML = `
    <div class="account-name-group">
      <input type="text" class="account-name-input-flat" placeholder="Nama Akun (BCA, Cash...)" />
    </div>
    <div class="account-input-group">
      <span class="prefix">Rp</span>
      <input type="text" class="account-balance-input" placeholder="0" />
    </div>
    <button class="btn-trash" onclick="this.parentElement.remove()" title="Hapus Akun">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
    </button>
  `;
  container.appendChild(div);
}

async function saveAccounts() {
  const rows = document.querySelectorAll('.account-row');
  const btn = document.getElementById('saveAccountsBtn');
  const status = document.getElementById('accountSaveStatus');
  
  if (btn) btn.disabled = true;

  try {
    const promises = Array.from(rows).map(row => {
      const name = row.querySelector('.account-name-input').value;
      const balance = row.querySelector('.account-balance-input').value.replace(/\./g, '');
      if (!name) return Promise.resolve();
      
      return fetch(API.accounts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, balance: parseFloat(balance) || 0 })
      });
    });

    await Promise.all(promises);
    showToast('✓ Saldo akun diperbarui!', 'success');
    closeAccountModal();
    loadAccounts();
    // Refresh overview balance as well
    const start = document.getElementById('dateFilter').value.split(' to ')[0];
    const end = document.getElementById('dateFilter').value.split(' to ')[1];
    refreshDashboardData();
  } catch (err) {
    showToast('✗ Gagal menyimpan akun', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

window.openBudgetModal = openBudgetModal;
window.openAccountModal = openAccountModal;
window.addNewAccountRow = addNewAccountRow;
window.openEditTransactionModal = openEditTransactionModal;
window.closeEditTransactionModal = closeEditTransactionModal;
window.confirmDelete = confirmDelete;
window.closeDeleteModal = closeDeleteModal;
/**
 * --- Transaction CRUD Logic ---
 */

let deleteTxId = null;

async function openEditTransactionModal(id) {
  const tx = allTransactions.find(t => t.id === id);
  if (!tx) return;

  const modal = document.getElementById('editTransactionModal');
  const categorySelect = document.getElementById('editTxCategory');
  const accountSelect = document.getElementById('editTxAccount');
  
  if (!modal) return;

  // Reset selects and fill basic fields
  categorySelect.innerHTML = '<option value="">Memuat kategori...</option>';
  accountSelect.innerHTML = '<option value="">Memuat akun...</option>';
  
  document.getElementById('editTxId').value = tx.id;
  document.getElementById('editTxDate').value = tx.transaction_date.split('T')[0];
  document.getElementById('editTxType').value = tx.transaction_type;
  document.getElementById('editTxNote').value = tx.item_name || tx.note || '';
  document.getElementById('editTxAmount').value = tx.amount;

  // Populating Categories and Accounts
  try {
    const [catRes, accRes] = await Promise.all([
      fetch(API.categories),
      fetch(API.accounts)
    ]);
    
    if (!catRes.ok || !accRes.ok) throw new Error('API request failed');
    
    const cats = await catRes.json();
    const data = await accRes.json();
    const accounts = data.accounts || [];

    categorySelect.innerHTML = cats.map(c => 
      `<option value="${c}" ${c === tx.category ? 'selected' : ''}>${c}</option>`
    ).join('');
    
    accountSelect.innerHTML = accounts.map(a => 
      `<option value="${a.name}" ${a.name === tx.source_of_fund ? 'selected' : ''}>${a.name}</option>`
    ).join('');

    // Re-verify selection in case of race condition
    categorySelect.value = tx.category;
    accountSelect.value = tx.source_of_fund;
    document.getElementById('editTxType').value = tx.transaction_type;

  } catch (err) {
    console.error('Failed to populate edit selects:', err);
    categorySelect.innerHTML = `<option value="${tx.category}" selected>${tx.category}</option>`;
    accountSelect.innerHTML = `<option value="${tx.source_of_fund}" selected>${tx.source_of_fund}</option>`;
  }

  modal.classList.remove('hidden');
}

function closeEditTransactionModal() {
  document.getElementById('editTransactionModal')?.classList.add('hidden');
}

// Wire up Edit Submission
document.getElementById('editTransactionForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editTxId').value;
  const btn = document.getElementById('saveEditTxBtn');
  
  const payload = {
    transaction_date: document.getElementById('editTxDate').value,
    transaction_type: document.getElementById('editTxType').value,
    item_name: document.getElementById('editTxNote').value,
    category: document.getElementById('editTxCategory').value,
    source_of_fund: document.getElementById('editTxAccount').value,
    amount: document.getElementById('editTxAmount').value
  };

  try {
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span>';
    btn.disabled = true;

    const res = await fetch(`${API.transactions}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_date: document.getElementById('editTxDate').value,
        transaction_type: document.getElementById('editTxType').value,
        item_name: document.getElementById('editTxNote').value, 
        category: document.getElementById('editTxCategory').value,
        source_of_fund: document.getElementById('editTxAccount').value,
        amount: parseFloat(document.getElementById('editTxAmount').value)
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP Error ${res.status}`);
    }

    btn.innerHTML = originalBtnText;
    btn.disabled = false;
    closeEditTransactionModal();
    refreshDashboardData(fpInstance?.selectedDates); 
  } catch (err) {
    console.error('Update final error:', err);
    alert(`Gagal mengupdate: ${err.message}`);
    btn.innerHTML = 'Simpan Perubahan'; 
    btn.disabled = false;
  }
});

/** Confirmation Logic **/
function confirmDelete(id) {
  deleteTxId = id;
  document.getElementById('confirmDeleteModal')?.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteTxId = null;
  document.getElementById('confirmDeleteModal')?.classList.add('hidden');
}

// Wire up Delete Execution
document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
  if (!deleteTxId) return;

  const btn = document.getElementById('confirmDeleteBtn');
  try {
    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    const res = await fetch(`${API.transactions}/${deleteTxId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Delete failed');

    btn.textContent = originalText;
    btn.disabled = false;
    closeDeleteModal();
    refreshDashboardData(fpInstance?.selectedDates); // Refresh UI
  } catch (err) {
    alert('Gagal menghapus transaksi');
    btn.disabled = false;
  }
});
