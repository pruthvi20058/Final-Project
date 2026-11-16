import React, { useState } from 'react';

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: 24
    }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', background: 'var(--bg-secondary)', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔑</div>
          <h2 style={{ fontSize: '1.5rem', color: '#fff' }}>Reset Password</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Enter your email to receive reset instructions</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📩</div>
            <p style={{ color: '#00d4aa', fontSize: '0.9rem', fontWeight: 600 }}>Reset link sent!</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>Check your institutional inbox for password reset instructions.</p>
            <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => onNavigate('login')}>
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Email Address</label>
              <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="doctor@mediagent.com" />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }}>
              Send Reset Link
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          <span style={{ color: '#00d4aa', cursor: 'pointer' }} onClick={() => onNavigate('login')}>
            ← Back to Login
          </span>
        </div>
      </div>
    </div>
  );
}
