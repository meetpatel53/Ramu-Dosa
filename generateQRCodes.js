import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  baseURL: 'https://ramudosa.com',
  outputDir: './qr_codes',
  totalTables: 10,
  qrSize: 300
};

function generateTokens(totalTables) {
  const tokens = {};
  for (let i = 1; i <= totalTables; i++) {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    tokens[i] = `T${i.toString().padStart(2, '0')}${random}`;
  }
  return tokens;
}

async function generateAllQRCodes() {
  console.log('🚀 Generating QR codes for 10 tables...\n');
  
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const tokens = generateTokens(CONFIG.totalTables);
  const results = [];

  for (const [table, token] of Object.entries(tokens)) {
    const url = `${CONFIG.baseURL}?qr=${token}`;
    const filename = `table_${table}.png`;
    const filepath = path.join(CONFIG.outputDir, filename);
    
    try {
      await QRCode.toFile(filepath, url, {
        width: CONFIG.qrSize,
        errorCorrectionLevel: 'H'
      });
      
      console.log(`✅ Table ${table} → Token: ${token}`);
      results.push({ table, token, path: filepath });
    } catch (error) {
      console.error(`❌ Failed for Table ${table}:`, error.message);
    }
  }

  generateSummaryHTML(results);
  console.log(`\n✅ All QR codes generated successfully!`);
  console.log(`📁 Location: ${CONFIG.outputDir}/`);
}

function generateSummaryHTML(results) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Restaurant QR Codes</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
    .card img { max-width: 100%; height: auto; }
    .token { color: #666; font-size: 12px; margin-top: 5px; }
    .print-btn { margin: 20px auto; padding: 10px 30px; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Restaurant QR Codes</h1>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print QR Codes</button>
  <div class="grid">
    ${results.map(({ table, token, path }) => `
      <div class="card">
        <h3>Table ${table}</h3>
        <img src="${path.replace('./', '')}" alt="Table ${table}" />
        <div class="token">Token: ${token}</div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;

  const summaryPath = path.join(CONFIG.outputDir, 'qr_summary.html');
  fs.writeFileSync(summaryPath, html);
  console.log(`📄 Summary HTML: ${summaryPath}`);
}

generateAllQRCodes().catch(console.error);

