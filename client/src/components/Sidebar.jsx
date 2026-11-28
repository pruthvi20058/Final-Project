import React from 'react';

export default function Sidebar({ active, onNavigate, collapsed, onToggle, doctor, onLogout, onGoPublic }) {
  const mainNav = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'multilingual', icon: '🎙️', label: 'Voice & Multilingual AI', badge: '10 LANG' },
    { id: 'agent-workflow', icon: '🤖', label: 'Agentic Workflow', badge: 'TASK 7' },
    { id: 'patients', icon: '🏥', label: 'Patients' },
    { id: 'reports', icon: '📋', label: 'Reports List' },
    { id: 'upload', icon: '📤', label: 'Upload Report', badge: 'NEW' },
    { id: 'analysis', icon: '⚡', label: 'Analysis Progress' },
    { id: 'predictions', icon: '🧬', label: 'Disease Predictions' },
    { id: 'xai', icon: '🔍', label: 'Explainability (XAI)' },
    { id: 'evidence', icon: '📚', label: 'Medical Evidence' },
    { id: 'risk-uncertainty', icon: '🛡️', label: 'Risk & Uncertainty' },
    { id: 'trends', icon: '📈', label: 'Trends & Comparison' },
    { id: 'clinical-report', icon: '📄', label: 'Clinical Report' },
    { id: 'review', icon: '🩺', label: 'Doctor Review', badge: 'HIPAA' },
    { id: 'history', icon: '📜', label: 'Patient Timeline' }
  ];

  const companionNav = [
    { id: 'companion', icon: '🩺', label: 'Health Companion', badge: 'AI AGENT' },
    { id: 'medicines', icon: '💊', label: 'Medicine Guide', badge: 'OCR' },
    { id: 'diseases', icon: '🦠', label: 'Disease Guide', badge: '6 TOPICS' },
    { id: 'companion-history', icon: '📜', label: 'Chat History' }
  ];

  const researchNav = [
    { id: 'dataset-studio', icon: '🧪', label: 'Dataset & Training Studio', badge: '5 DISEASES' },
    { id: 'evaluation', icon: '🏆', label: 'Evaluation Benchmarks' },
    { id: 'models', icon: '⚙️', label: 'Model Registry' },
    { id: 'knowledge', icon: '🌐', label: 'Knowledge Base' },
    { id: 'system-status', icon: '🟢', label: 'System Status' }
  ];

  const systemNav = [
    { id: 'settings', icon: '🔧', label: 'Settings' }
  ];

  const renderNavItem = (item) => (
    <div
      key={item.id}
      className={`nav-item ${active === item.id ? 'active' : ''}`}
      onClick={() => onNavigate(item.id)}
      title={collapsed ? item.label : ''}
    >
      <span className="icon">{item.icon}</span>
      <span className="nav-label">{item.label}</span>
      {item.badge && <span className="badge">{item.badge}</span>}
    </div>
  );

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">⚕️</div>
        <div className="sidebar-brand-text">
          <h1>MediAgent</h1>
          <p>Clinical Decision Support</p>
        </div>
      </div>

      <button className="sidebar-toggle" onClick={onToggle} title="Collapse sidebar">
        {collapsed ? '▶' : '◀'}
      </button>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{doctor?.avatar || 'DR'}</div>
        <div className="sidebar-user-info">
          <h4>{doctor?.name || 'Dr. Clinician'}</h4>
          <p>{doctor?.specialty || 'Attending Physician'}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Public Website</div>
        <div className="nav-item" onClick={onGoPublic}>
          <span className="icon">🌐</span>
          <span className="nav-label">Public Landing Page</span>
        </div>

        <div className="nav-section-label">Health Companion</div>
        {companionNav.map(renderNavItem)}

        <div className="nav-section-label">Clinical Workflow</div>
        {mainNav.map(renderNavItem)}

        <div className="nav-section-label">Research & Evaluation</div>
        {researchNav.map(renderNavItem)}

        <div className="nav-section-label">System</div>
        {systemNav.map(renderNavItem)}

        {onLogout && (
          <div
            className="nav-item logout-nav-item"
            onClick={onLogout}
            title={collapsed ? 'Sign Out' : ''}
          >
            <span className="icon">🚪</span>
            <span className="nav-label">Sign Out</span>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="status">
          <span className="status-dot"></span>
          <span className="sidebar-footer-text">
            <span>Model v1.0.4 Calibrated</span>
            <div style={{ marginTop: 2, fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
              11-Stage Agentic Pipeline
            </div>
          </span>
        </div>
      </div>
    </aside>
  );
}
