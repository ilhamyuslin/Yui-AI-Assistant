/**
 * registry.js
 * Central registry for all AI tools/functions.
 * Handles tool formatting for Gemini, auto-generating capability instructions,
 * and dispatching tool handlers.
 */

const expense = require('./expenseSchema');
const account = require('./accountSchema');
const investment = require('./investmentSchema');
const summary = require('./summarySchema');
const budget = require('./budgetSchema');

// Define all available tools here
// Each tool must have:
// - schema: The Gemini function declaration(s)
// - handler: (Optional) Function to execute the logic
// - capability: Description for the system prompt
const TOOLS = [
  {
    schema: (categories) => expense.getExpenseSchema(categories),
    handler: null, // Handled specifically in bot handlers for now (confirmation flow)
    capability: "Mencatat transaksi baru (Pengeluaran, Pemasukan, Transfer)."
  },
  {
    schema: account.accountSchema,
    handler: account.handle,
    capability: "Melihat saldo akun, daftar rekening, dan total aset saat ini."
  },
  {
    schema: investment.investmentSchema,
    handler: investment.handle,
    capability: "Melihat portofolio investasi, status aset saham/crypto, dan profit/loss."
  },
  {
    schema: summary.summarySchema,
    handler: summary.handle,
    capability: "Melihat statistik keuangan mingguan/bulanan dan riwayat transaksi terakhir."
  },
  {
    schema: budget.budgetSchema,
    handler: budget.handle,
    capability: "Mengecek status budget/limit pengeluaran kategori (Makan, Jajan, dll)."
  }
];

/**
 * Returns an array of function declarations for Gemini API.
 */
function getGeminiTools(categories = []) {
  return TOOLS.map(t => {
    if (typeof t.schema === 'function') {
      return t.schema(categories).functionDeclarations;
    }
    return t.schema.functionDeclarations;
  }).flat();
}

/**
 * Finds and returns a tool's handler function by function name.
 */
function getToolHandler(functionName) {
  const tool = TOOLS.find(t => {
    if (typeof t.schema === 'function') {
      return t.schema([]).functionDeclarations.some(fd => fd.name === functionName);
    }
    return t.schema.functionDeclarations.some(fd => fd.name === functionName);
  });
  
  if (tool && tool.handler) {
    return (args, ctx) => tool.handler(args, ctx, functionName);
  }
  return null;
}

/**
 * Generates a summary of capabilities to be injected into the system instruction.
 */
function getCapabilitiesInstruction() {
  if (TOOLS.length === 0) return "";
  
  const list = TOOLS.map((t, i) => `${i + 1}. ${t.capability}`).join('\n');
  return `\n\n=== AI CAPABILITIES ===\nKamu memiliki akses ke tools berikut untuk membantu user. Gunakan fungsi yang sesuai saat user meminta hal terkait:\n${list}\n======================\n`;
}

module.exports = {
  getGeminiTools,
  getToolHandler,
  getCapabilitiesInstruction
};
