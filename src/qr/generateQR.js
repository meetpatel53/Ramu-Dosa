// src/qr/generateQR.js
// Development tool to generate QR codes for all tables
// Run: node generateQR.js

import { getTokenByTable, getAllTables } from './tableTokens.js';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  baseURL: 'https://ramudosa.com', // Replace with your domain
  outputDir: './qr_codes',
  qrSize: 300,
  qrColor: '#000000',
  qrBackground: '#FFFFFF',
  includeTableNumber: true,
  fileNamePrefix: 'table_'
};

/**
 * Generate QR code for a single table
 * @param {number} tableNumber - Table number
 * @param {string} token - QR token
 * @returns {Promise<string>} - Path to generated QR code
 */
async function generateQRCode(tableNumber, token) {
  try {
    // Create URL with token
    const url = `${CONFIG.baseURL}?qr=${token}`;
    
    // Create output directory if not exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // Generate filename
    const filename = `${CONFIG.fileNamePrefix}${tableNumber}.png`;
    const filepath = path.join(CONFIG.outputDir, filename);

    // Generate QR code
    await QRCode.toFile(filepath, url, {
      width: CONFIG.qrSize,
      color: {
        dark: CONFIG.qrColor,
        light: CONFIG.qrBackground
      },
      errorCorrectionLevel: 'H' // High error correction for better scanning
    });

    console.log(`✅ QR Code generated for Table ${tableNumber}: ${filepath}`);
    return filepath;

  } catch (error) {
    console.error(`❌ Failed to generate QR for Table ${tableNumber}:`, error);
    throw error;
  }
}

/**
 * Generate QR codes for all tables
 * @returns {Promise<Array<{table: number, token: string, path: string}>>}
 */
export async function generateAllQRCodes() {
  console.log('🚀 Starting QR Code generation...');
  
  const tables = getAllTables();
  const results = [];

  for (const { table, token } of tables) {
    try {
      const filepath = await generateQRCode(table, token);
      results.push({
        table,
        token,
        path: filepath
      });
    } catch (error) {
      console.error(`Failed for Table ${table}:`, error);
    }
  }

  console.log(`\n✅ Generated ${results.length} QR codes successfully!`);
  console.log(`📁 Output directory: ${CONFIG.outputDir}`);
  
  // Generate summary file
  generateSummary(results);
  
  return results;
}

/**
 * Generate summary HTML file for easy printing
 */
function generateSummary(qrData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Restaurant QR Codes</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; color: #333; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
    .card img { max-width: 200px; height: auto; }
    .card h3 { margin: 10px 0 5px; }
    .card .token { color: #666; font-size: 12px; }
    .print-btn { display: block; margin: 20px auto; padding: 10px 30px; font-size: 16px; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Restaurant QR Codes</h1>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print QR Codes</button>
  <div class="grid">
    ${qrData.map(({ table, token, path }) => `
      <div class="card">
        <h3>Table ${table}</h3>
        <img src="${path}" alt="QR Code for Table ${table}" />
        <div class="token">Token: ${token}</div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;

  const summaryPath = path.join(CONFIG.outputDir, 'qr_summary.html');
  fs.writeFileSync(summaryPath, html);
  console.log(`📄 Summary HTML generated: ${summaryPath}`);
}

/**
 * Generate QR for a single table (CLI usage)
 */
async function generateSingleTable(tableNumber) {
  const token = getTokenByTable(tableNumber);
  if (!token) {
    console.error(`❌ Table ${tableNumber} not found`);
    return null;
  }
  return generateQRCode(tableNumber, token);
}

// CLI Support
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node generateQR.js              - Generate all QR codes
  node generateQR.js --table 5    - Generate QR for specific table
  node generateQR.js --help       - Show this help
    `);
    process.exit(0);
  }

  const tableIndex = args.indexOf('--table');
  if (tableIndex !== -1 && args[tableIndex + 1]) {
    const tableNumber = parseInt(args[tableIndex + 1]);
    if (isNaN(tableNumber)) {
      console.error('❌ Invalid table number');
      process.exit(1);
    }
    generateSingleTable(tableNumber);
  } else {
    generateAllQRCodes();
  }
}

// Export functions for use in other scripts
export { generateQRCode, generateAllQRCodes, generateSingleTable };