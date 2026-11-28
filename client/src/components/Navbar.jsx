import React, { useState, useEffect } from 'react';

export default function Navbar({ activePage, onNavigate, onEnterApp }) {
  const [doctor, setDoctor] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const links = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'research', label: 'Research' },
    { id: 'contact', label: 'Contact' },
  ];

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mediagent_token') : null;
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.doctor) {
              setDoctor(data.doctor);
            }
          } else {
            localStorage.removeItem('mediagent_token');
            localStorage.removeItem('mediagent_doctor');
          }
        }
      } catch {
        // Backend unreachable
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }
    initAuth();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mediagent_token') : null;
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('mediagent_token');
    localStorage.removeItem('mediagent_doctor');
    setDoctor(null);
    onNavigate('home');
  };

  if (!authChecked) {
    return null;
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 1000,
      background: 'rgba(6, 10, 20, 0.85)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)', padding: '0 24px'
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', height: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => onNavigate('home')}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #00d4aa, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000', fontWeight: 900, fontSize: '1.2rem', boxShadow: 'var(--shadow-glow)'
          }}>
            ⚕
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              MediAgent
            </h2>
            <span style={{ fontSize: '0.65rem', color: '#00d4aa', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Multimodal Clinical Decision Support
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', gap: 24 }}>
          {links.map(l => (
            <span
              key={l.id}
              onClick={() => onNavigate(l.id)}
              style={{
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                color: activePage === l.id ? '#00d4aa' : 'var(--text-secondary)',
                transition: 'var(--transition)'
              }}
            >
              {l.label}
            </span>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!doctor ? (
            <>
              <button className="btn btn-secondary" onClick={() => onNavigate('login')}>
                Doctor Login
              </button>
              <button className="btn btn-outline" onClick={() => onNavigate('register')}>
                Register
              </button>
            </>
          ) : (
            <>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Dr. {doctor.name}
              </span>
              <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
                Dashboard
              </button>
              <button className="btn btn-secondary" onClick={handleLogout} style={{ color: '#ef4444' }}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
