import React, { useState } from 'react';

export default function RegisterPage({ onNavigate, onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Doctor');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const doctorObj = {
      id: 'DOC-NEW',
      name: name || 'Dr. New User',
      email: email,
      role: role.toLowerCase(),
      specialty: role === 'Doctor' ? 'General Medicine' : 'Clinical Research',
      avatar: (name || 'NU').split(' ').map(n => n[0]).join('')
    };
    onLogin(doctorObj);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: 24
    }}>
      <div className="card" style={{ maxWidth: 450, width: '100%', background: 'var(--bg-secondary)', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚕️</div>
          <h2 style={{ fontSize: '1.6rem', color: '#fff' }}>Create MediAgent Account</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Select your clinical or research role</p>
        </div>

        {error && (
          <div style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', fontSize: '0.82rem', marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Full Name</label>
            <input className="form-input" required value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Sarah Mitchell" />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Institutional Email</label>
            <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="smitchell@hospital.org" />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Role</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="Doctor">Doctor / Physician</option>
              <option value="Researcher">Clinical Researcher</option>
              <option value="Patient">Patient (Limited View)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Password</label>
            <input className="form-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Confirm Password</label>
            <input className="form-input" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }}>
            Register Account →
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <span style={{ color: '#00d4aa', cursor: 'pointer', fontWeight: 600 }} onClick={() => onNavigate('login')}>
            Sign In
          </span>
        </div>
      </div>
    </div>
  );
}
