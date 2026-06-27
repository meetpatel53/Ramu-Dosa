import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Temporary in-memory store for OTPs
// Key: email, Value: { otp, expiresAt }
const otpStore = new Map();

// Configure Nodemailer Transporter for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Nodemailer SMTP connection failed:', error.message);
    console.log('⚠️ Please ensure that standard Gmail login is allowed or an App Password is used.');
  } else {
    console.log('🚀 Nodemailer SMTP transporter is ready to send emails');
  }
});

// Endpoint: Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  // Store in memory
  otpStore.set(email.toLowerCase(), { otp, expiresAt });

  console.log(`[OTP SYSTEM] Generated OTP for ${email}: ${otp}`);

  // HTML Email Template
  const mailOptions = {
    from: `"Ramu Dosa Anjar" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verification OTP - Ramu Dosa Anjar',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
        <div style="text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">RAMU DOSA ANJAR</h1>
          <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Authentic South Indian</p>
        </div>
        
        <div style="padding: 10px 0;">
          <h2 style="font-size: 20px; color: #1f2937; margin-top: 0;">Welcome!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">You requested a One-Time Password (OTP) to sign in to view our menu and place orders. Please use the verification code below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 36px; font-weight: 800; color: #f59e0b; letter-spacing: 6px; background-color: #fef3c7; border: 2px dashed #f59e0b; padding: 12px 30px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          
          <p style="font-size: 14px; color: #ef4444; font-weight: 500;">⚠️ This code is valid for 5 minutes only. Please do not share it with anyone.</p>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
          <p style="margin: 0;">Ramu Dosa Anjar © 2026. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">Anjar, Gujarat, India</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error);
    // Even if sending fails, we return a success indicator with a development warning
    // so they can still test using the code logged in the server's console
    res.status(500).json({ 
      error: 'Failed to send OTP email. Please ensure the Gmail server configuration is correct.',
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined 
    });
  }
});

// Endpoint: Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const record = otpStore.get(email.toLowerCase());

  if (!record) {
    return res.status(400).json({ error: 'No OTP requested for this email.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  // OTP verified successfully, remove it from store
  otpStore.delete(email.toLowerCase());
  console.log(`🎉 OTP verified successfully for user: ${email}`);

  res.json({ success: true, email: email.toLowerCase() });
});

// Endpoint: Contact Message Submission
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required fields.' });
  }

  const mailOptions = {
    from: `"${name}" <${email}>`,
    to: process.env.EMAIL_USER,
    subject: `RMD Menu Contact - ${subject || 'New Message'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #f59e0b; border-bottom: 1px solid #ddd; padding-bottom: 10px;">New Contact Message Received</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; font-weight: bold; width: 30%; border-bottom: 1px solid #eee;">Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Subject:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${subject || 'N/A'}</td>
          </tr>
        </table>
        <div style="margin-top: 20px;">
          <h4 style="margin-bottom: 8px; color: #333;">Message:</h4>
          <div style="padding: 15px; background-color: #fff; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap; line-height: 1.5; color: #444;">${message}</div>
        </div>
        <div style="margin-top: 20px; font-size: 11px; color: #999; text-align: center;">
          Sent from Ramu Madurai Dosa website contact form.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Contact message from ${email} sent to ${process.env.EMAIL_USER}`);
    res.json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    console.error('❌ Failed to send contact message email:', error);
    res.status(500).json({ error: 'Failed to send message email. Please try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ Backend server running on http://localhost:${PORT}`);
});
