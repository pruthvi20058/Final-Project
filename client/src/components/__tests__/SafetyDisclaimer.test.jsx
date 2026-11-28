/**
 * MediAgent Frontend — Component Unit Tests
 *
 * Tests presentational components with vitest + React Testing Library.
 * No clinical data is fabricated; no backend is called.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SafetyDisclaimer from '../SafetyDisclaimer';

describe('SafetyDisclaimer', () => {
  it('renders clinical safety disclaimer text', () => {
    render(<SafetyDisclaimer />);
    expect(
      screen.getByText(/CLINICAL SAFETY & INTENDED USE DISCLAIMER/i)
    ).toBeDefined();
    expect(
      screen.getByText(/does not replace qualified medical professionals/i)
    ).toBeDefined();
  });

  it('renders compact variant with warning icon', () => {
    render(<SafetyDisclaimer compact />);
    expect(screen.getByText(/MediAgent is a clinical decision-support/i)).toBeDefined();
    expect(screen.getByText(/⚠️/)).toBeDefined();
  });
});
