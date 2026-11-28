import React, { useState, useEffect, useRef } from 'react';
import { healthCompanionService } from '../../services/api';

const CATEGORIES = [
  'All',
  'Analgesic and Antipyretic',
  'Electrolyte Replenisher',
  'Beta-Lactam Antibiotic',
  'Macrolide / Azalide Antibiotic',
  'Antimalarial',
  'Fluoroquinolone Antibiotic',
  'Antihistamine',
  'Proton Pump Inhibitor (PPI)',
  'Biguanide Oral Hypoglycemic Agent',
  'Non-Steroidal Anti-Inflammatory Drug (NSAID)'
];

export default function MedicineGuidePage({ onNavigate }) {
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // OCR Strip Identification State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrConfirmationModal, setOcrConfirmationModal] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMedicines();
  }, [selectedCategory]);

  const fetchMedicines = async (query = searchQuery) => {
    setIsLoading(true);
    try {
      const data = await healthCompanionService.getMedicines(query, selectedCategory);
      setMedicines(data || []);
    } catch (err) {
      console.error('Fetch medicines error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMedicines(searchQuery);
  };

  // Handle Image Upload for OCR Medicine Identification
  const handleImageUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    setOcrResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const data = await healthCompanionService.identifyMedicineFromImage(file);
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze medicine packaging image.');
      }

      setOcrResult(data);
      setOcrConfirmationModal(true);
    } catch (err) {
      alert(`OCR Identification error: ${err.message}`);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmOcrMedicine = (med) => {
    setSelectedMedicine(med);
    setOcrConfirmationModal(false);
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>💊</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Verified Medicine Information Guide
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Authoritative 17-field clinical monographs • Packaging OCR recognition • Strict antibiotic and prescription safety
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Hidden File Input for Image Upload */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={isUploadingImage}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', padding: '10px 18px' }}
          >
            <span>📷</span>
            <span>{isUploadingImage ? 'Scanning Package OCR...' : 'Scan Medicine Strip / Box'}</span>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('companion')}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', padding: '10px 18px' }}
          >
            <span>💬</span>
            <span>Ask Health Companion</span>
          </button>
        </div>
      </div>

      {/* Safety Alert Banner */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          color: '#fbbf24',
          fontSize: '0.86rem'
        }}
      >
        <span style={{ fontSize: '1.2rem', marginTop: '1px' }}>🛡️</span>
        <div>
          <strong>Medicine Safety Principles</strong>: MediAgent is an educational information system. It never prescribes medications, alters dosages, or recommends antibiotics without a physician’s prescription. Always consult a qualified physician or pharmacist before starting, stopping, or modifying any medication.
        </div>
      </div>

      {/* Search Bar & Category Filters */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '18px 20px', marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by brand name (e.g. Dolo 650, Calpol, Electral, Novamox) or generic name (e.g. Paracetamol, Amoxicillin)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchMedicines(e.target.value);
              }}
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                fontSize: '0.92rem',
                outline: 'none'
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }}>
            Search
          </button>
        </form>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', whiteSpace: 'nowrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                border: selectedCategory === cat ? 'none' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '20px',
                padding: '5px 14px',
                fontSize: '0.78rem',
                fontWeight: selectedCategory === cat ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Medicines Cards Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto', width: '32px', height: '32px' }} />
          Loading verified medicine catalog...
        </div>
      ) : medicines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>No medicines found matching "{searchQuery}"</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '6px' }}>
            To safeguard health, MediAgent only presents verified monographs from recognized pharmacopeias.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {medicines.map((med) => {
            const isAntibiotic = med.therapeuticCategory.toLowerCase().includes('antibiotic');
            const isNsaid = med.therapeuticCategory.toLowerCase().includes('nsaid');

            return (
              <div
                key={med.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedMedicine(med)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span
                      style={{
                        background: 'var(--accent-primary-dim)',
                        color: 'var(--accent-primary)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 700
                      }}
                    >
                      {med.therapeuticCategory}
                    </span>

                    {isAntibiotic && (
                      <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                        Rx ONLY
                      </span>
                    )}

                    {isNsaid && (
                      <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                        NSAID
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.18rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {med.genericName}
                  </h3>

                  <div style={{ fontSize: '0.84rem', color: 'var(--accent-primary)', marginBottom: '10px' }}>
                    <strong>Brands</strong>: {med.brandName}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                    <strong>Strength</strong>: {med.composition}
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {med.uses}
                  </p>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                    Reviewed: {med.lastReviewedAt}
                  </span>
                  <span style={{ color: 'var(--accent-primary)', fontSize: '0.84rem', fontWeight: 600 }}>
                    View Full 17 Fields →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 17-Field Full Medicine Details Modal */}
      {selectedMedicine && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedMedicine(null)}
        >
          <div
            style={{
              background: '#0d1321',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div>
                <span style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                  {selectedMedicine.therapeuticCategory}
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
                  1. {selectedMedicine.genericName}
                </h2>
                <div style={{ fontSize: '0.92rem', color: 'var(--accent-primary)', marginTop: '2px' }}>
                  2. <strong>Generic Name</strong>: {selectedMedicine.genericName} | 3. <strong>Common Brands</strong>: {selectedMedicine.brandName}
                </div>
              </div>

              <button
                onClick={() => setSelectedMedicine(null)}
                style={{ background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Field Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.88rem' }}>
              {/* Field 4 & 5 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-card)', padding: '14px', borderRadius: '8px' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>4. Active Ingredients:</strong>
                  <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>
                    {(selectedMedicine.activeIngredients || []).join(', ')}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>5. Composition & Strength:</strong>
                  <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>
                    {selectedMedicine.composition}
                  </div>
                </div>
              </div>

              {/* Field 7: Uses */}
              <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--accent-primary)' }}>7. What the Medicine Is Used For (Approved Indications):</strong>
                <p style={{ color: 'var(--text-primary)', marginTop: '6px', lineHeight: '1.5' }}>
                  {selectedMedicine.uses}
                </p>
              </div>

              {/* Field 8: Mechanism */}
              <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>8. How It Works in the Body (Mechanism of Action):</strong>
                <p style={{ color: 'var(--text-primary)', marginTop: '6px', lineHeight: '1.5' }}>
                  {selectedMedicine.mechanism}
                </p>
              </div>

              {/* Field 9: Side Effects */}
              <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--accent-warning)' }}>9. Common Side Effects:</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '6px', color: 'var(--text-primary)' }}>
                  {(selectedMedicine.sideEffects || []).map((se, idx) => (
                    <li key={idx}>{se}</li>
                  ))}
                </ul>
              </div>

              {/* Field 10 & 11: Serious Adverse Effects & Contraindications */}
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '14px', borderRadius: '8px' }}>
                <strong style={{ color: '#ef4444' }}>10. Serious Adverse Effects & Warning Signs:</strong>
                <p style={{ color: '#fca5a5', marginTop: '4px', lineHeight: '1.5' }}>
                  {selectedMedicine.adverseEffects}
                </p>

                <div style={{ marginTop: '10px' }}>
                  <strong style={{ color: '#ef4444' }}>11. Contraindications (When NOT to take):</strong>
                  <p style={{ color: '#fca5a5', marginTop: '4px', lineHeight: '1.5' }}>
                    {selectedMedicine.contraindications}
                  </p>
                </div>
              </div>

              {/* Field 12 & 13: Precautions & Drug Interactions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>12. Important Precautions:</strong>
                  <p style={{ color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.5' }}>
                    {selectedMedicine.precautions}
                  </p>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>13. Known Drug Interactions:</strong>
                  <p style={{ color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.5' }}>
                    {selectedMedicine.interactions}
                  </p>
                </div>
              </div>

              {/* Field 14 & 15: Storage & Pregnancy */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>14. Storage Instructions:</strong>
                  <p style={{ color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.5' }}>
                    {selectedMedicine.storage}
                  </p>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>15. Pregnancy & Breastfeeding:</strong>
                  <p style={{ color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.5' }}>
                    {selectedMedicine.pregnancyLactation}
                  </p>
                </div>
              </div>

              {/* Field 16 & 17: Source & Last Reviewed */}
              <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>16. Source: </strong>
                  <a href={selectedMedicine.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-info)', textDecoration: 'none' }}>
                    {selectedMedicine.sourceName || 'WHO Model Formulary'}
                  </a>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>17. Last Reviewed: </strong>
                  <span style={{ color: 'var(--text-primary)' }}>{selectedMedicine.lastReviewedAt}</span>
                </div>
              </div>

              {/* Suggested Chatbot Prompts */}
              <div style={{ marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--accent-primary)', fontSize: '0.84rem' }}>💡 Ask Health Companion about this medicine:</strong>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {[
                    `What is ${selectedMedicine.genericName} used for?`,
                    `What precautions should I follow for ${selectedMedicine.genericName}?`,
                    `Can ${selectedMedicine.genericName} interact with other medications?`
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedMedicine(null);
                        if (onNavigate) onNavigate('companion');
                      }}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      "{p}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OCR Medicine Strip Confirmation Modal */}
      {ocrConfirmationModal && ocrResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#0d1321',
              border: '1px solid var(--accent-primary)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '620px',
              width: '100%',
              padding: '26px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '1.6rem' }}>📷</span>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Confirm Detected Medicine
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Safety Check: Confirm the medicine name before opening prescribing monograph
                </p>
              </div>
            </div>

            {/* Extracted OCR Text Preview */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Extracted Packaging Text (OCR):</div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontStyle: 'italic', maxHeight: '70px', overflowY: 'auto' }}>
                "{ocrResult.rawOcrText || 'No text detected'}"
              </div>
            </div>

            {/* Best Matched Medicine Candidate */}
            {ocrResult.matchedMedicine ? (
              <div
                style={{
                  background: 'var(--accent-primary-dim)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '18px'
                }}
              >
                <div style={{ fontSize: '0.76rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Top Match ({ocrResult.matchConfidence}% Confidence)
                </div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {ocrResult.matchedMedicine.genericName}
                </h4>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Brand: {ocrResult.matchedMedicine.brandName} | Strength: {ocrResult.matchedMedicine.composition}
                </div>
                <button
                  onClick={() => confirmOcrMedicine(ocrResult.matchedMedicine)}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '12px', padding: '10px' }}
                >
                  ✓ Confirm & View Full 17 Fields
                </button>
              </div>
            ) : (
              <div style={{ color: '#fca5a5', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '16px' }}>
                {ocrResult.message}
              </div>
            )}

            {/* Other Candidate Matches */}
            {ocrResult.candidateMedicines && ocrResult.candidateMedicines.length > 1 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Other Possible Matches:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ocrResult.candidateMedicines.slice(1).map(c => {
                    const fullMed = medicines.find(m => m.id === c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => fullMed && confirmOcrMedicine(fullMed)}
                        style={{
                          background: 'var(--bg-elevated)',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{c.genericName}</strong>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>{c.brandName}</div>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)' }}>Select →</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setOcrConfirmationModal(false)}
                className="btn btn-outline"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
