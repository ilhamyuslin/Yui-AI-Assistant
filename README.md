# 🤖 AI Assistant — Telegram + Gemini

Personal AI Assistant berbasis Telegram yang ditenagai Google Gemini, dengan Web Dashboard untuk konfigurasi.

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

## ⚙️ Setup Awal (Penting!)

### 1. Tambahkan User ID kamu ke Whitelist

Bot ini private — hanya user yang terdaftar yang bisa chat.

1. Buka Telegram, cari **@userinfobot**
2. Kirim pesan apa saja
3. Salin angka **Id** yang dikembalikan
4. Buka dashboard → tab **Whitelist**
5. Paste ID kamu → klik **Simpan Whitelist**

### 2. Verifikasi Konfigurasi

Buka dashboard → **Konfigurasi** → klik **Test Koneksi** (Telegram) dan **Test API Key** (Gemini) untuk memastikan semua terhubung.

---

## 📁 Struktur Project

```
AI-Assistant/
├── src/
│   ├── index.js              # Entry point
│   ├── bot/
│   │   ├── botManager.js     # Lifecycle bot (start/stop/restart)
│   │   └── handlers.js       # Handler pesan Telegram
│   ├── ai/
│   │   └── gemini.js         # Wrapper Gemini API + multi-turn chat
│   ├── server/
│   │   ├── apiServer.js      # Express server + auth session
│   │   └── routes/
│   │       └── configRoutes.js # API routes dashboard
│   └── storage/
│       ├── configStore.js    # Baca/tulis config dari Supabase
│       ├── historyStore.js   # Chat history per user (persistent)
│       ├── logger.js         # Log percakapan ke Supabase
│       └── supabaseClient.js # Singleton Supabase client
├── dashboard/
│   ├── index.html            # Web Config Panel
│   ├── style.css             # Dark glassmorphism UI
│   └── app.js                # Dashboard logic (auth, config, test)
├── .env                      # Environment variables
└── package.json
```

---

## 🎮 Perintah Bot

| Perintah | Fungsi |
|----------|--------|
| `/start` | Pesan sambutan |
| `/help`  | Tampilkan bantuan |
| `/clear` | Hapus riwayat percakapan |
| (teks biasa) | Chat dengan AI |

---

## 🗄️ Database (Supabase)

Menggunakan project **ExpenseTracker** di Supabase dengan tabel:

| Tabel | Fungsi |
|-------|--------|
| `ai_assistant_config` | Konfigurasi bot (single row) |
| `ai_chat_histories` | History percakapan per user |
| `ai_conversation_logs` | Log semua pesan masuk/keluar |

---

## 🔐 Keamanan

- ✅ Dashboard dilindungi session-based auth
- ✅ Whitelist user Telegram (private bot)
- ✅ API keys tidak pernah dikirim lengkap ke frontend (di-mask)
- ✅ Log percakapan di Supabase untuk audit
