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

import EvaluationDashboard from './pages/admin/EvaluationDashboard';
import ModelsPage from './pages/admin/ModelsPage';
import KnowledgeBasePage from './pages/admin/KnowledgeBasePage';
import SystemStatusPage from './pages/admin/SystemStatusPage';

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

  const defaultDoc = { id: 'DOC-101', name: 'Dr. Sarah Mitchell, MD', specialty: 'Endocrinology & Internal Medicine', role: 'Chief Resident' };
  const [doctor, setDoctor] = useState(defaultDoc);
  const [authChecked, setAuthChecked] = useState(true);
  const [activePage, setActivePageState] = useState(getInitialPage); // home | about | features | how-it-works | research | contact | login | register | forgot-password | dashboard | ...
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notification, setNotification] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState('PAT-8001');
  const [selectedReportId, setSelectedReportId] = useState('REP-9001');

  const setActivePage = (page) => {
    setActivePageState(page);
    try {
      const url = new URL(window.location);
      url.searchParams.set('page', page);
      window.history.pushState({}, '', url);
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = window.localStorage ? window.localStorage.getItem('mediagent_doctor') : null;
      if (saved) {
        setDoctor(JSON.parse(saved));
      }
    } catch {}
    setAuthChecked(true);

    const onPop = () => {
      try {
        const p = new URLSearchParams(window.location.search).get('page') || window.location.hash.replace('#', '');
        if (p) setActivePageState(p);
      } catch {}
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const handleLogin = (doc) => {
    setDoctor(doc);
    localStorage.setItem('mediagent_doctor', JSON.stringify(doc));
    setActivePage('dashboard');
    showNotification(`Welcome, ${doc.name}`, 'success');
  };

  const handleLogout = () => {
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

  // PUBLIC ROUTES
  if (['home', 'about', 'features', 'how-it-works', 'research', 'contact'].includes(activePage)) {
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
  if (['login', 'register', 'forgot-password'].includes(activePage)) {
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
      case 'evaluation': return <EvaluationDashboard />;
      case 'models': return <ModelsPage />;
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
              : 'linear-gradient(135deg, var(--accent-danger), #dc2626)',
            color: 'white', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>{notification.type === 'success' ? '✓' : '⚠'}</span>
            {notification.msg}
          </div>
        )}
        {renderAppContent()}
        <FloatingVoiceAssistant onNavigateToSection={setActivePage} />
      </main>
    </div>
  );
}
