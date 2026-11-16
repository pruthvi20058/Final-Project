import React, { useState, useEffect } from 'react';

const TOPIC_BADGES = {
  chikungunya: { label: 'Viral Disease', color: '#0d9488', icon: '🦟' },
  jaundice: { label: 'Clinical Sign (Hyperbilirubinemia)', color: '#f59e0b', icon: '🟡' },
  malaria: { label: 'Parasitic Disease', color: '#059669', icon: '🩸' },
  typhoid: { label: 'Bacterial Enteric Infection', color: '#6366f1', icon: '🦠' },
  dengue: { label: 'Flavivirus (Critical Phase Alert)', color: '#dc2626', icon: '⚠️' },
  'viral-fever': { label: 'Descriptive Syndrome', color: '#3b82f6', icon: '🌡️' }
};

const FALLBACK_DISEASE_DETAILS = {
  slug: 'chikungunya',
  diseaseName: 'Chikungunya',
  description: 'Chikungunya is a mosquito-borne viral disease caused by the chikungunya virus (CHIKV) transmitted by Aedes mosquitoes. It causes sudden high fever and severe, debilitating joint pain (arthralgia) that can persist for weeks to months.',
  transmission: 'Transmitted primarily by the bite of infected female Aedes aegypti and Aedes albopictus mosquitoes, biting predominantly during daylight hours.',
  incubationPeriod: 'Typically 3–7 days (range: 1–12 days) after being bitten by an infected mosquito.',
  symptoms: [
    'Sudden onset of high fever (> 39°C / 102°F)',
    'Severe bilateral and symmetrical polyarthralgia (hands, wrists, ankles, feet)',
    'Maculopapular rash appearing 2–5 days after fever onset',
    'Marked fatigue, headaches, nausea, and myalgia'
  ],
  warningSigns: [
    'Severe persistent abdominal pain or intractable vomiting',
    'Neurological signs: confusion, lethargy, seizures, altered mental status',
    'Bleeding manifestations (petechiae, purpura, mucosal bleeding)',
    'Signs of shock: cold clammy extremities, rapid feeble pulse, hypotension'
  ],
  prevention: [
    'Eliminate mosquito breeding sites: drain open stagnant water in flower pots, tires, and containers',
    'Apply DEET (20–30%) or Picaridin-based insect repellents during daytime hours',
    'Wear light-colored, long-sleeved shirts and full-length trousers',
    'Install fine-mesh window screens and use mosquito bed nets'
  ],
  guidelines: {
    dos: [
      'Take complete physical bed rest during acute febrile phase',
      'Hydrate aggressively with ORS, tender coconut water, and clean fluids (minimum 2.5–3 Litres/day)',
      'Use Paracetamol (up to 1g every 6 hours, max 3g/24h) for fever and pain control',
      'Consult a physician immediately if persistent joint swelling or red-flag warning signs develop'
    ],
    donts: [
      'DO NOT take Aspirin, Ibuprofen, or other NSAIDs until Dengue fever has been definitively ruled out (reduces bleeding risk)',
      'DO NOT self-medicate with antibiotics or corticosteroids without prescription',
      'DO NOT engage in strenuous physical activity or heavy lifting while joint inflammation persists',
      'DO NOT leave stagnant water unattended around living premises'
    ],
    foodHydration: [
      'Oral Rehydration Solution (ORS) sachets mixed in clean drinking water',
      'Electrolyte-rich fluids: fresh tender coconut water, clear vegetable broths, lemon water',
      'Nutrient-dense, easy-to-digest soft foods: rice congee, khichdi, steamed idlis, moong dal soup',
      'Vitamin C-rich fruits (papaya, amla, oranges) to support immune and platelet function'
    ]
  },
  diagnosis: 'Confirmatory diagnosis is established via RT-PCR (days 1–7 of illness) or IgM capture ELISA (after day 5). Complete Blood Count (CBC) typically reveals transient leukopenia and mild thrombocytopenia.',
  treatmentInformation: 'There is currently no specific antiviral therapy approved for Chikungunya. Clinical management is strictly supportive: antipyresis with paracetamol, adequate fluid balance, and gentle joint mobilization.',
  lastReviewedAt: '2026-10-15'
};

const FALLBACK_DISEASES_LIST = [
  { slug: 'chikungunya', diseaseName: 'Chikungunya', category: 'Vector-Borne Viral Infection', transmission: 'Aedes mosquito bite' },
  { slug: 'dengue', diseaseName: 'Dengue Fever', category: 'Flavivirus Infection', transmission: 'Aedes aegypti vector' },
  { slug: 'malaria', diseaseName: 'Malaria', category: 'Protozoan Parasitic Infection', transmission: 'Anopheles mosquito bite' },
  { slug: 'typhoid', diseaseName: 'Typhoid (Enteric Fever)', category: 'Bacterial Infection', transmission: 'Fecal-oral / contaminated food & water' },
  { slug: 'jaundice', diseaseName: 'Jaundice / Hyperbilirubinemia', category: 'Hepatic / Hemolytic Sign', transmission: 'Underlying liver or blood etiology' },
  { slug: 'viral-fever', diseaseName: 'Acute Viral Syndrome', category: 'Systemic Viral Infection', transmission: 'Respiratory droplets / contact' }
];

export default function DiseaseGuidePage({ onNavigate }) {
  const [diseases, setDiseases] = useState(FALLBACK_DISEASES_LIST);
  const [selectedDiseaseSlug, setSelectedDiseaseSlug] = useState('chikungunya');
  const [diseaseDetails, setDiseaseDetails] = useState(FALLBACK_DISEASE_DETAILS);
  const [activeTab, setActiveTab] = useState('overview'); // overview | diagnosis | treatment | dos_donts | food_hydration | warnings | prevention | faqs | sources
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDiseases();
  }, []);

  useEffect(() => {
    if (selectedDiseaseSlug) {
      fetchDiseaseDetails(selectedDiseaseSlug);
    }
  }, [selectedDiseaseSlug]);

  const fetchDiseases = async () => {
    try {
      const res = await fetch('/api/health-companion/diseases');
      const data = await res.json();
      if (data.success && data.diseases) {
        setDiseases(data.diseases);
      }
    } catch (err) {
      console.error('Fetch diseases error:', err);
    }
  };

  const fetchDiseaseDetails = async (slug) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/health-companion/diseases/${slug}`);
      const data = await res.json();
      if (data.success && data.disease) {
        setDiseaseDetails(data.disease);
      }
    } catch (err) {
      console.error('Fetch disease details error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentBadge = TOPIC_BADGES[selectedDiseaseSlug] || { label: 'Health Guide', color: '#0d9488', icon: '📋' };

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>🦠</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Disease Information & Clinical Care Guidance
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Authoritative clinical guides for 6 core conditions • Evidence-based Do's & Don'ts • Emergency Warning Signs
          </p>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('companion')}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', padding: '10px 18px' }}
        >
          <span>💬</span>
          <span>Ask Health Companion AI</span>
        </button>
      </div>

      {/* Six Disease Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {diseases.map((d) => {
          const badge = TOPIC_BADGES[d.slug] || { label: 'Topic', color: '#0d9488', icon: '🦠' };
          const isSelected = selectedDiseaseSlug === d.slug;

          return (
            <div
              key={d.id}
              onClick={() => {
                setSelectedDiseaseSlug(d.slug);
                setActiveTab('overview');
              }}
              style={{
                background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-card)',
                border: isSelected ? `2px solid ${badge.color}` : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSelected ? `0 0 16px ${badge.color}33` : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{badge.icon}</span>
                <span
                  style={{
                    backgroundColor: `${badge.color}20`,
                    color: badge.color,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.68rem',
                    fontWeight: 700
                  }}
                >
                  {badge.label}
                </span>
              </div>

              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {d.diseaseName}
              </h4>

              <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                Reviewed: {d.lastReviewedAt}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disease Detail Container */}
      {isLoading || !diseaseDetails ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto', width: '32px', height: '32px' }} />
          Loading clinical guide...
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden'
          }}
        >
          {/* Detailed Header Banner */}
          <div
            style={{
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(15, 23, 42, 0.8))',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span
                  style={{
                    backgroundColor: currentBadge.color,
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700
                  }}
                >
                  {currentBadge.label}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                  MediAgent Clinical Guide v2.4 • Last Reviewed: {diseaseDetails.lastReviewedAt}
                </span>
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {diseaseDetails.diseaseName}
              </h2>
            </div>

            <button
              onClick={() => {
                if (onNavigate) onNavigate('companion');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.84rem', padding: '8px 16px' }}
            >
              Ask Companion About {diseaseDetails.diseaseName} →
            </button>
          </div>

          {/* Critical Distinction Banners */}
          {diseaseDetails.slug === 'jaundice' && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '12px 28px',
                color: '#fbbf24',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <div>
                <strong>IMPORTANT CLINICAL DISTINCTION</strong>: Jaundice is a visible clinical sign of hyperbilirubinemia, not a single disease. It requires thorough laboratory and radiological evaluation to determine whether the root cause is hemolytic (red cell breakdown), hepatocellular (viral hepatitis, toxic injury), or obstructive (gallstones, biliary stricture).
              </div>
            </div>
          )}

          {diseaseDetails.slug === 'viral-fever' && (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '12px 28px',
                color: '#93c5fd',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <div>
                <strong>IMPORTANT CLINICAL DISTINCTION</strong>: "Viral fever" is a broad descriptive syndromic classification for non-specific acute febrile illness caused by diverse viruses. <strong>Antibiotics are completely ineffective against viral fever</strong> and should never be taken without documented bacterial infection.
              </div>
            </div>
          )}

          {diseaseDetails.slug === 'dengue' && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px 28px',
                color: '#fca5a5',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🚨</span>
              <div>
                <strong>CRITICAL DENGUE WARNING</strong>: The most dangerous phase—the Critical Phase marked by plasma leakage and shock—paradoxically occurs <strong>as the high fever drops (defervescence, days 3–7)</strong>. Absence of fever does NOT mean the patient has recovered!
              </div>
            </div>
          )}

          {/* Interactive Tabs Header */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              padding: '10px 24px 0 24px',
              borderBottom: '1px solid var(--border-color)',
              overflowX: 'auto',
              background: 'var(--bg-elevated)',
              whiteSpace: 'nowrap'
            }}
          >
            {[
              { id: 'overview', label: 'A. Overview & Causes' },
              { id: 'diagnosis', label: 'B. Diagnosis & Labs' },
              { id: 'treatment', label: 'C. General Management' },
              { id: 'dos_donts', label: 'D & E. Do’s & Don’ts' },
              { id: 'food_hydration', label: 'F. Food & Hydration' },
              { id: 'warnings', label: 'G. Warning Signs' },
              { id: 'prevention', label: 'H. Prevention' },
              { id: 'faqs', label: 'I. FAQs (Q&A)' },
              { id: 'sources', label: 'J. Verified Sources' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  borderTop: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  padding: '10px 16px',
                  fontSize: '0.84rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  borderTopLeftRadius: '6px',
                  borderTopRightRadius: '6px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Body */}
          <div style={{ padding: '28px', minHeight: '380px' }}>
            {/* TAB A: OVERVIEW & CAUSES */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px' }}>
                    What is {diseaseDetails.diseaseName}?
                  </h3>
                  <p style={{ color: 'var(--text-primary)', lineHeight: '1.7', fontSize: '0.94rem' }}>
                    {diseaseDetails.description}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Etiology & Causes
                    </h4>
                    <p style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}>
                      {diseaseDetails.causes}
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Transmission
                    </h4>
                    <p style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}>
                      {diseaseDetails.transmission}
                    </p>
                    {diseaseDetails.incubationPeriod && (
                      <div style={{ marginTop: '8px', fontSize: '0.84rem', color: 'var(--accent-primary)' }}>
                        <strong>Incubation Period</strong>: {diseaseDetails.incubationPeriod}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Common Presenting Symptoms
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                    {(diseaseDetails.symptoms || []).map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--accent-primary)' }}>•</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Known Complications
                  </h4>
                  <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    {(diseaseDetails.complications || []).map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB B: DIAGNOSIS & LAB INVESTIGATIONS */}
            {activeTab === 'diagnosis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: 'var(--radius-md)' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px' }}>
                    Clinical Identification
                  </h3>
                  <p style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    {diseaseDetails.diagnosis.clinical_identification}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Relevant Laboratory Investigations
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(diseaseDetails.diagnosis.laboratory_investigations || []).map((lab, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '14px 18px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong style={{ color: 'var(--accent-primary)', fontSize: '0.94rem' }}>{lab.test}</strong>
                          <span style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem' }}>
                            Timing: {lab.timing}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.86rem', lineHeight: '1.5' }}>
                          <strong>Clinical Significance</strong>: {lab.significance}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                    <strong style={{ color: 'var(--accent-warning)', fontSize: '0.86rem' }}>Diagnostic Limitations:</strong>
                    <p style={{ color: 'var(--text-primary)', marginTop: '4px', fontSize: '0.86rem' }}>
                      {diseaseDetails.diagnosis.limitations}
                    </p>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                    <strong style={{ color: 'var(--accent-primary)', fontSize: '0.86rem' }}>When Further Evaluation Is Necessary:</strong>
                    <p style={{ color: 'var(--text-primary)', marginTop: '4px', fontSize: '0.86rem' }}>
                      {diseaseDetails.diagnosis.when_to_seek_care}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB C: GENERAL TREATMENT INFORMATION */}
            {activeTab === 'treatment' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '10px' }}>
                    Common Medical Treatment Approaches
                  </h3>
                  <p style={{ color: 'var(--text-primary)', lineHeight: '1.7', fontSize: '0.92rem' }}>
                    {diseaseDetails.treatmentInformation}
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    color: '#93c5fd',
                    fontSize: '0.88rem'
                  }}
                >
                  <strong>Clinical Scope Notice</strong>: MediAgent provides generalized evidence-based supportive treatment information. It does not prescribe personalized medicine, drug dosages, or antibiotic courses. Prescriptions must be issued only by licensed healthcare professionals following clinical evaluation and laboratory confirmation.
                </div>
              </div>
            )}

            {/* TAB D & E: DO'S & DON'TS */}
            {activeTab === 'dos_donts' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {/* Do's */}
                <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>
                    <span>✅</span>
                    <span>Evidence-Based Do's</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {((diseaseDetails.guidelines && diseaseDetails.guidelines.dos && diseaseDetails.guidelines.dos.content) || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Don'ts */}
                <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>
                    <span>❌</span>
                    <span>Disease-Specific Don'ts</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {((diseaseDetails.guidelines && diseaseDetails.guidelines.donts && diseaseDetails.guidelines.donts.content) || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB F: FOOD & HYDRATION */}
            {activeTab === 'food_hydration' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {(() => {
                  const fh = (diseaseDetails.guidelines && diseaseDetails.guidelines.food_hydration && diseaseDetails.guidelines.food_hydration.content) || {};
                  return (
                    <>
                      <div style={{ background: 'var(--bg-card)', padding: '18px 20px', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ color: 'var(--accent-primary)', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                          💧 Hydration Target
                        </h4>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.94rem' }}>
                          {fh.hydration_target || 'At least 2.5 to 3 liters of fluids daily.'}
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                          <strong style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>Recommended Fluids:</strong>
                          <ul style={{ paddingLeft: '20px', marginTop: '8px', color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '0.88rem' }}>
                            {(fh.recommended_fluids || []).map((f, idx) => <li key={idx}>{f}</li>)}
                          </ul>
                        </div>

                        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                          <strong style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>Nutritional Guidelines:</strong>
                          <ul style={{ paddingLeft: '20px', marginTop: '8px', color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '0.88rem' }}>
                            {(fh.dietary_guidelines || []).map((d, idx) => <li key={idx}>{d}</li>)}
                          </ul>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                        <strong style={{ color: '#ef4444', fontSize: '0.9rem' }}>Foods to Avoid:</strong>
                        <ul style={{ paddingLeft: '20px', marginTop: '8px', color: '#fca5a5', lineHeight: '1.6', fontSize: '0.88rem' }}>
                          {(fh.foods_to_avoid || []).map((a, idx) => <li key={idx}>{a}</li>)}
                        </ul>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* TAB G: EMERGENCY WARNING SIGNS */}
            {activeTab === 'warnings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid #ef4444',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px' }}>
                    <span>🚨</span>
                    <span>Emergency Warning Signs for {diseaseDetails.diseaseName}</span>
                  </div>
                  <p style={{ color: '#fca5a5', fontSize: '0.88rem', marginBottom: '14px' }}>
                    If you or a patient displays any of the following symptoms, call emergency services or proceed immediately to the nearest hospital emergency room:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {((diseaseDetails.guidelines && diseaseDetails.guidelines.warning_signs && diseaseDetails.guidelines.warning_signs.content) || diseaseDetails.warningSigns || []).map((w, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <span style={{ color: '#ef4444' }}>⚠</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB H: PREVENTION */}
            {activeTab === 'prevention' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '12px' }}>
                    Evidence-Based Prevention Strategies
                  </h3>
                  <p style={{ color: 'var(--text-primary)', lineHeight: '1.7', fontSize: '0.94rem' }}>
                    {diseaseDetails.prevention}
                  </p>
                </div>
              </div>
            )}

            {/* TAB I: FREQUENTLY ASKED QUESTIONS */}
            {activeTab === 'faqs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Frequently Asked Questions (Authoritative Clinical Q&A)
                </h3>
                {((diseaseDetails.guidelines && diseaseDetails.guidelines.faqs && diseaseDetails.guidelines.faqs.content) || []).map((faq, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px'
                    }}
                  >
                    <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.96rem', fontWeight: 700, marginBottom: '8px' }}>
                      Q: {faq.question}
                    </h4>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.6' }}>
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB J: VERIFIED SOURCES */}
            {activeTab === 'sources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Official Sources & References
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                  MediAgent consults recognized public health authorities and published clinical protocols:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(diseaseDetails.guidelines || {}).map(([type, g]) => (
                    <div
                      key={type}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        padding: '14px 18px',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{g.sourceName || 'WHO / National Guidelines'}</strong>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>Guideline Section: {type}</div>
                      </div>
                      {g.sourceUrl && (
                        <a
                          href={g.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                        >
                          Visit Official Source ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
