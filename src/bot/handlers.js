/**
 * handlers.js
 * Telegram message handlers.
 * - Whitelist check (private bot)
 * - /start, /help, /clear commands
 * - General message → Gemini → response
 * - Tool/Function Calling handler (Expense tracking)
 * - Confirmation flow with inline buttons
 */

const { chat, isReady } = require('../ai/gemini');
const { getHistory, appendHistory, clearHistory } = require('../storage/historyStore');
const { logMessage } = require('../storage/logger');
const { saveTransaction } = require('../storage/expenseStore');

// Active config reference
let activeConfig = {};
// Store for transactions awaiting user confirmation
const pendingTransactions = new Map();

/**
 * Utility to format ISO date to Indonesian readable string
 */
function formatDateIndo(isoString) {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return isoString;
  }
}

function setConfig(config) {
  activeConfig = config;
}

/**
 * Check if a user is whitelisted.
 */
function isWhitelisted(userId) {
  const whitelist = activeConfig.whitelisted_users || [];
  if (whitelist.length === 0) return false;
  return whitelist.includes(Number(userId)) || whitelist.includes(String(userId));
}

/**
 * Register all handlers on the bot instance.
 */
function registerHandlers(bot) {
  // /start command
  bot.onText(/\/start/, async (msg) => {
    const userId = msg.from.id;
    if (!isWhitelisted(userId)) return bot.sendMessage(msg.chat.id, '⛔ Maaf, bot ini bersifat private.');
    
    const welcomeText = `👋 Halo! Aku adalah AI Assistant pribadimu!\n\n` +
      `🤖 *Powered by Google Gemini*\n` +
      `💰 *Skill:* Aku bisa bantu catat pengeluaran/pemasukanmu!\n\n` +
      `*Perintah:*\n` +
      `/clear - Hapus riwayat chat\n` +
      `/help  - Bantuan\n\n` +
      `Silakan mulai ngobrol atau catat sesuatu! 😊`;
    await bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: 'Markdown' });
  });

  // /help command
  bot.onText(/\/help/, async (msg) => {
    const userId = msg.from.id;
    if (!isWhitelisted(userId)) return;
    const helpText = `📖 *Panduan Bot*\n\n` +
      `1. *Chat Bebas:* Tanya apa saja, aku akan menjawab.\n` +
      `2. *Catat Keuangan:* Kirim pesan seperti "Beli kopi 25rb bayar pake Dana". Aku akan mengekstrak datanya dan minta konfirmasi simpan.\n\n` +
      `*Perintah:*\n` +
      `/clear - Reset konteks percakapan\n` +
      `/help  - Tampilkan pesan ini`;
    await bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  });

  // /clear command
  bot.onText(/\/clear/, async (msg) => {
    const userId = msg.from.id;
    if (!isWhitelisted(userId)) return;
    await clearHistory(userId);
    await bot.sendMessage(msg.chat.id, '🗑️ Riwayat percakapan berhasil dihapus.');
  });

  // Handle Button Callbacks (Confirm/Cancel Transaction)
  bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const userId = callbackQuery.from.id;
    const [action, txId] = callbackQuery.data.split(':');

    if (action === 'TX_CONFIRM') {
      const pendingData = pendingTransactions.get(txId);
      if (!pendingData) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: 'Data tidak ditemukan atau sudah kadaluarsa.', show_alert: true });
      }

      // 1. Save to DB
      const result = await saveTransaction(pendingData);
      
      if (result.success) {
        // 2. Clear state immediately to prevent double processing
        pendingTransactions.delete(txId);

        // 3. Update UI
        let successText = `✅ *Berhasil Dicatat!*\n\n` +
          `💰 ${pendingData.item_name}\n` +
          `💵 Rp ${Number(pendingData.amount).toLocaleString('id-ID')}\n` +
          `📂 ${pendingData.category}\n` +
          `💳 ${pendingData.source_of_fund}\n` +
          `📅 ${formatDateIndo(result.data.transaction_date)}`;
        
        if (pendingData.transaction_type === 'Transfer' && pendingData.destination_account) {
          successText += ` ➡️ ${pendingData.destination_account}`;
        }

        if (result.warning) {
          successText += `\n\n${result.warning}`;
        }

        try {
          await bot.editMessageText(successText, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
          });
        } catch (err) {
          if (err.message.includes('message is not modified')) {
            // Ignore this error, it just means the message was already updated by another instance
          } else {
            console.error('[Handler] UI Update Error:', err.message);
          }
        }
      } else {
        await bot.sendMessage(msg.chat.id, `❌ Gagal menyimpan: ${result.error}`);
      }
    } 
    else if (action === 'TX_CANCEL') {
      pendingTransactions.delete(txId);
      await bot.editMessageText('❌ Pencatatan dibatalkan.', {
        chat_id: msg.chat.id,
        message_id: msg.message_id
      });
    }

    bot.answerCallbackQuery(callbackQuery.id);
  });

  // General text messages
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const userId = msg.from.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;
    const chatId = msg.chat.id;
    const userMessage = msg.text;

    if (!isWhitelisted(userId)) return bot.sendMessage(chatId, '⛔ Akses ditolak.');
    if (!isReady()) return bot.sendMessage(chatId, '⚠️ AI belum siap.');

    await bot.sendChatAction(chatId, 'typing');
    logMessage({ userId, username, firstName, role: 'user', message: userMessage });

    try {
      const history = await getHistory(userId);
      
      // Inject REAL-TIME date context so AI knows "Today" and "Yesterday"
      const now = new Date();
      const dateContext = `\n\n[CONTEXT] Today's Date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Time: ${now.toLocaleTimeString('en-US', { hour12: false })}. Use this to calculate relative dates like 'yesterday' or 'last week'. Always provide transaction_date in ISO format if user mentions a specific time.`;
      
      const { text: aiReply, tokensUsed, functionCalls } = await chat(userMessage + dateContext, history);

      // 1. Handle Function Calls (Mental Model: AI Requesting Action)
      if (functionCalls && functionCalls.length > 0) {
        for (let i = 0; i < functionCalls.length; i++) {
          const call = functionCalls[i];
          if (call.name !== 'request_record_transaction') continue;

          const args = call.args;
          const uniqueTxId = `${userId}_${Date.now()}_${i}`;
          args.message_id = msg.message_id;

          // Save to pending state using unique ID
          pendingTransactions.set(uniqueTxId, args);

          // Build summary for confirmation
          const summary = `📝 *Konfirmasi Pencatatan (${i + 1}/${functionCalls.length})*\n\n` +
            `🔹 *Item:* ${args.item_name}\n` +
            `🔹 *Nominal:* Rp ${Number(args.amount).toLocaleString('id-ID')}\n` +
            `🔹 *Tipe:* ${args.transaction_type}\n` +
            `🔹 *Kategori:* ${args.category}\n` +
            `🔹 *Dari Akun:* ${args.source_of_fund}\n` +
            `${args.transaction_type === 'Transfer' && args.destination_account ? `🔹 *Ke Akun:* ${args.destination_account}\n` : ''}` +
            `🔹 *Tanggal:* ${formatDateIndo(args.transaction_date || new Date().toISOString())}\n` +
            `${args.transaction_notes ? `🔹 *Catatan:* ${args.transaction_notes}\n` : ''}\n` +
            `*Apakah data di atas sudah benar?*`;

          const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '✅ Simpan', callback_data: `TX_CONFIRM:${uniqueTxId}` },
                { text: '❌ Batal', callback_data: `TX_CANCEL:${uniqueTxId}` }
              ]]
            }
          };

          await bot.sendMessage(chatId, summary, opts);
        }
        return; // End flow after sending all confirmations
      }

      // 2. Handle Normal Response (General Chat or Data Ask)
      await appendHistory(userId, username, userMessage, aiReply);
      logMessage({ userId, username, firstName, role: 'model', message: aiReply, tokensUsed });

      await bot.sendMessage(chatId, aiReply, { parse_mode: 'Markdown' }).catch(() => {
        return bot.sendMessage(chatId, aiReply);
      });

    } catch (err) {
      console.error('[Handler] Error:', err.message);
      await bot.sendMessage(chatId, `❌ Kesalahan: ${err.message}`);
    }
  });

  console.log('[Bot] Handlers registered with Tools support.');
}

module.exports = { registerHandlers, setConfig };
