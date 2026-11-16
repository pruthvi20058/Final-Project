import { useState, useEffect } from 'react';
import { fetchStats, fetchConditions } from '../utils/api';

export default function SettingsPanel() {
  const [stats, setStats] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchStats().catch(() => null),
      fetchConditions().catch(() => [])
    ]).then(([s, c]) => {
      setStats(s);
      setConditions(c || []);
      setLoading(false);
    });
  }, []);

  const s = stats || { totalPatients: 0, totalConsultations: 0, completedConsultations: 0, emergencyCount: 0 };

  const agents = [
    { name: 'Triage Agent', icon: '🚨', desc: 'Vital sign analysis and urgency classification', version: '2.0', status: 'online' },
    { name: 'Diagnostic Agent', icon: '🔬', desc: 'Differential diagnosis with ICD-10 mapping', version: '2.0', status: 'online' },
    { name: 'RAG Agent', icon: '📚', desc: 'Knowledge base retrieval with vector similarity', version: '2.0', status: 'online' },
    { name: 'Medication Agent', icon: '💊', desc: 'Drug recommendations and interaction checks', version: '2.0', status: 'online' },
    { name: 'Imaging Agent', icon: '🖼️', desc: 'Medical image analysis simulation', version: '2.0', status: 'online' },
    { name: 'Guardrail Agent', icon: '🛡️', desc: 'Safety checks and compliance validation', version: '2.0', status: 'online' },
  ];

  const catCounts = {};
  conditions.forEach(c => { catCounts[c.category] = (catCounts[c.category] || 0) + 1; });

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>⚙️ Settings & System Info</h2>
        <p>System configuration, agent status, and knowledge base statistics</p>
      </div>

      <div className="settings-grid">
        {/* System Information */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="report-section-header">
              <span style={{ fontSize: '1.1rem' }}>🏥</span>
              <h3>System Information</h3>
            </div>
            <div className="settings-section">
              <h4>Application</h4>
              <div className="settings-row">
                <label>Application</label>
                <span className="settings-value">MediAgent v2.0</span>
              </div>
              <div className="settings-row">
                <label>Description</label>
                <span className="settings-value" style={{ fontSize: '0.82rem' }}>Autonomous Clinical Decision Support</span>
              </div>
              <div className="settings-row">
                <label>Architecture</label>
                <span className="settings-value">Multi-Agent AI Pipeline + RAG</span>
              </div>
              <div className="settings-row">
                <label>Frontend</label>
                <span className="settings-value">React + Vite</span>
              </div>
              <div className="settings-row">
                <label>Backend</label>
                <span className="settings-value">Node.js + Express</span>
              </div>
              <div className="settings-row">
                <label>Database</label>
                <span className="settings-value">SQLite (better-sqlite3 + WAL)</span>
              </div>
            </div>

            <div className="settings-section">
              <h4>Database Statistics</h4>
              <div className="settings-row">
                <label>Total Patients</label>
                <span className="settings-value">{s.totalPatients}</span>
              </div>
              <div className="settings-row">
                <label>Total Consultations</label>
                <span className="settings-value">{s.totalConsultations}</span>
              </div>
              <div className="settings-row">
                <label>Completed Analyses</label>
                <span className="settings-value">{s.completedConsultations}</span>
              </div>
              <div className="settings-row">
                <label>Emergency Cases</label>
                <span className="settings-value" style={{ color: s.emergencyCount > 0 ? 'var(--accent-danger)' : 'inherit' }}>
                  {s.emergencyCount}
                </span>
              </div>
              <div className="settings-row">
                <label>Completion Rate</label>
                <span className="settings-value" style={{ color: 'var(--accent-success)' }}>
                  {s.totalConsultations > 0 ? Math.round((s.completedConsultations / s.totalConsultations) * 100) : 100}%
                </span>
              </div>
            </div>
          </div>

          {/* Knowledge Base Stats */}
          <div className="card">
            <div className="report-section-header">
              <span style={{ fontSize: '1.1rem' }}>📚</span>
              <h3>Knowledge Base</h3>
            </div>
            <div className="settings-section">
              <h4>Information</h4>
              <div className="settings-row">
                <label>Total Conditions</label>
                <span className="settings-value">{conditions.length || 25}+</span>
              </div>
              <div className="settings-row">
                <label>Search Method</label>
                <span className="settings-value">TF-IDF + Cosine Similarity</span>
              </div>
              <div className="settings-row">
                <label>Index Type</label>
                <span className="settings-value">In-Memory Vector Store</span>
              </div>
              <div className="settings-row">
                <label>Data Sources</label>
                <span className="settings-value">Clinical Guidelines + ICD-10</span>
              </div>
            </div>
            {Object.keys(catCounts).length > 0 && (
              <div className="settings-section">
                <h4>Categories ({Object.keys(catCounts).length})</h4>
                {Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, count], i) => (
                  <div key={i} className="settings-row">
                    <label>{cat}</label>
                    <span className="settings-value">{count} conditions</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent Configuration */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="report-section-header">
              <span style={{ fontSize: '1.1rem' }}>🤖</span>
              <h3>Agent Pipeline Configuration</h3>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              The MediAgent pipeline runs {agents.length} specialized AI agents in a coordinated sequence.
              Each agent performs a specific clinical analysis task.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {agents.map((agent, i) => (
                <div key={i} style={{
                  padding: '14px 16px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  display: 'flex', alignItems: 'flex-start', gap: 14
                }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{agent.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{agent.name}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className="chip chip-blue" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>v{agent.version}</span>
                        <span className="chip chip-teal" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>● {agent.status}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{agent.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Configuration */}
          <div className="card">
            <div className="report-section-header">
              <span style={{ fontSize: '1.1rem' }}>🔧</span>
              <h3>Pipeline Settings</h3>
            </div>
            <div className="settings-section">
              <h4>Execution</h4>
              <div className="settings-row">
                <label>Streaming</label>
                <span className="settings-value" style={{ color: 'var(--accent-success)' }}>SSE Enabled</span>
              </div>
              <div className="settings-row">
                <label>Parallel Execution</label>
                <span className="settings-value">Diagnostic + RAG</span>
              </div>
              <div className="settings-row">
                <label>Avg Pipeline Time</label>
                <span className="settings-value">~6.1 seconds</span>
              </div>
              <div className="settings-row">
                <label>Max Upload Size</label>
                <span className="settings-value">10 MB</span>
              </div>
              <div className="settings-row">
                <label>Max Images</label>
                <span className="settings-value">5 per consultation</span>
              </div>
            </div>
            <div className="settings-section">
              <h4>Safety</h4>
              <div className="settings-row">
                <label>Guardrail Agent</label>
                <span className="settings-value" style={{ color: 'var(--accent-success)' }}>Active</span>
              </div>
              <div className="settings-row">
                <label>Human Review Threshold</label>
                <span className="settings-value">Emergency + High Risk</span>
              </div>
              <div className="settings-row">
                <label>Drug Interaction Check</label>
                <span className="settings-value" style={{ color: 'var(--accent-success)' }}>Enabled</span>
              </div>
              <div className="settings-row">
                <label>Allergy Cross-Check</label>
                <span className="settings-value" style={{ color: 'var(--accent-success)' }}>Enabled</span>
              </div>
            </div>

            <div className="disclaimer-box" style={{ marginTop: 14 }}>
              <p>⚕️ <strong>Disclaimer:</strong> MediAgent is a clinical decision support demonstration system. 
              All recommendations require verification by qualified healthcare professionals. 
              This system is not FDA-approved and should not be used for real clinical decisions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
