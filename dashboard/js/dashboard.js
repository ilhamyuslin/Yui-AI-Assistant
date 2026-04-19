/**
 * dashboard.js
 * handles financial charts, stats, and AI insights
 */

import { API } from './api.js';
import { formatIDR, showToast } from './utils.js';

let trendChart = null;
let categoryChart = null;
let currentPeriod = new Date().toISOString().substring(0, 7);

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
}

function setupDatePicker() {
  if (typeof flatpickr === 'undefined') return;
  
  flatpickr("#dateFilter", {
    mode: "range",
    dateFormat: "Y-m-d",
    defaultDate: [
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date()
    ],
    theme: "dark",
    onChange: (selectedDates) => {
      if (selectedDates.length === 2) {
        refreshDashboardData(selectedDates);
      }
    }
  });
}

export async function refreshDashboardData(dates = null) {
  let start, end;
  if (dates) {
    start = dates[0].toISOString();
    end = dates[1].toISOString();
  } else {
    start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    end = new Date().toISOString();
  }

  await Promise.all([
    fetchOverviewStats(start, end),
    loadBudgets(),
    loadAccounts(),
    loadTransactions(start, end)
  ]);
}

async function fetchOverviewStats(start, end) {
  try {
    const q = new URLSearchParams({ 
      startDate: start, 
      endDate: end,
      period: currentPeriod // keep as fallback
    }).toString();
    
    const res = await fetch(`${API.stats}?${q}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    if (!data) return;

    document.getElementById('totalExpense').textContent = formatIDR(data.total_expense);
    document.getElementById('totalIncome').textContent = formatIDR(data.total_income);
    document.getElementById('totalBalance').textContent = formatIDR((data.total_income || 0) - (data.total_expense || 0));
    document.getElementById('netSavings').textContent = formatIDR(data.net_savings);

    const savingsStatus = document.getElementById('savingsStatus');
    if (savingsStatus) {
      if (data.net_savings > 0) {
        savingsStatus.textContent = '🟢 Surplus';
        savingsStatus.style.color = 'var(--accent-green)';
      } else if (data.net_savings < 0) {
        savingsStatus.textContent = '🔴 Minus';
        savingsStatus.style.color = 'var(--accent-red)';
      } else {
        savingsStatus.textContent = '⚪ Balanced';
        savingsStatus.style.color = 'var(--text-muted)';
      }
    }

    renderCharts(data);
    updateAIInsights(data);
  } catch (err) {
    console.error('Stats error:', err);
  }
}

async function loadBudgets() {
  const container = document.getElementById('budgetList');
  if (!container) return;
  
  try {
    const res = await fetch(`${API.budgets}?period=${currentPeriod}`);
    const budgets = await res.json();

    let totalBudget = 0;
    let totalActual = 0;
    
    container.innerHTML = budgets.map(b => {
      const percent = b.amount > 0 ? Math.min((b.actual / b.amount) * 100, 100) : 0;
      const remains = b.amount - b.actual;
      const statusClass = percent > 90 ? 'danger' : percent > 70 ? 'warning' : '';
      
      totalBudget += parseFloat(b.amount);
      totalActual += parseFloat(b.actual);

      return `
        <div class="budget-item">
          <div class="budget-item-header">
            <span class="budget-category">${b.category}</span>
            <span class="budget-amount">${formatIDR(b.actual)} / ${formatIDR(b.amount)}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-fill ${statusClass}" style="width: ${percent}%"></div>
          </div>
          <div class="budget-footer">
            <span>${percent.toFixed(0)}% Terpakai</span>
            <span>Sisa: ${formatIDR(remains)}</span>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('totalBudgetText').textContent = `${formatIDR(totalActual)} / ${formatIDR(totalBudget)}`;

    // Prepare modal form
    const formList = document.getElementById('budgetFormList');
      formList.innerHTML = budgets.map(b => {
        // Format angka awal dengan titik
        const formattedAmount = b.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `
        <div class="budget-form-item">
          <div class="budget-form-label">
            <span class="category-icon">${getIcon(b.category)}</span>
            <span class="category-name">${b.category}</span>
          </div>
          <div class="budget-input-wrapper">
            <span class="currency-prefix">Rp</span>
            <input type="text" 
                   class="budget-input" 
                   data-category="${b.category}" 
                   value="${formattedAmount}" 
                   placeholder="0" />
          </div>
        </div>
      `;
      }).join('');

  } catch (err) {
    container.innerHTML = '<div class="error-msg">Gagal memuat budget.</div>';
  }
}

async function loadTransactions(start, end) {
  const tbody = document.getElementById('transactionBody');
  if (!tbody) return;
  
  try {
    const q = new URLSearchParams({ startDate: start, endDate: end }).toString();
    const res = await fetch(`${API.transactions}?${q}`);
    const txs = await res.json();

    if (txs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada transaksi di rentang ini.</td></tr>';
      return;
    }

    tbody.innerHTML = txs.map(tx => {
      const sourceIcon = tx.entry_source === 'Web' ? '🌐' : '✈️';
      const sourceClass = tx.entry_source === 'Web' ? 'web' : 'telegram';
      const sourceLabel = tx.entry_source || 'Telegram';

      return `
        <tr>
          <td class="mono">${new Date(tx.transaction_date).toLocaleDateString('id-ID')}</td>
          <td>
            <div style="color: var(--text-primary); font-weight: 500;">${tx.item_name}</div>
            <div class="text-muted" style="font-size: 0.75rem; margin-top: 2px;">${tx.transaction_notes || '-'}</div>
          </td>
          <td><span class="status-badge" style="background: rgba(255,255,255,0.05)">${tx.category}</span></td>
          <td class="mono ${tx.transaction_type === 'Income' ? 'positive' : 'negative'}" style="font-weight: 600;">
            ${tx.transaction_type === 'Income' ? '+' : '-'}${formatIDR(tx.amount)}
          </td>
          <td>
            <div class="source-tag ${sourceClass}">
              <i>${sourceIcon}</i>
              <span>${sourceLabel}</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center error-msg">Gagal memuat transaksi.</td></tr>';
  }
}

function renderCharts(data) {
  if (!data || !data.daily_trend || typeof Chart === 'undefined') return;

  // 1. Trend Chart
  const trendCtx = document.getElementById('trendChart')?.getContext('2d');
  if (trendCtx) {
    if (trendChart) trendChart.destroy();
    const dates = Object.keys(data.daily_trend).sort();
    const labels = dates.map(d => d.split('-')[2]);
    
    trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: dates.map(d => data.daily_trend[d].income),
            borderColor: '#4caf82',
            backgroundColor: 'rgba(76,175,130,0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Pengeluaran',
            data: dates.map(d => data.daily_trend[d].expense),
            borderColor: '#7c6ef5',
            backgroundColor: 'rgba(124,110,245,0.1)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', align: 'end', labels: { color: '#9899aa', font: { size: 10 } } } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#5a5b72', font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: '#5a5b72', font: { size: 10 } } }
        }
      }
    });
  }

  // 2. Category Chart
  const catCtx = document.getElementById('categoryChart')?.getContext('2d');
  if (catCtx) {
    if (categoryChart) categoryChart.destroy();
    const catLabels = Object.keys(data.categories);
    const values = Object.values(data.categories);

    categoryChart = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: values,
          backgroundColor: ['#7c6ef5', '#a78df9', '#29b6f6', '#4caf82', '#e8a87c', '#f56565'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#9899aa', font: { size: 11 } } } },
        cutout: '75%'
      }
    });
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
  el.innerHTML = insights[0].replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--accent-light)">$1</b>');
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
    loadBudgets();
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
  const grid = document.getElementById('assetsGrid');
  if (!grid) return;

  try {
    const res = await fetch(API.accounts);
    const { accounts, totalAssets } = await res.json();

    let html = `
      <div class="asset-card total-card">
        <div class="account-info">
          <div class="account-icon">💰</div>
          <span class="account-name">Total Aset</span>
        </div>
        <div class="asset-value">${formatIDR(totalAssets)}</div>
      </div>
    `;

    html += accounts.map(acc => {
      // Smart Icon Detection
      let icon = '💰';
      const name = acc.name.toLowerCase();
      
      if (name.includes('bca') || name.includes('mandiri') || name.includes('bni') || name.includes('bank') || name.includes('permata') || name.includes('bri')) {
        icon = '🏛️';
      } else if (name.includes('gopay') || name.includes('ovo') || name.includes('dana') || name.includes('linkaja') || name.includes('shopeepay') || name.includes('wallet')) {
        icon = '💳';
      } else if (name.includes('cash') || name.includes('tunai') || name.includes('dompet') || name.includes('saku')) {
        icon = '💵';
      }

      return `
        <div class="asset-card">
          <div class="account-info">
            <div class="account-icon">${acc.icon || icon}</div>
            <div class="account-name-wrapper">
              <span class="account-name">${acc.name}</span>
              <span class="account-status">Aktual • Sinkron</span>
            </div>
          </div>
          <div class="asset-value">${formatIDR(acc.balance)}</div>
        </div>
      `;
    }).join('');

    grid.innerHTML = html;
  } catch (err) {
    grid.innerHTML = '<div class="asset-card loading">Gagal memuat aset</div>';
  }
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
      <div class="account-edit-card account-row" data-id="${acc.id}">
        <div class="account-type-icon">${acc.icon || '💳'}</div>
        <div class="account-details">
          <input type="text" class="account-name-input" value="${acc.name}" placeholder="Nama Akun..." />
          <span class="account-balance-label">Saldo Saat Ini</span>
        </div>
        <div class="account-balance-area">
          <div class="budget-input-wrapper">
            <span class="currency-prefix">Rp</span>
            <input type="text" 
                   class="budget-input account-balance-input" 
                   value="${acc.balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}" 
                   placeholder="0" />
          </div>
        </div>
        <button class="btn-delete-account" onclick="this.parentElement.remove()">×</button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = 'Gagal memuat data akun.';
  }
}

function addNewAccountRow() {
  const container = document.getElementById('accountFormList');
  const div = document.createElement('div');
  div.className = 'account-edit-card account-row new-account';
  div.innerHTML = `
    <div class="account-type-icon">💳</div>
    <div class="account-details">
      <input type="text" class="account-name-input" placeholder="Misal: Bank BCA, Cash..." />
      <span class="account-balance-label">Saldo Awal</span>
    </div>
    <div class="account-balance-area">
      <div class="budget-input-wrapper">
        <span class="currency-prefix">Rp</span>
        <input type="text" class="budget-input account-balance-input" placeholder="0" />
      </div>
    </div>
    <button class="btn-delete-account" onclick="this.parentElement.remove()">×</button>
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
