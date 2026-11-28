/**
 * MediAgent Frontend — API Service Unit Tests
 *
 * Tests the centralized API service (client/src/services/api.js) with mocked fetch.
 * These tests verify request construction, auth header handling, error propagation,
 * and response parsing — no clinical data is fabricated, no real backend is called.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock environment
vi.stubGlobal('import', { meta: { env: { VITE_API_URL: undefined } } });

beforeEach(() => {
  mockFetch.mockClear();
  localStorageMock.getItem.mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('API service — auth token handling', () => {
  it('includes Authorization header when token is present', async () => {
    localStorageMock.getItem.mockReturnValue('test-token-123');

    // Dynamically import after setting up mocks
    const api = await import('./api.js');
    const { request } = api;

    // We can't easily test the private request function directly,
    // so we test through the public service methods
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ reports: [] }), { status: 200 })
    );

    await api.reportService.list();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/reports'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      })
    );
  });

  it('does not include Authorization header when no token', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const api = await import('./api.js');
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ reports: [] }), { status: 200 })
    );

    await api.reportService.list();

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers).not.toHaveProperty('Authorization');
  });
});

describe('API service — error propagation', () => {
  it('propagates API errors with status code', async () => {
    const api = await import('./api.js');

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { message: 'Unauthorized', code: 'AUTH_REQUIRED' } }),
        { status: 401 }
      )
    );

    await expect(api.reportService.list()).rejects.toThrow('Unauthorized');
  });

  it('handles network failures with SERVICE_UNAVAILABLE code', async () => {
    const api = await import('./api.js');

    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(api.reportService.list()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
  });

  it('handles empty response body gracefully', async () => {
    const api = await import('./api.js');

    mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));

    const result = await api.reportService.list();
    expect(result).toEqual([]);
  });
});

describe('API service — IS_DEMO flag', () => {
  it('IS_DEMO is false (no fabricated clinical data)', async () => {
    const api = await import('./api.js');
    expect(api.IS_DEMO).toBe(false);
  });
});

describe('API service — DEMO_PATIENTS is isolated preview data', () => {
  it('DEMO_PATIENTS contains only demo-labelled records', async () => {
    const api = await import('./api.js');
    expect(Array.isArray(api.DEMO_PATIENTS)).toBe(true);
    expect(api.DEMO_PATIENTS.length).toBeGreaterThan(0);
    // All demo patients should have PAT- IDs (isolated prefix)
    for (const patient of api.DEMO_PATIENTS) {
      expect(patient.id.startsWith('PAT-')).toBe(true);
    }
  });
});

describe('API service — clinical ontology', () => {
  it('CLINICAL_ONTOLOGY contains normalized test names', async () => {
    const api = await import('./api.js');
    expect(Array.isArray(api.CLINICAL_ONTOLOGY)).toBe(true);
    const hasGlucose = api.CLINICAL_ONTOLOGY.some(
      (t) => t.normalizedName === 'glucose'
    );
    expect(hasGlucose).toBe(true);
  });
});

describe('API service — reportService.upload validates file', () => {
  it('throws when no file provided', async () => {
    const api = await import('./api.js');

    await expect(
      api.reportService.upload({})
    ).rejects.toThrow(/valid laboratory report file/);
  });
});

describe('API service — formatHttpError', () => {
  it('identifies unconfigured VITE_API_URL on HTTP 405 from static host', async () => {
    const api = await import('./api.js');
    const msg = api.formatHttpError({ status: 405 }, null, 'Invalid email or password');
    expect(msg).toContain('VITE_API_URL');
    expect(msg).toContain('405');
  });

  it('uses backend error message when returned in JSON', async () => {
    const api = await import('./api.js');
    const msg = api.formatHttpError(
      { status: 401 },
      { error: { message: 'Invalid email or password' } },
      'Fallback'
    );
    expect(msg).toBe('Invalid email or password');
  });
});
