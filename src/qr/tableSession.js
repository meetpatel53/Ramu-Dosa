// src/qr/tableSession.js
// Handles table session in localStorage with expiry

const SESSION_KEY = 'current_table';
const SESSION_EXPIRY_KEY = 'table_session_expiry';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save current table to session
 * @param {number} tableNumber - Table number
 * @param {number} duration - Session duration in ms (optional)
 */
export function saveTableSession(tableNumber, duration = SESSION_DURATION) {
  if (!tableNumber || typeof tableNumber !== 'number') {
    console.error('Invalid table number:', tableNumber);
    return false;
  }

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(tableNumber));
    const expiryTime = Date.now() + duration;
    localStorage.setItem(SESSION_EXPIRY_KEY, JSON.stringify(expiryTime));
    return true;
  } catch (error) {
    console.error('Failed to save table session:', error);
    return false;
  }
}

/**
 * Get current table from session
 * @returns {number|null} - Table number or null if expired/invalid
 */
export function getCurrentTable() {
  try {
    // Check expiry
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (expiry) {
      const expiryTime = JSON.parse(expiry);
      if (Date.now() > expiryTime) {
        clearTableSession();
        return null;
      }
    }

    const table = localStorage.getItem(SESSION_KEY);
    return table ? JSON.parse(table) : null;
  } catch (error) {
    console.error('Failed to get current table:', error);
    return null;
  }
}

/**
 * Check if session is active
 * @returns {boolean}
 */
export function hasActiveSession() {
  return getCurrentTable() !== null;
}

/**
 * Clear table session
 */
export function clearTableSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear session:', error);
    return false;
  }
}

/**
 * Extend session by given duration
 * @param {number} duration - Additional time in ms
 */
export function extendSession(duration = SESSION_DURATION) {
  const currentTable = getCurrentTable();
  if (currentTable) {
    saveTableSession(currentTable, duration);
    return true;
  }
  return false;
}

/**
 * Get session remaining time in minutes
 * @returns {number|null} - Remaining minutes or null if no session
 */
export function getSessionRemainingMinutes() {
  try {
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!expiry) return null;
    
    const expiryTime = JSON.parse(expiry);
    const remaining = expiryTime - Date.now();
    return remaining > 0 ? Math.floor(remaining / 60000) : 0;
  } catch {
    return null;
  }
}