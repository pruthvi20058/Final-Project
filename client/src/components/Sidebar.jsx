import React from 'react';

export default function Sidebar({ active, onNavigate, collapsed, onToggle, doctor, onLogout, onGoPublic }) {
  const userRole = doctor?.role || 'doctor';

  // Role-based navigation: only show items the user is authorized to access
  const allMainNav = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'multilingual', icon: '🎙️', label: 'Voice & Multilingual AI', badge: '10 LANG', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'agent-workflow', icon: '🤖', label: 'Agentic Workflow', badge: 'TASK 7', roles: ['doctor', 'administrator'] },
    { id: 'patients', icon: '🏥', label: 'Patients', roles: ['doctor', 'administrator'] },
    { id: 'reports', icon: '📋', label: 'Reports List', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'upload', icon: '📤', label: 'Upload Report', badge: 'NEW', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'analysis', icon: '⚡', label: 'Analysis Progress', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'predictions', icon: '🧬', label: 'Disease Predictions', roles: ['doctor', 'administrator'] },
    { id: 'xai', icon: '🔍', label: 'Explainability (XAI)', roles: ['doctor', 'administrator'] },
    { id: 'evidence', icon: '📚', label: 'Medical Evidence', roles: ['doctor', 'administrator'] },
    { id: 'risk-uncertainty', icon: '🛡️', label: 'Risk & Uncertainty', roles: ['doctor', 'administrator'] },
    { id: 'trends', icon: '📈', label: 'Trends & Comparison', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'clinical-report', icon: '📄', label: 'Clinical Report', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'review', icon: '🩺', label: 'Doctor Review', badge: 'HIPAA', roles: ['doctor', 'administrator'] },
    { id: 'history', icon: '📜', label: 'Patient Timeline', roles: ['patient', 'doctor', 'administrator'] }
  ];

  const allCompanionNav = [
    { id: 'companion', icon: '🩺', label: 'Health Companion', badge: 'AI AGENT', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'medicines', icon: '💊', label: 'Medicine Guide', badge: 'OCR', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'diseases', icon: '🦠', label: 'Disease Guide', badge: '6 TOPICS', roles: ['patient', 'doctor', 'administrator'] },
    { id: 'companion-history', icon: '📜', label: 'Chat History', roles: ['patient', 'doctor', 'administrator'] }
  ];

  const allResearchNav = [
    { id: 'dataset-studio', icon: '🧪', label: 'Dataset & Training Studio', badge: '5 DISEASES', roles: ['administrator'] },
    { id: 'evaluation', icon: '🏆', label: 'Evaluation Benchmarks', roles: ['doctor', 'administrator'] },
    { id: 'models', icon: '⚙️', label: 'Model Registry', roles: ['administrator'] },
    { id: 'knowledge', icon: '🌐', label: 'Knowledge Base', roles: ['administrator'] },
    { id: 'system-status', icon: '🟢', label: 'System Status', roles: ['administrator'] }
  ];

  const allSystemNav = [
    { id: 'settings', icon: '🔧', label: 'Settings', roles: ['patient', 'doctor', 'administrator'] }
  ];

  const filterByRole = (items) => items.filter(item => item.roles.includes(userRole));

  const mainNav = filterByRole(allMainNav);
  const companionNav = filterByRole(allCompanionNav);
  const researchNav = filterByRole(allResearchNav);
  const systemNav = filterByRole(allSystemNav);

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
            <span>MediAgent Research Prototype</span>
            <div style={{ marginTop: 2, fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
              Not for clinical use
            </div>
          </span>
        </div>
      </div>
    </aside>
  );
}
