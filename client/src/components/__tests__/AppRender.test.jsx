/**
 * MediAgent Frontend — App & Public Navigation Render Smoke Tests
 *
 * Ensures the landing page, Navbar, public routes, and root App shell render
 * without uncaught runtime ReferenceErrors (e.g., undefined state/props).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Navbar from '../Navbar';
import App from '../../App';

describe('Navbar and App root rendering', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    }));
  });

  it('renders Navbar without optional doctor/onLogout props', () => {
    render(
      <Navbar
        activePage="home"
        onNavigate={vi.fn()}
        onEnterApp={vi.fn()}
      />
    );
    expect(screen.getByText('MediAgent')).toBeDefined();
    expect(screen.getByText('Doctor Login')).toBeDefined();
    expect(screen.getByText('Register')).toBeDefined();
  });

  it('renders Navbar with authenticated doctor and logout CTA', () => {
    render(
      <Navbar
        activePage="about"
        onNavigate={vi.fn()}
        onEnterApp={vi.fn()}
        doctor={{ name: 'Jane Doe' }}
        onLogout={vi.fn()}
      />
    );
    expect(screen.getByText('Dr. Jane Doe')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Logout')).toBeDefined();
  });

  it('renders App landing page cleanly when no auth token is present', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Launch Interactive Diagnostic Engine/i)).toBeDefined();
    });
    expect(screen.getAllByText('MediAgent').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Doctor Login')).toBeDefined();
  });

  it('redirects protected routes cleanly to LoginPage when unauthenticated', async () => {
    window.history.pushState({}, '', '/?page=dashboard');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Sign in to access clinical dashboard')).toBeDefined();
    });
  });
});
