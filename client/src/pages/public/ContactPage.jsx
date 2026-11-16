import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function ContactPage({ onNavigate, onEnterApp }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <Navbar activePage="contact" onNavigate={onNavigate} onEnterApp={onEnterApp} />

      <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 12 }}>Contact Research Team</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: 36 }}>
          Reach out for clinical evaluation partnerships, research dataset access, or system integration.
        </p>

        {submitted ? (
          <div className="card" style={{ background: 'var(--bg-secondary)', textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
            <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 8 }}>Thank You</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Your inquiry has been received. Our clinical research team will respond shortly.</p>
          </div>
        ) : (
          <form className="card" style={{ background: 'var(--bg-secondary)' }} onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 6, fontSize: '0.86rem' }}>Full Name</label>
              <input className="form-input" required placeholder="Dr. Jane Smith" />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 6, fontSize: '0.86rem' }}>Institutional Email</label>
              <input className="form-input" type="email" required placeholder="jsmith@medical.org" />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 6, fontSize: '0.86rem' }}>Inquiry Details</label>
              <textarea className="form-input" rows={4} required placeholder="Inquire about clinical benchmarks, dataset access, or partnership..." />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }}>
              Send Research Inquiry
            </button>
          </form>
        )}
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
