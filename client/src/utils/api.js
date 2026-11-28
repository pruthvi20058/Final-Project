const API = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') + '/api'
  : '/api';

function getAuthToken() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('mediagent_token') : null;
  } catch {
    return null;
  }
}

function authHeaders(extra = {}) {
  const token = getAuthToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra }
    : { 'Content-Type': 'application/json', ...extra };
}

function getAuthToken() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('mediagent_token') : null;
  } catch {
    return null;
  }
}

function authHeaders(extra = {}) {
  const token = getAuthToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra }
    : { 'Content-Type': 'application/json', ...extra };
}

export async function fetchPatients() {
  const res = await fetch(`${API}/patients`, { headers: authHeaders() });
  return res.json();
}

export async function fetchPatient(id) {
  const res = await fetch(`${API}/patients/${id}`, { headers: authHeaders() });
  return res.json();
}

export async function createPatient(data) {
  const res = await fetch(`${API}/patients`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchConsultations() {
  const res = await fetch(`${API}/consultations`, { headers: authHeaders() });
  return res.json();
}

export async function fetchConsultation(id) {
  const res = await fetch(`${API}/consultations/${id}`, { headers: authHeaders() });
  return res.json();
}

export async function createConsultation(data) {
  const res = await fetch(`${API}/consultations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API}/stats`, { headers: authHeaders() });
  return res.json();
}

export async function fetchConditions() {
  const res = await fetch(`${API}/knowledge/conditions`, { headers: authHeaders() });
  return res.json();
}

export async function fetchCondition(id) {
  const res = await fetch(`${API}/knowledge/conditions/${id}`, { headers: authHeaders() });
  return res.json();
}

export async function searchKnowledge(query) {
  const res = await fetch(`${API}/knowledge/search`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ query }),
  });
  return res.json();
}

export async function sendChat(message, sessionId) {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, sessionId }),
  });
  return res.json();
}

export function subscribeToStream(consultationId, onMessage) {
  const token = getAuthToken();
  const url = token
    ? `${API}/consultations/${consultationId}/stream?token=${encodeURIComponent(token)}`
    : `${API}/consultations/${consultationId}/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  es.onerror = () => { es.close(); };
  return es;
}
