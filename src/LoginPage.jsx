import React, { useState, useRef } from 'react';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Email, 2 = OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);
    setDevOtp('');

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Verification OTP sent successfully!');
        setStep(2);
      } else {
        // Handle SMTP error by exposing devOtp if available (local testing)
        if (data.devOtp) {
          setDevOtp(data.devOtp);
          setSuccess('System in Development Mode: OTP generated.');
          setStep(2);
        } else {
          setError(data.error || 'Failed to send OTP. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError('Connection to auth server failed. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Successfully verified!');
        localStorage.setItem('userEmail', email);
        onLogin(email);
      } else {
        setError(data.error || 'Verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Verification request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass animate-fade">
        <div className="login-header">
          <h1>Welcome to</h1>
          <h2 className="brand-name">RAMU DOSA ANJAR</h2>
          <p>
            {step === 1 
              ? 'Please enter your email to receive a secure login OTP' 
              : `Enter the 6-digit OTP code sent to: ${email}`}
          </p>
        </div>
        
        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="input-group">
              <span className="input-icon">✉️</span>
              <input 
                type="email" 
                placeholder="email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="spinner"></span>
              ) : (
                'Send OTP ➔'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="input-group otp-group">
              <input 
                type="text" 
                placeholder="••••••" 
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                autoFocus
                className="otp-input"
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}
            
            {devOtp && (
              <div className="dev-otp-banner">
                <p>⚙️ <strong>Development Mode:</strong> Email SMTP delivery failed or not configured.</p>
                <p>Use local code: <span className="dev-otp-code">{devOtp}</span></p>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="spinner"></span>
              ) : (
                'Verify & Enter ➔'
              )}
            </button>
            <button 
              type="button" 
              className="back-btn" 
              onClick={() => {
                setStep(1);
                setOtp('');
                setError('');
                setSuccess('');
                setDevOtp('');
              }}
              disabled={loading}
            >
              ⬅ Change Email
            </button>
          </form>
        )}

        <div className="login-footer">
          <p>Authentic South Indian Flavors</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
