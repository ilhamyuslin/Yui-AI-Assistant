/**
 * chatRoutes.js
 * API endpoints for the Web Chat AI feature.
 * Mirrors bot handler logic but adapted for HTTP request/response cycle.
 */

const express = require('express');
const router = express.Router();

const { chat } = require('../../ai/gemini');
const { getConfig } = require('../../storage/configStore');
const { getHistory, appendHistory, clearHistory } = require('../../storage/historyStore');
const { saveTransaction } = require('../../storage/expenseStore');
const { getToolHandler } = require('../../ai/tools/registry');

// Users are authenticated via apiServer middleware (req.user)

// ─── GET /api/chat/history ───────────────────────────────────
// Mengambil riwayat percakapan saat halaman chat dibuka
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { history, total_tokens } = await getHistory(userId);

    // Map internal history format to frontend format
    const formattedHistory = history.map(msg => ({
      id: Math.random().toString(36).substring(7),
      sender: msg.role === 'model' ? 'ai' : 'user',
      text: msg.parts?.[0]?.text || '',
      timestamp: new Date()
    }));

    res.json({
      success: true,
      data: formattedHistory,
      totalTokens: total_tokens || 0
    });
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
    const userId = req.user.id;
    const userEmail = req.user.email;
    const config = await getConfig(userId);

    console.log(`[ChatDebug] Request by: ${userEmail} (${userId})`);
    console.log(`[ChatDebug] Config for User: ${config.user_id || userId}`);
    console.log(`[ChatDebug] API Key found: ${!!config.gemini_api_key}`);
    console.log(`[ChatDebug] System Instruction (Start): "${config.system_instruction?.substring(0, 30)}..."`);

    if (!config.gemini_api_key) {
      console.log(`[ChatDebug] BLOCKED: User ${userId} has no API Key`);
      return res.status(400).json({ error: 'Gemini API Key belum dikonfigurasi. Silakan set di halaman Konfigurasi.' });
    }

    const userName = req.user.user_metadata?.first_name || 'User';

    // Get conversation history
    const { history: rawHistory } = await getHistory(userId);

    // Format history for Gemini to prevent it from mimicking the [PENDING_TX] raw string
    const history = rawHistory.map((turn, idx) => {
      const text = turn.parts?.[0]?.text || '';
      if (turn.role === 'model' && text.includes('[PENDING_TX]')) {
        // Hanya beri nomor index untuk draf di pesan PALING BARU supaya AI gak bingung
        const isLastModelMessage = !rawHistory.slice(idx + 1).some(t => t.role === 'model' && t.parts?.[0]?.text?.includes('[PENDING_TX]'));
        
        let draftIdx = 0;
        const cleanText = text.replace(/\[PENDING_TX\]\s*(\{.*\})/g, (match, json) => {
          try {
            const d = JSON.parse(json);
            const label = isLastModelMessage ? `[DRAF #${draftIdx++}]` : `[DRAF LAMA]`;
            return `${label}: ${d.item_name || 'Transaksi'} senilai ${d.amount || 0} via ${d.source_of_fund || 'akun'}.`;
          } catch (e) { return 'Draf transaksi ditampilkan.'; }
        });
        return { role: 'model', parts: [{ text: cleanText }] };
      }
      return turn;
    });

    // Fetch actual categories from budgets table
    const { getCategories } = require('../../storage/budgetStore');
    const catResult = await getCategories(userId);
    const categories = catResult.success ? catResult.data : [];

    // Send to Gemini with user-specific config
    const aiResponse = await chat(message.trim(), history, categories, config);

    // ── Handle Tool Calls ──────────────────────────────────────
    if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
      const pendingDrafts = [];
      let immediateResult = null;

      for (const call of aiResponse.functionCalls) {
        const functionName = call.name;
        const args = call.args;

        // 1. Tool Transaksi Langsung
        if (functionName === 'request_record_transaction') {
          console.log(`[DraftDebug] AI Request: ${args.item_name}, Index: ${args.draft_index}`);
          pendingDrafts.push({ ...args, _itemType: 'transaction' });
          continue;
        }

        // 2. Tool via Registry (Account, Budget, dll)
        const handler = getToolHandler(functionName);
        if (handler) {
          try {
            const ctx = { userId, userName, functionCall: { name: functionName } };
            const result = await handler(args, ctx, functionName);

            if (result && result.type && result.type.startsWith('PENDING_')) {
              let itemType = 'transaction';
              if (result.type.includes('ACCOUNT')) itemType = result.type.includes('DELETE') ? 'account_delete' : 'account';
              if (result.type.includes('BUDGET')) itemType = result.type.includes('DELETE') ? 'budget_delete' : 'budget';

              pendingDrafts.push({ ...result.data, _itemType: itemType });
            } else if (result && (result.type === 'DATA' || result.type === 'FORMATTED_REPORT')) {
              immediateResult = result;
            }
          } catch (err) {
            console.error(`[ToolError] ${functionName}:`, err);
          }
        }
      }

      // Jika ada draf yang terkumpul
      if (pendingDrafts.length > 0) {
        const draftSummary = pendingDrafts.map(d => {
          const type = (d._itemType || 'item').toUpperCase();
          const name = d.item_name || d.name || d.category || 'Transaksi';
          return `- [DRAF ${type}]: ${name}`;
        }).join('\n');

        // Simpan ke history dengan teks kosong agar AI tidak berhalusinasi menulis ulang draf di chat
        const { total_tokens } = await appendHistory(userId, userName, message.trim(), "", aiResponse.tokensUsed);

        return res.json({
          type: 'PENDING_MULTI',
          data: pendingDrafts,
          text: null,
          totalTokens: total_tokens
        });
      }

      // Jika tool mengembalikan hasil data langsung (seperti cek laporan)
      if (immediateResult) {
        if (immediateResult.type === 'DATA') {
          const extendedHistory = [
            ...history,
            { role: 'user', parts: [{ text: message.trim() }] },
            { role: 'model', parts: [{ functionCall: { name: aiResponse.functionCalls[0].name, args: aiResponse.functionCalls[0].args } }] },
            { role: 'function', parts: [{ functionResponse: { name: aiResponse.functionCalls[0].name, response: { data: immediateResult.data } } }] }
          ];
          const finalAiResponse = await chat("Tolong rangkum hasil data di atas sesuai pertanyaanku sebelumnya secara natural dan singkat.", extendedHistory, categories, config);
          const { total_tokens } = await appendHistory(userId, userName, message.trim(), finalAiResponse.text, finalAiResponse.tokensUsed);
          return res.json({
            type: 'TEXT',
            text: finalAiResponse.text,
            totalTokens: total_tokens
          });
        }

        if (immediateResult.type === 'FORMATTED_REPORT') {
          const { total_tokens } = await appendHistory(userId, userName, message.trim(), immediateResult.data, aiResponse.tokensUsed);
          return res.json({
            type: 'TOOL_RESULT',
            text: immediateResult.data,
            totalTokens: total_tokens
          });
        }
      }
    }

    // ── Normal text response ───────────────────────────────────
    const cleanText = aiResponse.text.replace(/\[SISTEM:.*\]/g, '').replace(/\[PENDING_TX\].*/g, '').trim();
    const { total_tokens } = await appendHistory(userId, userName, message.trim(), cleanText || 'Ok, draf transaksi sudah disiapkan.', aiResponse.tokensUsed);
    return res.json({
      type: 'TEXT',
      text: cleanText || 'Ok, draf transaksi sudah disiapkan.',
      totalTokens: total_tokens
    });

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
    const userId = req.user.id;
    const result = await saveTransaction({ ...txData, user_id: userId });

    if (result.success) {
      const userName = req.user.user_metadata?.first_name || 'User';
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
    const userId = req.user.id;
    const userName = req.user.user_metadata?.first_name || 'User';
    await appendHistory(userId, userName, 'Batalkan transaksi.', 'Transaksi dibatalkan.');
    return res.json({ success: true });
  } catch (err) {
    console.error('[ChatRoute/cancel] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/chat/confirm-account ──────────────────────────
router.post('/confirm-account', async (req, res) => {
  const { accountData } = req.body;
  const { upsertAccount } = require('../../storage/accountStore');

  if (!accountData) return res.status(400).json({ error: 'Data akun tidak ditemukan.' });

  try {
    const userId = req.user?.id; // SECURITY: Always get ID from verified session
    if (!userId) return res.status(401).json({ error: 'Session tidak valid.' });

    const result = await upsertAccount({ ...accountData, user_id: userId });
    const userName = req.user.user_metadata?.first_name || 'User';

    if (result.success) {
      const confirmMsg = `✅ Akun ${accountData.name} berhasil disimpan dengan saldo Rp ${Number(accountData.balance || 0).toLocaleString('id-ID')}!`;
      await appendHistory(userId, userName, 'Konfirmasi simpan akun.', confirmMsg);
      return res.json({ success: true, message: confirmMsg });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/chat/delete-account ───────────────────────────
router.post('/delete-account', async (req, res) => {
  const { name, id } = req.body;
  const { deleteAccount } = require('../../storage/accountStore');

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Session tidak valid.' });

    const result = await deleteAccount({ id, name }, userId);
    const userName = req.user.user_metadata?.first_name || 'User';

    if (result.success) {
      const confirmMsg = `🗑️ Akun ${name} telah dihapus dari sistem.`;
      await appendHistory(userId, userName, 'Konfirmasi hapus akun.', confirmMsg);
      return res.json({ success: true, message: confirmMsg });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/chat/clear ─────────────────────────────────────
router.post('/clear', async (req, res) => {
  try {
    const userId = req.user.id;
    const { clearHistory } = require('../../storage/historyStore');
    await clearHistory(userId);
    return res.json({ success: true });
  } catch (err) {
    console.error('[ChatRoute/clear] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Budget Confirmation ──────────────────────────────────────
router.post('/confirm-budget', async (req, res) => {
  const { budgetData } = req.body;
  const { upsertBudget } = require('../../storage/budgetStore');

  if (!budgetData) return res.status(400).json({ error: 'Data anggaran tidak ditemukan.' });

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await upsertBudget({ ...budgetData, user_id: userId });
    if (result.success) {
      res.json({ success: true, message: result.message, data: result.data });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/delete-budget', async (req, res) => {
  const { category } = req.body;
  const { deleteBudget } = require('../../storage/budgetStore');

  if (!category) return res.status(400).json({ error: 'Kategori anggaran wajib diisi.' });

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await deleteBudget(category, userId);
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
