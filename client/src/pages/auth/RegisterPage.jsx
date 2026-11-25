import React, { useState } from 'react';

const API = '/api';

export default function RegisterPage({ onNavigate, onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [role, setRole] = useState('doctor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          specialty,
          licenseNumber: licenseNumber.trim() || 'PENDING',
          role,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        onLogin(data.doctor);
        return;
      }

      setError(data.error?.message || 'Registration failed. Please try again.');
    } catch (err) {
      setError('Unable to connect to the MediAgent server. Please try again later.');
    } finally {
      setLoading(false);
    }
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
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Register your clinical account</p>
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
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Specialty</label>
            <input className="form-input" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="General Medicine" />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>License Number (optional)</label>
            <input className="form-input" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="MG-2026-001" />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Role</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="doctor">Doctor / Physician</option>
              <option value="researcher">Clinical Researcher</option>
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

          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Register Account →'}
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
