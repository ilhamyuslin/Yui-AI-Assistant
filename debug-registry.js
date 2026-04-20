/**
 * debug-registry.js
 * Script untuk mengecek isi registry sebelum dikirim ke AI.
 */
const { getGeminiTools, getCapabilitiesInstruction } = require('./src/ai/tools/registry');

console.log("=== DEBUG REGISTRY ===");
const tools = getGeminiTools();
console.log("Jumlah Tools Terdeteksi:", tools.length);
console.log("Struktur Tool Pertama:", JSON.stringify(tools[0], null, 2));

console.log("\n=== DEBUG INSTRUCTION ===");
const instruction = getCapabilitiesInstruction();
console.log("Isi Instruction yang Disuapkan:");
console.log(instruction);
