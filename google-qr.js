



// google-qr.js
import QRCode from 'qrcode';
import fs from 'fs';

const url = 'https://www.google.com';

QRCode.toFile('google-qr.png', url, {
  width: 300,
  errorCorrectionLevel: 'H'
}, function(err) {
  if (err) throw err;
  console.log('✅ Google QR code generated: google-qr.png');
});