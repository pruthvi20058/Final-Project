import { useState, useEffect } from 'react';
import { fetchConsultations } from '../utils/api';
import DiagnosticReport from './DiagnosticReport';

export default function ConsultationHistory() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [triageFilter, setTriageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchConsultations()
      .then(c => { setConsultations(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getTriageLevel = (c) => {
    try {
      if (c.final_report?.triage?.triageLevel) return c.final_report.triage.triageLevel;
      if (c.triage_result) {
        const t = typeof c.triage_result === 'string' ? JSON.parse(c.triage_result) : c.triage_result;
        return t.triageLevel || 'N/A';
      }
    } catch {}
    return 'N/A';
  };

  const getTriageClass = (level) => ({
    Emergency: 'chip-red', Urgent: 'chip-amber', 'Semi-Urgent': 'chip-blue', 'Non-Urgent': 'chip-teal'
  }[level] || 'chip-blue');

  const filtered = consultations.filter(c => {
    const triageLevel = getTriageLevel(c);
    const matchesSearch = search === '' ||
      (c.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.chief_complaint || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.symptoms || []).some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesTriage = triageFilter === 'all' || triageLevel === triageFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesTriage && matchesStatus;
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  };

  if (loading) return (
    <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading consultation history...</p>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header page-header-flex">
        <div>
          <h2>📋 Consultation History</h2>
          <p>Browse, search, and review all AI diagnostic consultations</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="chip chip-teal">{consultations.length} Total</span>
          <span className="chip chip-success">{consultations.filter(c => c.status === 'complete').length} Completed</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="history-filters">
          <input
            className="form-input history-search"
            placeholder="🔍 Search by patient, symptoms, complaint..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-select" value={triageFilter} onChange={e => setTriageFilter(e.target.value)}>
            <option value="all">All Triage Levels</option>
            <option value="Emergency">Emergency</option>
            <option value="Urgent">Urgent</option>
            <option value="Semi-Urgent">Semi-Urgent</option>
            <option value="Non-Urgent">Non-Urgent</option>
          </select>
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="complete">Complete</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No consultations found</h3>
            <p>{consultations.length === 0 ? 'Run your first AI consultation to see results here' : 'Try adjusting your search or filters'}</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Chief Complaint</th>
                <th>Symptoms</th>
                <th>Triage</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const trLevel = getTriageLevel(c);
                const isExpanded = expandedId === c.id;
                return (
                  <tr key={c.id} className="clickable" style={{ verticalAlign: 'top' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="patient-avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                          {(c.patient_name || 'N').split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.patient_name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            {c.patient_age}y • {c.patient_gender}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.chief_complaint || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                        {(c.symptoms || []).slice(0, 3).map((s, i) => (
                          <span key={i} className="chip chip-indigo" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{s}</span>
                        ))}
                        {(c.symptoms || []).length > 3 && (
                          <span className="chip chip-blue" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>+{c.symptoms.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`chip ${getTriageClass(trLevel)}`} style={{ fontSize: '0.7rem' }}>
                        {trLevel}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${c.status === 'complete' ? 'chip-teal' : c.status === 'running' ? 'chip-amber' : 'chip-blue'}`}
                        style={{ fontSize: '0.7rem' }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {formatDate(c.created_at)}
                    </td>
                    <td>
                      {c.status === 'complete' && c.final_report && (
                        <button className="btn-icon" onClick={() => toggleExpand(c.id)}
                          title={isExpanded ? 'Collapse' : 'View Report'}
                          style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Expanded Report */}
      {expandedId && (() => {
        const c = consultations.find(x => x.id === expandedId);
        if (!c || !c.final_report) return null;
        return (
          <div className="consultation-detail-panel" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  📋 Report: {c.patient_name}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {c.chief_complaint || 'General consultation'} — {formatDate(c.created_at)}
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setExpandedId(null)}>✕ Close</button>
            </div>
            <DiagnosticReport report={c.final_report} />
          </div>
        );
      })()}
    </div>
  );
}
