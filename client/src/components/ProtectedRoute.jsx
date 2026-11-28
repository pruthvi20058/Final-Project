/**
 * MediAgent — Protected Route Component
 *
 * Wraps application routes that require authentication.
 * Redirects to login if the user is not authenticated.
 * Shows a loading state while auth status is being checked.
 */

import { useState, useEffect } from 'react';

export default function ProtectedRoute({ children, authChecked, doctor, onNavigate }) {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!authChecked) return; // Still checking auth

    if (!doctor && !redirecting) {
      setRedirecting(true);
      onNavigate('login');
    }
  }, [authChecked, doctor, onNavigate, redirecting]);

  if (!authChecked) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-primary)'
      }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!doctor) {
    return null; // Redirect handled by useEffect
  }

  return children;
}
