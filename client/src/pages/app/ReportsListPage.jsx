import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';
import { reportService } from '../../services/api';

export default function ReportsListPage({ onNavigate, onSelectReport }) {
  const [reports, setReports] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      try {
        const data = await reportService.list();
        if (mounted) {
          setReports(data || []);
          setErrorMsg(null);
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Unable to connect to the MediAgent server. Please try again.');
          setReports([]);
        }
      }
    }
    loadReports();
    return () => { mounted = false; };
  }, []);

  const handleSelectReport = (rep) => {
    if (onSelectReport) onSelectReport(rep.id);
    onNavigate('extraction');
  };

  return (
    <div className="fade-in">
      <DemoBanner />
      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20, color: '#fca5a5' }}>
          <strong>Unable to load reports:</strong> {errorMsg}
        </div>
      )}

      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>📋 Laboratory Reports Directory</h2>
          <p>All uploaded and processed patient lab documents ({reports.length} reports total).</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('upload')}>
          + Upload New Lab Report
        </button>
      </div>

      <div className="card" style={{ background: 'var(--bg-secondary)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '10px 4px' }}>Report ID</th>
              <th style={{ padding: '10px 4px' }}>Document Filename</th>
              <th style={{ padding: '10px 4px' }}>Patient Name</th>
              <th style={{ padding: '10px 4px' }}>Upload Date</th>
              <th style={{ padding: '10px 4px' }}>OCR Conf</th>
              <th style={{ padding: '10px 4px' }}>Status</th>
              <th style={{ padding: '10px 4px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 4px', color: '#00d4aa', fontWeight: 700 }}>{r.id}</td>
                <td style={{ padding: '12px 4px', color: '#fff', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{r.fileType === 'pdf' ? '📕' : '🖼️'}</span>
                    <span>{r.filename}</span>
                    {r.disease && (
                      <span style={{
                        fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                        background: r.disease === 'chikungunya' ? 'rgba(168,85,247,0.15)' : r.disease === 'dengue' ? 'rgba(239,68,68,0.15)' : r.disease === 'malaria' ? 'rgba(234,179,8,0.15)' : r.disease === 'typhoid' ? 'rgba(249,115,22,0.15)' : 'rgba(0,212,170,0.15)',
                        color: r.disease === 'chikungunya' ? '#c084fc' : r.disease === 'dengue' ? '#f87171' : r.disease === 'malaria' ? '#fbbf24' : r.disease === 'typhoid' ? '#fb923c' : '#00d4aa'
                      }}>
                        {r.disease.toUpperCase()}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 4px', color: 'var(--text-secondary)' }}>{r.patientName}</td>
                <td style={{ padding: '12px 4px', color: 'var(--text-tertiary)' }}>{r.uploadDate}</td>
                <td style={{ padding: '12px 4px', color: '#10b981' }}>{r.ocrConfidence}%</td>
                <td style={{ padding: '12px 4px' }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => handleSelectReport(r)}>
                    Inspect Report →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
