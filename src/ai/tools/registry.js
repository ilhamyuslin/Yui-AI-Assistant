/**
 * registry.js
 * Central registry for all AI tools/functions.
 * Handles tool formatting for Gemini, auto-generating capability instructions,
 * and dispatching tool handlers.
 */

const expense = require('./expenseSchema');
const analysis = require('./analysisSchema');

// Define all available tools here
const TOOLS = [
  {
    schema: expense.expenseSchema,
    handler: expense.handle,
    capability: "Mencatat dan mengelola transaksi keuangan (pengeluaran, pemasukan, transfer)."
  },
  {
    schema: analysis.analysisSchema,
    handler: analysis.handle,
    capability: "Melihat ringkasan keuangan, daftar transaksi, dan status budget mingguan/bulanan."
  }
];

/**
 * Returns an array of function declarations for Gemini API.
 */
function getGeminiTools() {
  return TOOLS.map(t => t.schema);
}

/**
 * Finds and returns a tool's handler function by function name.
 */
function getToolHandler(functionName) {
  const tool = TOOLS.find(t => 
    t.schema.functionDeclarations.some(fd => fd.name === functionName)
  );
  return tool ? (args, ctx) => tool.handler(args, ctx, functionName) : null;
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
