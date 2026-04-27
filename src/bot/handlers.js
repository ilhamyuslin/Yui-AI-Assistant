/**
 * handlers.js
 * Core logic for processing Telegram messages and interactions.
 * Handles AI chat, transaction confirmations, and tool execution.
 */

const { chat } = require('../ai/gemini');
const { saveTransaction } = require('../storage/expenseStore');
const { getHistory, appendHistory, clearHistory } = require('../storage/historyStore');
const { getAccounts } = require('../storage/accountStore');
const { getToolHandler } = require('../ai/tools/registry');

let activeConfig = {};

/**
 * Update global config used by handlers (whitelist, etc).
 */
function setConfig(config) {
  activeConfig = config;
}

/**
 * Checks if a user is in the authorized whitelist.
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
      `🤖 Powered by Google Gemini\n` +
      `💰 Skill: Aku bisa bantu catat pengeluaran/pemasukanmu!\n\n` +
      `Perintah:\n` +
      `/clear - Hapus riwayat chat\n` +
      `/help  - Bantuan\n\n` +
      `Silakan mulai ngobrol atau catat sesuatu! 😊`;
    await bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: 'Markdown' });
  });

  // /help command
  bot.onText(/\/help/, async (msg) => {
    const userId = msg.from.id;
    if (!isWhitelisted(userId)) return;
    const helpText = `📖 Panduan Bot\n\n` +
      `1. Chat Bebas: Tanya apa saja, aku akan menjawab.\n` +
      `2. Catat Keuangan: Kirim pesan seperti "Beli kopi 25rb bayar pake Dana". Aku akan mengekstrak datanya dan minta konfirmasi simpan.\n\n` +
      `Perintah:\n` +
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

    if (!isWhitelisted(userId)) return;

    if (action === 'confirm') {
      const txData = global.pendingTransactions?.[userId];
      if (!txData) return bot.sendMessage(msg.chat.id, '⚠️ Data transaksi sudah kedaluwarsa.');

      const result = await saveTransaction(txData);
      if (result.success) {
        await bot.editMessageText(`✅ *Berhasil disimpan!*\n\n💰 ${txData.item_name}\n💵 Rp ${txData.amount.toLocaleString('id-ID')}\n📂 ${txData.category}\n💳 ${txData.source_of_fund}`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: 'Markdown'
        });
        delete global.pendingTransactions[userId];
        await appendHistory(userId, 'user', 'Konfirmasi simpan.');
        await appendHistory(userId, 'model', 'Berhasil disimpan!');
      } else {
        await bot.sendMessage(msg.chat.id, `❌ Gagal menyimpan: ${result.error}`);
      }
    } else if (action === 'cancel') {
      await bot.editMessageText('❌ Transaksi dibatalkan.', {
        chat_id: msg.chat.id,
        message_id: msg.message_id
      });
      delete global.pendingTransactions?.[userId];
      await appendHistory(userId, 'user', 'Batalkan transaksi.');
      await appendHistory(userId, 'model', 'Transaksi dibatalkan.');
    }
  });

  // Main Message Handler (Natural Language Chat)
  bot.on('message', async (msg) => {
    if (msg.text?.startsWith('/')) return; // Ignore commands
    
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const userText = msg.text;

    if (!isWhitelisted(userId)) return;

    try {
      // 1. Get Conversation Context
      const history = await getHistory(userId);
      const accResult = await getAccounts();
      const categories = accResult.success ? [...new Set(accResult.data.accounts.map(a => a.name))] : [];

      // 2. Process with AI
      const aiResponse = await chat(userText, history, categories);

      // 3. Handle Tool Calls (Extraction or Query)
      if (aiResponse.functionCalls) {
        for (const call of aiResponse.functionCalls) {
          const handler = getToolHandler(call.name);
          
          if (call.name === 'request_record_transaction') {
            // SPECIAL CASE: Expense extraction needs buttons
            const txData = call.args;
            global.pendingTransactions = global.pendingTransactions || {};
            global.pendingTransactions[userId] = txData;

            const confirmText = `🧐 *Konfirmasi Catatan*\n\n` +
              `📝 Item: ${txData.item_name}\n` +
              `💰 Jumlah: Rp ${txData.amount.toLocaleString('id-ID')}\n` +
              `📂 Kategori: ${txData.category}\n` +
              `💳 Sumber: ${txData.source_of_fund}\n` +
              (txData.transaction_notes ? `🗒️ Memo: ${txData.transaction_notes}\n` : '') +
              `📅 Tanggal: ${txData.transaction_date}\n\n` +
              `Simpan sekarang?`;

            await bot.sendMessage(chatId, confirmText, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Simpan', callback_data: `confirm:${userId}` },
                    { text: '❌ Batal', callback_data: `cancel:${userId}` }
                  ]
                ]
              }
            });
            await appendHistory(userId, 'user', userText);
            await appendHistory(userId, 'model', `[TOOL: request_record_transaction] ${JSON.stringify(txData)}`);
          } 
          else if (handler) {
            // GENERIC TOOL HANDLER (Summary, Investment, Account, Budget)
            const result = await handler(call.args, { userId });
            
            if (result.type === 'DATA') {
              await bot.sendMessage(chatId, result.data, { parse_mode: 'Markdown' });
              await appendHistory(userId, 'user', userText);
              await appendHistory(userId, 'model', result.data);
            } else if (result.type === 'ERROR') {
              await bot.sendMessage(chatId, `⚠️ ${result.data}`);
            }
          }
        }
      } else {
        // Just a normal text response
        await bot.sendMessage(chatId, aiResponse.text, { parse_mode: 'Markdown' });
        await appendHistory(userId, 'user', userText);
        await appendHistory(userId, 'model', aiResponse.text);
      }

    } catch (err) {
      console.error('[Handler] Error:', err.message);
      await bot.sendMessage(chatId, '😵 Aduh, ada masalah teknis nih. Coba lagi ya!');
    }
  });
}

module.exports = { registerHandlers, setConfig };
