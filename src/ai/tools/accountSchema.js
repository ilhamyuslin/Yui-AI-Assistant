/**
 * accountSchema.js
 * Tool declarations for managing bank accounts and e-wallets.
 */

const accountSchema = {
  functionDeclarations: [
    {
      name: "request_manage_account",
      description: "PANGGIL FUNGSI INI jika user ingin MENAMBAH akun baru, MENGUBAH nama akun, atau MENGUPDATE saldo akun secara manual (misal: 'tambah akun BCA saldo 5jt').",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Nama akun (misal: BCA, Mandiri, Cash, OVO)."
          },
          balance: {
            type: "number",
            description: "Saldo akun saat ini."
          },
          type: {
            type: "string",
            enum: ["Bank", "E-Wallet", "Cash", "Investment"],
            description: "Tipe akun."
          },
          id: {
            type: "string",
            description: "ID akun jika ingin mengupdate akun yang sudah ada (opsional)."
          }
        },
        required: ["name"]
      }
    },
    {
      name: "request_delete_account",
      description: "PANGGIL FUNGSI INI jika user ingin MENGHAPUS sebuah akun/rekening dari daftar.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Nama akun yang ingin dihapus."
          },
          id: {
            type: "string",
            description: "ID akun yang ingin dihapus (opsional)."
          }
        },
        required: ["name"]
      }
    }
  ]
};

/**
 * Handler for account management.
 */
async function handle(args, ctx, functionName) {
  const { upsertAccount, deleteAccount } = require('../../storage/accountStore');
  
  if (functionName === 'request_manage_account') {
    // Return data for confirmation (same pattern as transactions)
    return {
      type: 'PENDING_ACCOUNT',
      data: {
        id: args.id,
        name: args.name,
        balance: args.balance,
        type: args.type || 'Bank',
        action: args.id ? 'UPDATE' : 'CREATE'
      }
    };
  }

  if (functionName === 'request_delete_account') {
    return {
      type: 'PENDING_ACCOUNT_DELETE',
      data: {
        id: args.id,
        name: args.name
      }
    };
  }

  return { type: 'ERROR', data: 'Fungsi tidak dikenal.' };
}

module.exports = { accountSchema, handle };
