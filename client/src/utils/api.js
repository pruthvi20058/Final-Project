const API = '/api';

export async function fetchPatients() {
  const res = await fetch(`${API}/patients`);
  return res.json();
}

export async function fetchPatient(id) {
  const res = await fetch(`${API}/patients/${id}`);
  return res.json();
}

export async function createPatient(data) {
  const res = await fetch(`${API}/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}

export async function fetchConsultations() {
  const res = await fetch(`${API}/consultations`);
  return res.json();
}

export async function fetchConsultation(id) {
  const res = await fetch(`${API}/consultations/${id}`);
  return res.json();
}

export async function createConsultation(data) {
  const res = await fetch(`${API}/consultations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API}/stats`);
  return res.json();
}

export async function fetchConditions() {
  const res = await fetch(`${API}/knowledge/conditions`);
  return res.json();
}

export async function fetchCondition(id) {
  const res = await fetch(`${API}/knowledge/conditions/${id}`);
  return res.json();
}

export async function searchKnowledge(query) {
  const res = await fetch(`${API}/knowledge/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  return res.json();
}

export async function sendChat(message, sessionId) {
  const res = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, sessionId }) });
  return res.json();
}

export function subscribeToStream(consultationId, onMessage) {
  const es = new EventSource(`${API}/consultations/${consultationId}/stream`);
  es.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  es.onerror = () => { es.close(); };
  return es;
}
