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

---

## 🔐 Key Features & Rules
1.  **Strict Whitelist**: Hanya user yang ID-nya terdaftar di database yang bisa menggunakan bot.
2.  **Tool registry**: Semua fungsi AI dipisahkan per modul untuk kemudahan maintenance.
3.  **Real-time Sync**: Transaksi yang dicatat via bot langsung merubah saldo akun dan muncul di dashboard.
4.  **Confirm-First**: AI tidak akan menyimpan data sebelum user menekan tombol "Simpan" di Telegram.
5.  **Modular Storage**: Setiap domain data (Budget, Investment, Summary) memiliki Store sendiri.

## 📝 Update Logs (Recent)
*   [2024-04-27] Implementasi Budget Tracking dengan dukungan Siklus Gajian otomatis.
*   [2024-04-27] Penambahan fitur Smart Filtering pada riwayat transaksi bot (Filter by Type/Date/Category).
*   [2024-04-27] Perbaikan modularitas: Pemisahan Schema dan Store untuk setiap domain tool AI.
