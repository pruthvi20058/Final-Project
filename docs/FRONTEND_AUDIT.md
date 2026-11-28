# MediAgent E6 — Frontend Audit Report

**Date:** 2026-11-25  
**Scope:** All React pages, shared components, routing, navigation, API services, auth state, forms, responsive layout, accessibility  
**Status:** Initial audit complete

---

## 1. Page Inventory

### Public Pages
| Page | File | Status | Notes |
|------|------|--------|-------|
| Landing | `client/src/components/LandingPage.jsx` | Working | Hero, features, pipeline, tech stack, CTA |
| About | `client/src/pages/public/AboutPage.jsx` | Working | Project information |
| Features | `client/src/pages/public/FeaturesPage.jsx` | Working | Feature list |
| How It Works | `client/src/pages/public/HowItWorksPage.jsx` | Working | Workflow explanation |
| Research | `client/src/pages/public/ResearchPage.jsx` | Working | Research context |
| Contact | `client/src/pages/public/ContactPage.jsx` | Working | Contact form |

### Auth Pages
| Page | File | Status | Notes |
|------|------|--------|-------|
| Login | `client/src/components/LoginPage.jsx` | Working | Demo credentials, password toggle |
| Register | `client/src/pages/auth/RegisterPage.jsx` | Working | Role selection (self-assignment blocked on backend) |
| Forgot Password | `client/src/pages/auth/ForgotPasswordPage.jsx` | Working | Placeholder implementation |

### Application Pages (Authenticated)
| Page | File | Status | Notes |
|------|------|--------|-------|
| Dashboard | `client/src/components/Dashboard.jsx` | Working | Hardcoded metrics (see issues) |
| Health Companion | `client/src/pages/app/HealthCompanionPage.jsx` | Working | Chat interface |
| Medicine Guide | `client/src/pages/app/MedicineGuidePage.jsx` | Working | OCR medicine identification |
| Disease Guide | `client/src/pages/app/DiseaseGuidePage.jsx` | Working | Disease information |
| Chat History | `client/src/pages/app/ChatHistoryPage.jsx` | Working | Conversation history |
| Multilingual Voice | `client/src/pages/app/MultilingualVoicePage.jsx` | Working | Voice + text input |
| Agent Workflow | `client/src/pages/app/AgentWorkflowPage.jsx` | Working | Agent pipeline visualization |
| Patients | `client/src/pages/app/PatientsPage.jsx` | Working | Patient list |
| Patient Details | `client/src/pages/app/PatientDetailsPage.jsx` | Working | Patient detail view |
| Reports List | `client/src/pages/app/ReportsListPage.jsx` | Working | Report listing |
| Report Upload | `client/src/pages/app/ReportUploadPage.jsx` | Working | Drag-and-drop upload |
| Report Extraction | `client/src/pages/app/ReportExtractionPage.jsx` | Working | Lab result verification |
| Analysis Progress | `client/src/pages/app/AnalysisProgressPage.jsx` | Working | Pipeline progress |
| Predictions | `client/src/pages/app/PredictionPage.jsx` | Working | Disease prediction |
| Explainability (XAI) | `client/src/pages/app/ExplainabilityPage.jsx` | Working | SHAP explanations |
| Evidence | `client/src/pages/app/EvidencePage.jsx` | Working | Clinical RAG evidence |
| Risk & Uncertainty | `client/src/pages/app/RiskUncertaintyPage.jsx` | Working | Clinical risk assessment |
| Trends | `client/src/pages/app/TrendsPage.jsx` | Working | Patient history trends |
| Clinical Report | `client/src/pages/app/ClinicalReportPage.jsx` | Working | PDF report generation |
| Doctor Review | `client/src/pages/app/DoctorReviewPage.jsx` | Working | Physician review |
| History | `client/src/pages/app/HistoryPage.jsx` | Working | Assessment history |
| Settings | `client/src/pages/app/SettingsPage.jsx` | Working | User settings |

### Admin Pages
| Page | File | Status | Notes |
|------|------|--------|-------|
| Evaluation Dashboard | `client/src/pages/admin/EvaluationDashboard.jsx` | Working | Model metrics |
| Models | `client/src/pages/admin/ModelsPage.jsx` | Working | Model registry |
| Dataset Studio | `client/src/pages/admin/DatasetStudioPage.jsx` | Working | Dataset management |
| Knowledge Base | `client/src/pages/admin/KnowledgeBasePage.jsx` | Working | KB management |
| System Status | `client/src/pages/admin/SystemStatusPage.jsx` | Working | System health |

---

## 2. Component Inventory

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| App | `client/src/App.jsx` | Working | Router, auth init, hardcoded IDs |
| Sidebar | `client/src/components/Sidebar.jsx` | Working | No role filtering |
| Navbar | `client/src/components/Navbar.jsx` | Working | Duplicate auth logic |
| Dashboard | `client/src/components/Dashboard.jsx` | Working | Hardcoded metrics |
| AgentPipeline | `client/src/components/AgentPipeline.jsx` | Working | Pipeline visualization |
| AnalyticsPanel | `client/src/components/AnalyticsPanel.jsx` | Working | Analytics |
| ChatInterface | `client/src/components/ChatInterface.jsx` | Working | Chat UI |
| ConsultationHistory | `client/src/components/ConsultationHistory.jsx` | Working | History list |
| ConsultationPanel | `client/src/components/ConsultationPanel.jsx` | Working | Consultation UI |
| DemoBanner | `client/src/components/DemoBanner.jsx` | Working | Demo notice |
| DiagnosticReport | `client/src/components/DiagnosticReport.jsx` | Working | Report display |
| FloatingVoiceAssistant | `client/src/components/FloatingVoiceAssistant.jsx` | Working | Voice button |
| Footer | `client/src/components/Footer.jsx` | Working | Site footer |
| Hero3DCanvas | `client/src/components/Hero3DCanvas.jsx` | Working | 3D hero |
| Interactive3DCard | `client/src/components/Interactive3DCard.jsx` | Working | 3D card |
| Interactive3DEngineHub | `client/src/components/Interactive3DEngineHub.jsx` | Working | 3D hub |
| KnowledgeBase | `client/src/components/KnowledgeBase.jsx` | Working | KB UI |
| LandingPage | `client/src/components/LandingPage.jsx` | Working | Landing page |
| LoginPage | `client/src/components/LoginPage.jsx` | Working | Login form |
| ProbabilityBar | `client/src/components/ProbabilityBar.jsx` | Working | Probability display |
| SafetyDisclaimer | `client/src/components/SafetyDisclaimer.jsx` | Working | Safety notice |
| SettingsPanel | `client/src/components/SettingsPanel.jsx` | Working | Settings |
| StatusBadge | `client/src/components/StatusBadge.jsx` | Working | Status badge |
| Footer | `client/src/components/Footer.jsx` | Working | Footer |

---

## 3. Issues Identified

### Critical (High)

| # | Issue | File | Evidence |
|---|-------|------|----------|
| 1 | Hardcoded default patient `PAT-8001` | `App.jsx:86` | `useState('PAT-8001')` — breaks when no default account exists in production |
| 2 | Hardcoded default report `REP-9001` | `App.jsx:87` | `useState('REP-9001')` — references non-existent report |
| 3 | Hardcoded demo patients in upload dropdown | `ReportUploadPage.jsx:134-135` | PAT-8001/Sarah Johnson, PAT-8002/Michael Chen |
| 4 | Hardcoded dashboard metrics | `Dashboard.jsx:65-105` | Values 148, 142, 6, 3 not from backend |
| 5 | Hardcoded monthly data | `Dashboard.jsx:70-75` | Fabricated Apr-Aug report counts |
| 6 | Hardcoded risk pie data | `Dashboard.jsx:78-83` | Fabricated risk distribution |
| 7 | StatusBadge always "passed" | `Dashboard.jsx:143` | Not based on actual report status |
| 8 | No role-based navigation | `Sidebar.jsx` | All items visible to all roles |

### Medium

| # | Issue | File | Evidence |
|---|-------|------|----------|
| 9 | Duplicate auth check | `Navbar.jsx`, `App.jsx` | Both call `/api/auth/me` independently |
| 10 | No ProtectedRoute component | `App.jsx:147-150` | Inline auth check |
| 11 | No breadcrumbs | All pages | No breadcrumb navigation |
| 12 | No mobile hamburger menu | `Sidebar.jsx`, `index.css` | Sidebar collapses but no toggle on mobile |
| 13 | No upload progress indicator | `ReportUploadPage.jsx` | Disabled button only, no progress bar |
| 14 | No file validation before upload | `ReportUploadPage.jsx` | Relies solely on backend validation |

### Low

| # | Issue | File | Evidence |
|---|-------|------|----------|
| 15 | Hardcoded "Model v1.0.4" | `Sidebar.jsx:111` | Static version string |
| 16 | Inconsistent loading states | Multiple pages | Some pages show blank on load |
| 17 | No session expiration handling | `App.jsx` | Token expiry handled silently |
| 18 | No back navigation | Multiple pages | Browser back only |

---

## 4. Styling & Design System

The CSS design system in `client/src/index.css` is well-developed with:
- Consistent color palette (primary teal, secondary indigo, danger red, warning amber, success green)
- Dark theme with proper contrast ratios
- Responsive breakpoints at 768px, 900px, 1000px, 1100px, 1200px, 1400px
- Component styles for cards, buttons, inputs, tables, chips, modals, charts
- Print styles for clinical reports

**Gaps:**
- No CSS variables for component-specific spacing scale
- No focus-visible styles for keyboard navigation
- No reduced-motion media query
- No print-specific page breaks for multi-section reports

---

## 5. Accessibility (WCAG 2.2 AA) — Preliminary

| Check | Status | Notes |
|-------|--------|-------|
| Keyboard navigation | Partial | Most interactive elements are native buttons/links |
| Visible focus indicators | Not verified | No explicit `:focus-visible` styles |
| Accessible form labels | Partial | Most inputs have labels but not all use `<label>` elements |
| ARIA usage | Minimal | No ARIA attributes found in components |
| Color contrast | Partial | Dark theme colors appear sufficient but not verified |
| Color-only status | Partial | StatusBadge uses color + text, but some charts may use color only |
| Screen reader support | Not verified | No ARIA labels on charts, tables, or dynamic content |
| Reduced motion | Not implemented | No `prefers-reduced-motion` media query |

---

## 6. Browser Compatibility — Preliminary

| Feature | Chrome | Edge | Firefox | Safari | Notes |
|---------|--------|------|---------|--------|-------|
| File upload | Untested | Untested | Untested | Untested | Drag-and-drop API |
| Voice recording | Untested | Untested | Untested | Untested | MediaRecorder API |
| Speech recognition | Untested | Untested | Untested | Untested | Web Speech API (vendor prefixes) |
| TTS | Untested | Untested | Untested | Untested | Web Speech API |
| PDF preview | Untested | Untested | Untested | Untested | Browser-dependent |
| LocalStorage | Supported | Supported | Supported | Supported | Auth token storage |
| Fetch API | Supported | Supported | Supported | Supported | API communication |
| CSS Grid/Flexbox | Supported | Supported | Supported | Supported | Layout |
| Recharts | Supported | Supported | Supported | Supported | SVG charts |

---

## 7. Recommendations for E6

1. **Fix hardcoded patient/report IDs** — Derive from authenticated user's actual data
2. **Make dashboard metrics dynamic** — Fetch from backend API endpoints
3. **Add role-based navigation** — Filter sidebar items by user role
4. **Create ProtectedRoute component** — Centralize auth guards
5. **Add breadcrumbs** — Improve navigation context
6. **Add upload progress** — Show actual upload progress
7. **Add file validation** — Client-side validation before upload
8. **Improve accessibility** — Focus indicators, ARIA labels, reduced motion
9. **Add mobile hamburger menu** — Better mobile navigation
10. **Add session expiration handling** — Clear token on 401 responses
