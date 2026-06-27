// src/qr/tableTokens.js
// Hardcoded mapping - Temporary solution (Supabase migration ke liye ready)

const TABLE_TOKENS = {
  'A9XK23': 1,
  'B7LM52': 2,
  'P8RT11': 3,
  'D4KN67': 4,
  'M3RT89': 5,
  'X2PL45': 6,
  'Q6WS34': 7,
  'L9CV12': 8,
  'R5TY78': 9,
  'Z5MN89': 10
};

// Reverse mapping for generateQR.js
const TOKEN_TO_TABLE = Object.fromEntries(
  Object.entries(TABLE_TOKENS).map(([token, table]) => [table, token])
);

/**
 * Get table number from token
 * @param {string} token - QR token
 * @returns {number|null} - Table number or null if invalid
 */
export function getTableByToken(token) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim().toUpperCase();
  return TABLE_TOKENS[cleanToken] || null;
}

/**
 * Get token by table number
 * @param {number} tableNumber - Table number
 * @returns {string|null} - Token or null if not found
 */
export function getTokenByTable(tableNumber) {
  return TOKEN_TO_TABLE[tableNumber] || null;
}

/**
 * Check if token exists
 * @param {string} token - QR token
 * @returns {boolean}
 */
export function isValidToken(token) {
  return getTableByToken(token) !== null;
}

/**
 * Get all tables with tokens (for admin)
 * @returns {Array<{table: number, token: string}>}
 */
export function getAllTables() {
  return Object.entries(TABLE_TOKENS).map(([token, table]) => ({
    table,
    token
  }));
}