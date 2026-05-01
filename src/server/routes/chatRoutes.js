/**
 * chatRoutes.js
 * API endpoints for the Web Chat AI feature.
 * Mirrors bot handler logic but adapted for HTTP request/response cycle.
 */

const express = require('express');
const router = express.Router();

const { initGemini, chat } = require('../../ai/gemini');
const { getConfig } = require('../../storage/configStore');
const { getHistory, appendHistory, clearHistory } = require('../../storage/historyStore');
const { saveTransaction } = require('../../storage/expenseStore');
const { getToolHandler } = require('../../ai/tools/registry');

// Users are authenticated via apiServer middleware (req.user)

/**
 * Helper: Load config and initialize Gemini before each request.
 * This ensures the latest config (model, API key, system_instruction) is always used.
 */
async function ensureGeminiReady() {
  const config = await getConfig();
  if (!config.gemini_api_key) {
    throw new Error('Gemini API Key belum dikonfigurasi. Silakan set di halaman Konfigurasi.');
  }
  initGemini(config);
  return config;
}

// ─── GET /api/chat/history ───────────────────────────────────
// Mengambil riwayat percakapan saat halaman chat dibuka
router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id || 'web_user';
    const history = await getHistory(userId);
    
    // Map internal history format to frontend format
    const formattedHistory = history.map(msg => ({
      id: Math.random().toString(36).substring(7),
      sender: msg.role === 'model' ? 'ai' : 'user',
      text: msg.parts[0]?.text || '',
      timestamp: new Date()
    }));

    res.json({ success: true, data: formattedHistory });
  } catch (error) {
    console.error('[Chat API] History Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/chat ───────────────────────────────────────────
// Main chat endpoint. Sends a user message to Gemini and returns AI response.
router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  try {
    await ensureGeminiReady();

    const userId = req.user?.id || 'web_user';
    const userName = req.user?.user_metadata?.first_name || 'web_user';
    
    // Get conversation history
    const rawHistory = await getHistory(userId);

    // Format history for Gemini to prevent it from mimicking the [PENDING_TX] raw string
    const history = rawHistory.map(turn => {
      if (turn.role === 'model' && turn.parts[0]?.text?.startsWith('[PENDING_TX]')) {
        return {
          role: 'model',
          parts: [{
            text: turn.parts[0].text.replace(
              /\[PENDING_TX\](.*)/,
              '[SISTEM: Draf transaksi telah ditampilkan ke layar UI. Jika user meminta ralat/revisi, KAMU WAJIB memanggil ulang fungsi request_record_transaction dengan data yang baru.]'
            )
          }]
        };
      }
      return turn;
    });

    // Fetch actual categories from budgets table
    const { getCategories } = require('../../storage/budgetStore');
    const catResult = await getCategories();
    const categories = catResult.success ? catResult.data : [];

    // Send to Gemini
    const aiResponse = await chat(message.trim(), history, categories);

    // ── Handle Tool Calls ──────────────────────────────────────
    if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
      // Cari apakah AI memanggil tool transaksi (bisa lebih dari satu kali)
      const txCalls = aiResponse.functionCalls.filter(c => c.name === 'request_record_transaction');

      if (txCalls.length > 0) {
        const txDatas = txCalls.map(c => c.args);

        // Append to history with pending markers
        await appendHistory(
          userId,
          userName,
          message.trim(),
          txDatas.map(t => `[PENDING_TX] ${JSON.stringify(t)}`).join('\n')
        );

        return res.json({
          type: 'PENDING_TX_MULTI',
          data: txDatas,
        });
      }

      // GENERIC TOOL: Execute and return result as text
      const call = aiResponse.functionCalls[0]; // For generic query tool process the first
      const handler = getToolHandler(call.name);
      if (handler) {
        const result = await handler(call.args, { userId });

        if (result.type === 'DATA') {
          // KEMBALIKAN HASIL TOOL KE GEMINI AGAR BISA DIRANGKUM
          // Karena kita tidak menyimpan session Gemini secara stateful di request ini,
          // kita akan memanggil `chat` sekali lagi dengan menambahkan functionCall dan functionResponse ke history.
          
          const extendedHistory = [
            ...history,
            { role: 'user', parts: [{ text: message.trim() }] },
            { role: 'model', parts: [{ functionCall: { name: call.name, args: call.args } }] },
            { role: 'function', parts: [{ functionResponse: { name: call.name, response: { data: result.data } } }] }
          ];
          
          // Minta Gemini membaca hasil tool dan memberikan jawaban akhir
          const finalAiResponse = await chat("Tolong rangkum hasil data di atas sesuai pertanyaanku sebelumnya secara natural dan singkat.", extendedHistory, categories);
          
          await appendHistory(userId, userName, message.trim(), finalAiResponse.text);
          return res.json({ type: 'TEXT', text: finalAiResponse.text });
          
        } else if (result.type === 'FORMATTED_REPORT') {
          // Laporan langsung dicetak ke layar tanpa diproses ulang oleh AI untuk mencegah rusaknya format
          await appendHistory(userId, userName, message.trim(), result.data);
          return res.json({ type: 'TOOL_RESULT', text: result.data });
        } else if (result.type === 'ERROR') {
          return res.json({ type: 'TEXT', text: `⚠️ ${result.data}` });
        }
      }
    }

    // ── Normal text response ───────────────────────────────────
    await appendHistory(userId, userName, message.trim(), aiResponse.text);
    return res.json({ type: 'TEXT', text: aiResponse.text });

  } catch (err) {
    console.error('[ChatRoute] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan internal.' });
  }
});

// ─── POST /api/chat/confirm ───────────────────────────────────
// Confirms and saves a pending transaction after user clicks "Simpan".
router.post('/confirm', async (req, res) => {
  const { txData } = req.body;

  if (!txData) {
    return res.status(400).json({ error: 'Data transaksi tidak ditemukan.' });
  }

  try {
    const result = await saveTransaction(txData);

    const userId = req.user?.id || 'web_user';
    const userName = req.user?.user_metadata?.first_name || 'web_user';

    if (result.success) {
      const confirmMsg = `✅ Berhasil disimpan!\n\n${txData.item_name} — Rp ${Number(txData.amount).toLocaleString('id-ID')}\nKategori: ${txData.category}\nSumber: ${txData.source_of_fund}${result.warning ? `\n\n${result.warning}` : ''}`;
      await appendHistory(userId, userName, 'Konfirmasi simpan transaksi.', confirmMsg);
      return res.json({ success: true, message: confirmMsg, warning: result.warning || null });
    } else {
      return res.status(500).json({ error: result.error || 'Gagal menyimpan transaksi.' });
    }
  } catch (err) {
    console.error('[ChatRoute/confirm] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/chat/cancel ────────────────────────────────────
// Cancels a pending transaction. Just appends to history.
router.post('/cancel', async (req, res) => {
  try {
    const userId = req.user?.id || 'web_user';
    const userName = req.user?.user_metadata?.first_name || 'web_user';
    await appendHistory(userId, userName, 'Batalkan transaksi.', 'Transaksi dibatalkan.');
    return res.json({ success: true });
  } catch (err) {
    console.error('[ChatRoute/cancel] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/chat/clear ─────────────────────────────────────
// Clears the entire conversation history for the web user.
router.post('/clear', async (req, res) => {
  try {
    const userId = req.user?.id || 'web_user';
    await clearHistory(userId);
    return res.json({ success: true });
  } catch (err) {
    console.error('[ChatRoute/clear] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
