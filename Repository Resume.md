# Repository Resume - Yui AI Assistant

## 🚀 Overview
Sistem asisten pribadi berbasis Telegram yang terintegrasi dengan dashboard keuangan (Vite/Supabase). Bot menggunakan **Google Gemini 2.0 Flash** untuk ekstraksi data natural language dan query informasi keuangan.

---

## 🛠️ Tech Stack
*   **Backend**: Node.js, `node-telegram-bot-api`, `@google/generative-ai`
*   **Database**: Supabase (PostgreSQL)
*   **Frontend**: React (Vite), TailwindCSS, Framer Motion
*   **Deployment**: Vercel (Bot & Dashboard)

---

## 📁 Architecture Overview

### 1. Bot Engine (`/src/bot/`)
*   **`botManager.js`**: Lifecycle bot (Start, Stop, Restart, Status). Mendukung mode Polling (lokal) dan Webhook (Vercel).
*   **`handlers.js`**: Logic utama pemrosesan pesan.
    *   `message handler`: Alur utama (User Chat → AI → Ekstraksi Data → Konfirmasi).
*   **`scheduler.js`** & **`heartbeatService.js`**
    *   `initScheduler()`: Menjalankan tugas otomatis terjadwal.
    *   `startHeartbeat()`: Mengirim sinyal "I'm Alive" ke database agar dashboard tahu bot sedang online.

### 2. AI & Data Extraction (`/src/ai/`)
*   **`gemini.js`**
    *   `initGemini(config)`: Inisialisasi API Key Google Gemini.
    *   `chat(message, history, categories)`: Mengirim pesan ke AI dengan konteks keuangan & kategori yang tersedia.
*   **`tools/expenseSchema.js`**: `request_record_transaction` (Ekstraksi data transaksi baru).
*   **`tools/accountSchema.js`**: `get_account_balances` (Cek saldo akun & total aset via bot).
*   **`tools/investmentSchema.js`**: `get_investment_portfolio` (Cek status investasi & profit/loss via bot).
*   **`tools/summarySchema.js`**: `get_financial_stats` & `get_recent_transactions` (Cek statistik & riwayat dengan dukungan filter tanggal/tipe via bot).
*   **`tools/budgetSchema.js`**: `get_budget_status` (Cek sisa budget vs limit kategori via bot).
*   **`tools/registry.js`**: Central dispatcher untuk mengelola semua tool AI dan menghubungkannya ke handler.

### 3. Database Operations (`/src/storage/`)
*   **`expenseStore.js`**: `saveTransaction()`, `deleteTransaction()` (CRUD transaksi + sync saldo).
*   **`accountStore.js`**: `getAccounts()`, `getAccountByName()` (Fetch data saldo akun).
*   **`investmentStore.js`**: `getInvestments()` (Fetch data portofolio & kalkulasi P/L).
*   **`summaryStore.js`**: `getFinancialSummary()`, `getRecentTransactions()` (Fetch statistik & riwayat).
*   **`budgetStore.js`**: `getBudgets()` (Fetch data limit vs realisasi budget).
*   **`historyStore.js`**: `getHistory()`, `appendHistory()`, `clearHistory()` (Manajemen konteks chat).
### 4. Frontend Dashboard (`/frontend/src/`)
*   **`DashboardLayout.jsx`**: Core layout menggunakan **Fixed Viewport Architecture** (`fixed inset-0`) untuk kestabilan di mobile.
    *   Mendukung *Floating Navigation Island* di mobile dan *Sidebar* di desktop.
    *   Implementasi `mobile-nav` class untuk kontrol dinamis via CSS.
*   **`index.css`**: Global scroll locking (`overflow: hidden` pada html/body) untuk mencegah *layout jump* pada browser mobile.
*   **`Chat.jsx`**: Interface AI Chat dengan sistem **Elastic Container** (`flex-1`).
    *   **Interactive Token Tooltip**: Monitoring penggunaan token 100K sekaligus tempat tombol "Reset Riwayat".
    *   **Keyboard Awareness**: Otomatisasi penyembunyian navigasi saat input aktif untuk pengalaman ala WhatsApp.

---

## 🔐 Key Features & Rules
1.  **Strict Whitelist**: Hanya user yang ID-nya terdaftar di database yang bisa menggunakan bot.
2.  **Tool registry**: Semua fungsi AI dipisahkan per modul untuk kemudahan maintenance.
3.  **Real-time Sync**: Transaksi yang dicatat via bot langsung merubah saldo akun dan muncul di dashboard.
4.  **Confirm-First**: AI tidak akan menyimpan data sebelum user menekan tombol "Simpan" di Telegram.
5.  **Modular Storage**: Setiap domain data (Budget, Investment, Summary) memiliki Store sendiri.

## 📝 Update Logs (Recent)
*   [2026-05-02] **Stabilisasi Mobile Viewport**: Implementasi layout `fixed inset-0` dan global scroll locking untuk mencegah pergeseran UI akibat *address bar* browser mobile.
*   [2026-05-02] **Refactoring UI Chat & Minimalis Mode**: 
    *   Penghapusan header atas untuk memaksimalkan ruang pandang (Desktop & Mobile).
    *   Relokasi fitur "Hapus Riwayat" ke dalam **Interactive Token Tooltip** (Pop-up).
    *   Implementasi **Responsive Placeholder** ("Ketik pesan..." khusus mobile).
*   [2026-05-02] **Keyboard-Aware Layout**: Automasi penyembunyian navigasi bawah dan penyesuaian padding kontainer saat input chat fokus di perangkat seluler.
*   [2026-05-02] **Account Management Tool**: Implementasi `accountSchema.js` dan `accountStore.js` untuk integrasi pengecekan saldo akun via AI.
