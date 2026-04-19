/**
 * expenseSchema.js
 * Defines the function declaration for recording transactions.
 * This is used by Gemini to understand when and how to trigger the expense tracking skill.
 */

const { STANDARD_CATEGORIES } = require('../../constants/categories');

const expenseSchema = {
  functionDeclarations: [
    {
      name: "request_record_transaction",
      description: "Minta untuk mencatat transaksi keuangan (pemasukan, pengeluaran, atau transfer). Panggil fungsi ini jika user ingin mencatat transaksi.",
      parameters: {
        type: "object",
        properties: {
          transaction_type: {
            type: "string",
            enum: ["Expense", "Income", "Transfer"],
            description: "Jenis transaksi: 'Expense' untuk pengeluaran, 'Income' untuk pemasukan, 'Transfer' untuk pindah dana antar akun."
          },
          amount: {
            type: "number",
            description: "Jumlah uang dalam angka (misal: 50000)."
          },
          item_name: {
            type: "string",
            description: "Nama barang atau kegiatan (misal: 'Nasi Goreng', 'Gaji Bulanan', 'Beli Kopi')."
          },
          category: {
            type: "string",
            enum: STANDARD_CATEGORIES,
            description: "Kategori transaksi berdasarkan list yang tersedia."
          },
          custom_category: {
            type: "string",
            description: "Nama kategori kustom jika kategori yang dipilih adalah 'Lainnya'."
          },
          source_of_fund: {
            type: "string",
            description: "Metode pembayaran atau sumber dana (Akun asal)."
          },
          destination_account: {
            type: "string",
            description: "Akun tujuan transfer (Hanya untuk tipe 'Transfer')."
          },
          transaction_notes: {
            type: "string",
            description: "Catatan tambahan atau keterangan (opsional)."
          },
          transaction_date: {
            type: "string",
            description: "Tanggal transaksi dalam format ISO (opsional, default hari ini)."
          }
        },
        required: ["transaction_type", "amount", "item_name", "category", "source_of_fund"]
      }
    }
  ]
};

module.exports = { expenseSchema };
