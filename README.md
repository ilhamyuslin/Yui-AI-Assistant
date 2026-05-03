# 🤖 AI Assistant — Web Chat + Gemini

Personal AI Assistant berbasis Web Chat yang ditenagai Google Gemini, dengan Web Dashboard untuk statistik dan manajemen keuangan.

---

## 🚀 Cara Menjalankan

```bash
# Dari folder project
export PATH="/Users/ilham/Documents/Project/Node/node-runtime/bin:$PATH"
node src/index.js
```

Atau untuk development (auto-restart saat file berubah):
```bash
export PATH="/Users/ilham/Documents/Project/Node/node-runtime/bin:$PATH"
npm run dev
```

Dashboard tersedia di: **http://localhost:3000**
Password: **1234567890**

---

### 1. Verifikasi Konfigurasi
Buka dashboard → **Konfigurasi** → klik **Test API Key** (Gemini) untuk memastikan koneksi ke AI lancar.

---

## 📁 Struktur Project

```
AI-Assistant/
├── src/
│   ├── index.js              # Entry point (Web Chat Only)
│   ├── ai/
│   │   ├── gemini.js         # Wrapper Gemini API
│   │   └── tools/            # AI Tool Schemas (Budget, Expense, etc.)
│   ├── server/
│   │   ├── apiServer.js      # Express server + auth session
│   │   └── routes/           # API routes (Chat, Config, Accounts, etc.)
│   └── storage/
│       ├── configStore.js    # Baca/tulis config dari Supabase
│       ├── historyStore.js   # Chat history per user (persistent)
│       ├── expenseStore.js   # Simpan transaksi keuangan
│       └── supabaseClient.js # Singleton Supabase client
├── dashboard/
│   ├── index.html            # Web Config Panel
│   ├── style.css             # Dark glassmorphism UI
│   └── app.js                # Dashboard logic (auth, config, test)
├── .env                      # Environment variables
└── package.json
```

---

---

## 🗄️ Database (Supabase)

Menggunakan project **ExpenseTracker** di Supabase dengan tabel:

| Tabel | Fungsi |
|-------|--------|
| `ai_assistant_config` | Konfigurasi sistem AI |
| `ai_chat_histories` | History percakapan per user |
| `profiles` | Data user & konfigurasi cycle |

---

## 🔐 Keamanan

- ✅ Dashboard dilindungi session-based auth
- ✅ Web Chat Interface
- ✅ API keys tidak pernah dikirim lengkap ke frontend (di-mask)
- ✅ Log percakapan di Supabase untuk audit
