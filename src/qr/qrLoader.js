// src/qr/qrLoader.js
// Handles QR code from URL and initializes session

import { getTableByToken } from './tableTokens.js';
import { saveTableSession, getCurrentTable, hasActiveSession } from './tableSession.js';

const QR_PARAM = 'qr'; // URL parameter name

/**
 * Load QR from URL and initialize session
 * @returns {Promise<{success: boolean, table: number|null, message: string}>}
 */
export async function loadQRFromURL() {
  try {
    // 1. Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get(QR_PARAM);

    // 2. Check if QR parameter exists
    if (!token) {
      // No QR - Check if session exists
      if (hasActiveSession()) {
        const table = getCurrentTable();
        return {
          success: true,
          table: table,
          message: `Already logged in as Table ${table}`
        };
      }
      return {
        success: false,
        table: null,
        message: 'No QR code found. Please scan a valid QR.'
      };
    }

    // 3. Clean and validate token
    const cleanToken = token.trim().toUpperCase();
    if (cleanToken.length < 6) {
      return {
        success: false,
        table: null,
        message: 'Invalid QR code format. Please scan a valid QR.'
      };
    }

    // 4. Verify token
    const tableNumber = getTableByToken(cleanToken);
    if (!tableNumber) {
      return {
        success: false,
        table: null,
        message: 'Invalid QR code. Please scan a valid restaurant QR.'
      };
    }

    // 5. Save session
    const saved = saveTableSession(tableNumber);
    if (!saved) {
      return {
        success: false,
        table: null,
        message: 'Failed to save table session. Please try again.'
      };
    }

    // 6. Optional: Remove QR from URL (clean URL)
    cleanURL();

    return {
      success: true,
      table: tableNumber,
      message: `Welcome! You are at Table ${tableNumber}`
    };

  } catch (error) {
    console.error('QR Loader Error:', error);
    return {
      success: false,
      table: null,
      message: 'An error occurred while loading QR. Please try again.'
    };
  }
}

/**
 * Remove QR parameter from URL without page reload
 */
function cleanURL() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(QR_PARAM);
    window.history.replaceState({}, '', url.toString());
  } catch (error) {
    console.warn('Could not clean URL:', error);
  }
}

/**
 * Initialize QR on page load (auto-run)
 */
export function initQRLoader() {
  // Wait for DOM to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleQRLoad);
  } else {
    handleQRLoad();
  }
}

async function handleQRLoad() {
  const result = await loadQRFromURL();
  
  // Dispatch custom event for other modules
  const event = new CustomEvent('qrLoaded', {
    detail: result
  });
  window.dispatchEvent(event);

  // Show toast/notification if needed
  if (result.success) {
    console.log(`✅ ${result.message}`);
  } else {
    console.warn(`⚠️ ${result.message}`);
    // Optionally redirect to error page
    // window.location.href = '/error?message=' + encodeURIComponent(result.message);
  }
}

// Auto-initialize if this script is imported
if (typeof window !== 'undefined') {
  // Don't auto-init, let main app decide
  // Export init function instead
}