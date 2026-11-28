import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AboutPage from './pages/public/AboutPage';
import FeaturesPage from './pages/public/FeaturesPage';
import HowItWorksPage from './pages/public/HowItWorksPage';
import ResearchPage from './pages/public/ResearchPage';
import ContactPage from './pages/public/ContactPage';

import LoginPage from './components/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientsPage from './pages/app/PatientsPage';
import PatientDetailsPage from './pages/app/PatientDetailsPage';
import ReportsListPage from './pages/app/ReportsListPage';
import ReportUploadPage from './pages/app/ReportUploadPage';
import ReportExtractionPage from './pages/app/ReportExtractionPage';
import AnalysisProgressPage from './pages/app/AnalysisProgressPage';
import PredictionPage from './pages/app/PredictionPage';
import ExplainabilityPage from './pages/app/ExplainabilityPage';
import EvidencePage from './pages/app/EvidencePage';
import RiskUncertaintyPage from './pages/app/RiskUncertaintyPage';
import TrendsPage from './pages/app/TrendsPage';
import ClinicalReportPage from './pages/app/ClinicalReportPage';
import DoctorReviewPage from './pages/app/DoctorReviewPage';
import HistoryPage from './pages/app/HistoryPage';
import SettingsPage from './pages/app/SettingsPage';
import MultilingualVoicePage from './pages/app/MultilingualVoicePage';
import HealthCompanionPage from './pages/app/HealthCompanionPage';
import MedicineGuidePage from './pages/app/MedicineGuidePage';
import DiseaseGuidePage from './pages/app/DiseaseGuidePage';
import ChatHistoryPage from './pages/app/ChatHistoryPage';
import FloatingVoiceAssistant from './components/FloatingVoiceAssistant';
import AgentWorkflowPage from './pages/app/AgentWorkflowPage';

import EvaluationDashboard from './pages/admin/EvaluationDashboard';
import ModelsPage from './pages/admin/ModelsPage';
import DatasetStudioPage from './pages/admin/DatasetStudioPage';
import KnowledgeBasePage from './pages/admin/KnowledgeBasePage';
import SystemStatusPage from './pages/admin/SystemStatusPage';

import { patientService } from './services/api';

const PUBLIC_PAGES = ['home', 'about', 'features', 'how-it-works', 'research', 'contact'];
const AUTH_PAGES = ['login', 'register', 'forgot-password'];

export default function App() {
  const getInitialPage = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('page');
      if (p) return p;
      if (window.location.hash) return window.location.hash.replace('#', '');
    } catch {}
    return 'home';
  };

  const [doctor, setDoctor] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activePage, setActivePageState] = useState(getInitialPage);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notification, setNotification] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const setActivePage = (page) => {
    setActivePageState(page);
    try {
      const url = new URL(window.location);
      url.searchParams.set('page', page);
      window.history.pushState({}, '', url);
    } catch {}
  };

  // Initialize auth: load token from localStorage and verify with backend
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mediagent_token') : null;
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.doctor) {
              setDoctor(data.doctor);
              // Load the authenticated user's patients for dashboard context
              try {
                const patientData = await patientService.list();
                if (mounted && Array.isArray(patientData) && patientData.length > 0) {
                  setPatients(patientData);
                  setSelectedPatientId(patientData[0].id);
                }
              } catch {
                // Patient list fetch non-fatal — user can select manually
              }
            }
          } else {
            // Token invalid/expired — clear it
            localStorage.removeItem('mediagent_token');
            localStorage.removeItem('mediagent_doctor');
          }
        }
      } catch {
        // Backend unreachable — still allow app to load, but no auth
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    initAuth();

    const onPop = () => {
      try {
        const p = new URLSearchParams(window.location.search).get('page') || window.location.hash.replace('#', '');
        if (p) setActivePageState(p);
      } catch {}
    };
    const onSessionExpired = () => {
      if (mounted) {
        localStorage.removeItem('mediagent_token');
        localStorage.removeItem('mediagent_doctor');
        setDoctor(null);
        setActivePage('login');
        showNotification('Session expired. Please sign in again.', 'warning');
      }
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    window.addEventListener('mediagent:session-expired', onSessionExpired);
    return () => {
      mounted = false;
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
      window.removeEventListener('mediagent:session-expired', onSessionExpired);
    };
  }, []);

  const handleLogin = async (doc) => {
    setDoctor(doc);
    localStorage.setItem('mediagent_doctor', JSON.stringify(doc));
    setActivePage('dashboard');
    showNotification(`Welcome, ${doc.name}`, 'success');
  };

  const handleLogout = async () => {
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mediagent_token') : null;
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore logout errors — clear state regardless
    }
    localStorage.removeItem('mediagent_token');
    localStorage.removeItem('mediagent_doctor');
    setDoctor(null);
    setActivePage('home');
    showNotification('Signed out successfully', 'success');
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleStartAnalysis = (reportData) => {
    if (reportData && reportData.id) setSelectedReportId(reportData.id);
    setActivePage('analysis');
  };

  if (!authChecked) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  // Require authentication for application routes
  const requiresAuth = !PUBLIC_PAGES.includes(activePage) && !AUTH_PAGES.includes(activePage);
  if (requiresAuth && !doctor) {
    setActivePage('login');
  }

  // PUBLIC ROUTES
  if (PUBLIC_PAGES.includes(activePage)) {
    switch (activePage) {
      case 'about': return <AboutPage onNavigate={setActivePage} onEnterApp={() => setActivePage(doctor ? 'dashboard' : 'login')} />;
      case 'features': return <FeaturesPage onNavigate={setActivePage} onEnterApp={() => setActivePage(doctor ? 'dashboard' : 'login')} />;
      case 'how-it-works': return <HowItWorksPage onNavigate={setActivePage} onEnterApp={() => setActivePage(doctor ? 'dashboard' : 'login')} />;
      case 'research': return <ResearchPage onNavigate={setActivePage} onEnterApp={() => setActivePage(doctor ? 'dashboard' : 'login')} />;
      case 'contact': return <ContactPage onNavigate={setActivePage} onEnterApp={() => setActivePage(doctor ? 'dashboard' : 'login')} />;
      default: return <LandingPage onNavigate={setActivePage} onEnterApp={() => setActivePage(doctor ? 'dashboard' : 'login')} />;
    }
  }

  // AUTH ROUTES
  if (AUTH_PAGES.includes(activePage)) {
    switch (activePage) {
      case 'register': return <RegisterPage onNavigate={setActivePage} onLogin={handleLogin} />;
      case 'forgot-password': return <ForgotPasswordPage onNavigate={setActivePage} />;
      default: return <LoginPage onLogin={handleLogin} onNavigate={setActivePage} />;
    }
  }

  // APPLICATION ROUTING (Sidebar Layout)
  const renderAppContent = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={setActivePage} doctor={doctor} />;
      case 'companion': return <HealthCompanionPage onNavigate={setActivePage} />;
      case 'medicines': return <MedicineGuidePage onNavigate={setActivePage} />;
      case 'diseases': return <DiseaseGuidePage onNavigate={setActivePage} />;
      case 'companion-history': return <ChatHistoryPage onNavigate={setActivePage} />;
      case 'multilingual': return <MultilingualVoicePage onNavigate={setActivePage} />;
      case 'agent-workflow': return <AgentWorkflowPage onNavigate={setActivePage} />;
      case 'patients': return <PatientsPage onNavigate={setActivePage} onSelectPatient={setSelectedPatientId} />;
      case 'patient-details': return <PatientDetailsPage patientId={selectedPatientId} onNavigate={setActivePage} />;
      case 'reports': return <ReportsListPage onNavigate={setActivePage} onSelectReport={setSelectedReportId} />;
      case 'upload': return <ReportUploadPage onNavigate={setActivePage} onStartAnalysis={handleStartAnalysis} />;
      case 'extraction': return <ReportExtractionPage reportId={selectedReportId} onNavigate={setActivePage} />;
      case 'analysis': return <AnalysisProgressPage reportId={selectedReportId} onComplete={() => setActivePage('extraction')} />;
      case 'predictions': return <PredictionPage reportId={selectedReportId} onNavigate={setActivePage} />;
      case 'xai': return <ExplainabilityPage reportId={selectedReportId} predictionId={`PRED-${selectedReportId}`} onNavigate={setActivePage} />;
      case 'evidence': return <EvidencePage reportId={selectedReportId} predictionId={`PRED-${selectedReportId}`} onNavigate={setActivePage} />;
      case 'risk-uncertainty': return <RiskUncertaintyPage reportId={selectedReportId} onNavigate={setActivePage} />;
      case 'trends': return <TrendsPage patientId={selectedPatientId} onNavigate={setActivePage} />;
      case 'clinical-report': return <ClinicalReportPage reportId={selectedReportId} onNavigate={setActivePage} />;
      case 'review': return <DoctorReviewPage reportId={selectedReportId} doctor={doctor} notify={showNotification} onNavigate={setActivePage} />;
      case 'history': return <HistoryPage onNavigate={setActivePage} />;
      case 'settings': return <SettingsPage />;

      // Admin & Research Routes
      case 'dataset-studio': return <DatasetStudioPage onNavigate={setActivePage} />;
      case 'evaluation': return <EvaluationDashboard />;
      case 'models': return <ModelsPage onNavigate={setActivePage} />;
      case 'knowledge': return <KnowledgeBasePage />;
      case 'system-status': return <SystemStatusPage />;

      default: return <Dashboard onNavigate={setActivePage} doctor={doctor} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        active={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        doctor={doctor}
        onLogout={handleLogout}
        onGoPublic={() => setActivePage('home')}
      />
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {notification && (
          <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 3000, padding: '12px 22px',
            borderRadius: 'var(--radius-md)', fontSize: '0.86rem', fontWeight: 600,
            animation: 'slideUp 0.3s', boxShadow: 'var(--shadow-lg)',
            background: notification.type === 'success'
              ? 'linear-gradient(135deg, var(--accent-success), #059669)'
              : notification.type === 'warning'
                ? 'linear-gradient(135deg, var(--accent-warning), #d97706)'
                : 'linear-gradient(135deg, var(--accent-danger), #dc2626)',
            color: 'white', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>{notification.type === 'success' ? '✓' : notification.type === 'warning' ? '⚠' : '✕'}</span>
            {notification.msg}
          </div>
        )}
        {renderAppContent()}
        <FloatingVoiceAssistant onNavigateToSection={setActivePage} />
      </main>
    </div>
  );
}
