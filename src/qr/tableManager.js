// src/qr/tableManager.js
// Main controller for all table operations

import { getTableByToken, isValidToken, getAllTables } from './tableTokens.js';
import { 
  saveTableSession, 
  getCurrentTable, 
  clearTableSession, 
  hasActiveSession,
  extendSession,
  getSessionRemainingMinutes
} from './tableSession.js';
import { loadQRFromURL, initQRLoader } from './qrLoader.js';

// Configuration
const CONFIG = {
  maxTableLimit: 50,
  allowGuestMode: false, // Set true for testing without QR
  sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Main Table Manager Class
 */
class TableManager {
  constructor() {
    this.currentTable = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Table Manager
   * @param {Object} options - Configuration options
   * @returns {Promise<{success: boolean, table: number|null, message: string}>}
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      return {
        success: true,
        table: this.currentTable,
        message: 'Already initialized'
      };
    }

    try {
      // 1. Try loading from URL
      const qrResult = await loadQRFromURL();
      
      if (qrResult.success) {
        this.currentTable = qrResult.table;
        this.isInitialized = true;
        return qrResult;
      }

      // 2. Fallback: Check existing session
      if (hasActiveSession()) {
        const table = getCurrentTable();
        if (table) {
          this.currentTable = table;
          this.isInitialized = true;
          return {
            success: true,
            table: table,
            message: `Session restored: Table ${table}`
          };
        }
      }

      // 3. Guest mode (optional)
      if (CONFIG.allowGuestMode || options.allowGuest) {
        this.currentTable = 0; // Guest mode
        this.isInitialized = true;
        return {
          success: true,
          table: 0,
          message: 'Guest mode activated'
        };
      }

      // 4. No valid session
      return {
        success: false,
        table: null,
        message: 'No valid table session found. Please scan QR.'
      };

    } catch (error) {
      console.error('Table Manager initialization error:', error);
      return {
        success: false,
        table: null,
        message: 'Failed to initialize table manager'
      };
    }
  }

  /**
   * Verify a QR token manually
   * @param {string} token - QR token
   * @returns {Promise<{valid: boolean, table: number|null, message: string}>}
   */
  async verifyToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        return {
          valid: false,
          table: null,
          message: 'Invalid token format'
        };
      }

      const cleanToken = token.trim().toUpperCase();
      const table = getTableByToken(cleanToken);
      
      if (table) {
        return {
          valid: true,
          table: table,
          message: `Valid token for Table ${table}`
        };
      } else {
        return {
          valid: false,
          table: null,
          message: 'Invalid QR token'
        };
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        valid: false,
        table: null,
        message: 'Error verifying token'
      };
    }
  }

  /**
   * Switch to a different table (admin only)
   * @param {number} tableNumber - Table to switch to
   * @param {string} adminPassword - Admin password
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async switchTable(tableNumber, adminPassword = null) {
    // Admin verification (implement your own logic)
    // const isValidAdmin = await verifyAdmin(adminPassword);
    // if (!isValidAdmin) {
    //   return { success: false, message: 'Unauthorized' };
    // }

    if (!tableNumber || typeof tableNumber !== 'number') {
      return { success: false, message: 'Invalid table number' };
    }

    if (tableNumber < 1 || tableNumber > CONFIG.maxTableLimit) {
      return { success: false, message: `Table must be between 1 and ${CONFIG.maxTableLimit}` };
    }

    const saved = saveTableSession(tableNumber);
    if (saved) {
      this.currentTable = tableNumber;
      return {
        success: true,
        message: `Switched to Table ${tableNumber}`
      };
    }

    return { success: false, message: 'Failed to switch table' };
  }

  /**
   * Get current table
   * @returns {number|null}
   */
  getTable() {
    if (!this.isInitialized) {
      console.warn('Table Manager not initialized. Call initialize() first.');
      return null;
    }
    return this.currentTable;
  }

  /**
   * Get current table with validation
   * @returns {{table: number|null, isValid: boolean}}
   */
  getTableStatus() {
    const table = this.getTable();
    return {
      table: table,
      isValid: table !== null && table > 0,
      isGuest: table === 0,
      sessionActive: hasActiveSession(),
      sessionRemaining: getSessionRemainingMinutes()
    };
  }

  /**
   * Clear current session
   * @returns {boolean}
   */
  clearSession() {
    const result = clearTableSession();
    if (result) {
      this.currentTable = null;
      this.isInitialized = false;
    }
    return result;
  }

  /**
   * Extend current session
   * @param {number} hours - Hours to extend
   * @returns {boolean}
   */
  extendSession(hours = 24) {
    const duration = hours * 60 * 60 * 1000;
    return extendSession(duration);
  }

  /**
   * Get all tables (for admin)
   * @returns {Array<{table: number, token: string}>}
   */
  getAllTables() {
    return getAllTables();
  }

  /**
   * Check if table is valid
   * @param {number} tableNumber
   * @returns {boolean}
   */
  isValidTable(tableNumber) {
    return tableNumber && typeof tableNumber === 'number' && tableNumber > 0;
  }
}

// Singleton instance
let tableManagerInstance = null;

/**
 * Get Table Manager instance (Singleton)
 * @returns {TableManager}
 */
export function getTableManager() {
  if (!tableManagerInstance) {
    tableManagerInstance = new TableManager();
  }
  return tableManagerInstance;
}

// Export convenience functions
export const tableManager = getTableManager();

// For backward compatibility
export default tableManager;