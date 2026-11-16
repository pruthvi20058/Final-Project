// MediAgent Medical Knowledge Base + TF-IDF Vector Search
const conditions = [
  {
    id: 'pneumonia', name: 'Pneumonia', icd10: 'J18.9', category: 'Respiratory',
    symptoms: ['cough','fever','shortness of breath','chest pain','fatigue','chills','sputum production','rapid breathing'],
    risk_factors: ['age over 65','smoking','chronic lung disease','weakened immune system','recent hospitalization'],
    differentials: ['bronchitis','tuberculosis','lung cancer','pulmonary embolism','heart failure'],
    severity: 'moderate-high',
    guidelines: 'Start empiric antibiotics within 4 hours. Obtain chest X-ray. Consider blood cultures if hospitalized. CURB-65 score for severity assessment.',
    treatments: ['Amoxicillin 500mg TID','Azithromycin 500mg then 250mg','Doxycycline 100mg BID'],
    evidence_level: 'A'
  },
  {
    id: 'mi', name: 'Myocardial Infarction (Heart Attack)', icd10: 'I21.9', category: 'Cardiovascular',
    symptoms: ['chest pain','chest pressure','shortness of breath','nausea','sweating','arm pain','jaw pain','dizziness','fatigue'],
    risk_factors: ['hypertension','diabetes','smoking','hyperlipidemia','family history','obesity','age over 55'],
    differentials: ['angina','pulmonary embolism','aortic dissection','pericarditis','GERD','costochondritis'],
    severity: 'critical',
    guidelines: 'EMERGENCY — activate cath lab. Aspirin 325mg immediately. 12-lead ECG within 10 min. Troponin levels. Door-to-balloon < 90 min for STEMI.',
    treatments: ['Aspirin 325mg STAT','Nitroglycerin SL','Heparin IV','Morphine if needed'],
    evidence_level: 'A'
  },
  {
    id: 'diabetes_t2', name: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', category: 'Endocrine',
    symptoms: ['increased thirst','frequent urination','fatigue','blurred vision','slow wound healing','tingling in extremities','unexplained weight loss'],
    risk_factors: ['obesity','sedentary lifestyle','family history','age over 45','gestational diabetes history','PCOS'],
    differentials: ['type 1 diabetes','LADA','hyperthyroidism','diabetes insipidus','Cushing syndrome'],
    severity: 'moderate',
    guidelines: 'HbA1c target < 7%. Start Metformin as first-line. Lifestyle modifications. Annual eye and foot exams. Monitor kidney function.',
    treatments: ['Metformin 500mg BID','Lifestyle modification','Empagliflozin 10mg daily'],
    evidence_level: 'A'
  },
  {
    id: 'asthma_acute', name: 'Acute Asthma Exacerbation', icd10: 'J45.901', category: 'Respiratory',
    symptoms: ['wheezing','shortness of breath','chest tightness','cough','rapid breathing','difficulty speaking','accessory muscle use'],
    risk_factors: ['history of asthma','allergen exposure','viral infection','exercise','cold air','GERD','smoking exposure'],
    differentials: ['COPD exacerbation','pneumonia','anaphylaxis','foreign body aspiration','heart failure','vocal cord dysfunction'],
    severity: 'moderate-high',
    guidelines: 'Assess severity with peak flow. Short-acting beta-agonist immediately. Systemic corticosteroids within 1 hour for moderate-severe. Reassess in 1 hour.',
    treatments: ['Albuterol nebulizer','Prednisone 40-60mg','Ipratropium bromide','Oxygen therapy'],
    evidence_level: 'A'
  },
  {
    id: 'uti', name: 'Urinary Tract Infection', icd10: 'N39.0', category: 'Infectious',
    symptoms: ['dysuria','urinary frequency','urgency','suprapubic pain','hematuria','cloudy urine','foul-smelling urine','pelvic pain'],
    risk_factors: ['female sex','sexual activity','menopause','catheter use','diabetes','urinary obstruction'],
    differentials: ['vaginitis','sexually transmitted infection','interstitial cystitis','kidney stones','pyelonephritis'],
    severity: 'low-moderate',
    guidelines: 'Urinalysis and culture. Empiric antibiotics for uncomplicated UTI. Imaging if recurrent or complicated.',
    treatments: ['Nitrofurantoin 100mg BID x5d','Trimethoprim-Sulfamethoxazole DS BID x3d','Fosfomycin 3g single dose'],
    evidence_level: 'A'
  },
  {
    id: 'hypertension', name: 'Hypertension', icd10: 'I10', category: 'Cardiovascular',
    symptoms: ['headache','dizziness','blurred vision','chest pain','shortness of breath','nosebleeds','often asymptomatic'],
    risk_factors: ['obesity','high sodium diet','sedentary lifestyle','family history','age','stress','smoking','excessive alcohol'],
    differentials: ['white coat hypertension','secondary hypertension','anxiety','pheochromocytoma','renal artery stenosis'],
    severity: 'moderate',
    guidelines: 'BP goal < 130/80 for most adults. Lifestyle modifications first. Pharmacotherapy if BP ≥ 140/90 or ≥ 130/80 with high CV risk.',
    treatments: ['Lisinopril 10mg daily','Amlodipine 5mg daily','Hydrochlorothiazide 25mg daily','Lifestyle modification'],
    evidence_level: 'A'
  },
  {
    id: 'migraine', name: 'Migraine', icd10: 'G43.909', category: 'Neurological',
    symptoms: ['severe headache','unilateral head pain','nausea','vomiting','photophobia','phonophobia','aura','visual disturbances','throbbing pain'],
    risk_factors: ['family history','female sex','hormonal changes','stress','sleep disturbances','certain foods','weather changes'],
    differentials: ['tension headache','cluster headache','subarachnoid hemorrhage','meningitis','temporal arteritis','brain tumor'],
    severity: 'low-moderate',
    guidelines: 'Acute: triptans within 1 hour of onset. Preventive if ≥4 attacks/month. Avoid triggers. Consider CGRP inhibitors for refractory cases.',
    treatments: ['Sumatriptan 50-100mg','Ibuprofen 400mg','Topiramate 25-100mg for prevention','Propranolol 40-160mg for prevention'],
    evidence_level: 'A'
  },
  {
    id: 'copd', name: 'COPD Exacerbation', icd10: 'J44.1', category: 'Respiratory',
    symptoms: ['worsening dyspnea','increased sputum','purulent sputum','wheezing','chest tightness','cyanosis','confusion','peripheral edema'],
    risk_factors: ['smoking history','age over 40','air pollution exposure','alpha-1 antitrypsin deficiency','occupational dust exposure'],
    differentials: ['pneumonia','heart failure','pulmonary embolism','pneumothorax','lung cancer'],
    severity: 'moderate-high',
    guidelines: 'Bronchodilators + systemic corticosteroids. Antibiotics if purulent sputum. Non-invasive ventilation if respiratory failure. Oxygen to target SpO2 88-92%.',
    treatments: ['Prednisone 40mg x5d','Albuterol/Ipratropium nebulizer','Azithromycin 500mg x3d','Supplemental oxygen'],
    evidence_level: 'A'
  },
  {
    id: 'dvt', name: 'Deep Vein Thrombosis', icd10: 'I82.40', category: 'Cardiovascular',
    symptoms: ['leg swelling','leg pain','warmth in affected area','redness','calf tenderness','distended veins'],
    risk_factors: ['immobilization','recent surgery','cancer','oral contraceptives','pregnancy','obesity','thrombophilia','long travel'],
    differentials: ['cellulitis','Baker cyst rupture','muscle strain','lymphedema','chronic venous insufficiency'],
    severity: 'high',
    guidelines: 'Wells score for risk stratification. D-dimer for low probability. Compression ultrasound for diagnosis. Anticoagulation immediately if confirmed.',
    treatments: ['Enoxaparin 1mg/kg BID','Rivaroxaban 15mg BID x21d then 20mg daily','Warfarin with INR target 2-3','Compression stockings'],
    evidence_level: 'A'
  },
  {
    id: 'appendicitis', name: 'Acute Appendicitis', icd10: 'K35.80', category: 'Gastrointestinal',
    symptoms: ['right lower quadrant pain','periumbilical pain','nausea','vomiting','fever','anorexia','rebound tenderness','guarding'],
    risk_factors: ['age 10-30','male sex','family history','low fiber diet'],
    differentials: ['ovarian cyst','ectopic pregnancy','mesenteric lymphadenitis','Crohn disease','kidney stones','gastroenteritis'],
    severity: 'high',
    guidelines: 'CT abdomen for diagnosis. Alvarado score for risk. Surgical consultation for appendectomy. IV antibiotics pre-operatively. NPO status.',
    treatments: ['Laparoscopic appendectomy','Piperacillin-Tazobactam IV','IV fluids','Pain management'],
    evidence_level: 'A'
  },
  {
    id: 'depression', name: 'Major Depressive Disorder', icd10: 'F32.9', category: 'Psychiatric',
    symptoms: ['depressed mood','loss of interest','fatigue','sleep disturbances','appetite changes','difficulty concentrating','feelings of worthlessness','psychomotor changes','suicidal ideation'],
    risk_factors: ['family history','prior episodes','chronic illness','substance abuse','social isolation','major life events','female sex'],
    differentials: ['bipolar disorder','hypothyroidism','anemia','substance use disorder','adjustment disorder','grief'],
    severity: 'moderate',
    guidelines: 'PHQ-9 for screening. Combination of psychotherapy + pharmacotherapy most effective. SSRI first-line. Safety assessment for suicidal ideation.',
    treatments: ['Sertraline 50mg daily','CBT psychotherapy','Escitalopram 10mg daily','Exercise recommendation'],
    evidence_level: 'A'
  },
  {
    id: 'ckd', name: 'Chronic Kidney Disease', icd10: 'N18.9', category: 'Renal',
    symptoms: ['fatigue','nausea','decreased appetite','edema','shortness of breath','confusion','decreased urine output','muscle cramps','pruritus'],
    risk_factors: ['diabetes','hypertension','age over 60','family history','obesity','cardiovascular disease','nephrotoxic medications'],
    differentials: ['acute kidney injury','heart failure','liver cirrhosis','nephrotic syndrome','urinary obstruction'],
    severity: 'moderate-high',
    guidelines: 'eGFR staging. ACE-I/ARB for proteinuria. BP target < 130/80. Avoid nephrotoxins. SGLT2 inhibitor if eGFR ≥ 20. Refer to nephrology if Stage 4+.',
    treatments: ['Lisinopril 10-40mg','Dapagliflozin 10mg','Sodium bicarbonate if acidotic','Erythropoiesis-stimulating agents if anemic'],
    evidence_level: 'A'
  },
  {
    id: 'stroke', name: 'Acute Ischemic Stroke', icd10: 'I63.9', category: 'Neurological',
    symptoms: ['sudden weakness','facial droop','arm weakness','speech difficulty','vision loss','severe headache','dizziness','confusion','ataxia'],
    risk_factors: ['hypertension','atrial fibrillation','diabetes','smoking','hyperlipidemia','prior stroke','age over 55','carotid stenosis'],
    differentials: ['hemorrhagic stroke','TIA','Todd paralysis','hypoglycemia','brain tumor','migraine with aura','Bell palsy'],
    severity: 'critical',
    guidelines: 'EMERGENCY — time is brain. CT head STAT to rule out hemorrhage. tPA within 4.5 hours of onset. NIHSS scoring. Stroke team activation.',
    treatments: ['Alteplase IV if within 4.5 hours','Aspirin 325mg after 24h','Mechanical thrombectomy if LVO','BP management'],
    evidence_level: 'A'
  },
  {
    id: 'gerd', name: 'Gastroesophageal Reflux Disease', icd10: 'K21.0', category: 'Gastrointestinal',
    symptoms: ['heartburn','regurgitation','chest pain','dysphagia','chronic cough','hoarseness','sour taste','bloating','nausea'],
    risk_factors: ['obesity','hiatal hernia','pregnancy','smoking','certain foods','lying down after meals','medications'],
    differentials: ['peptic ulcer','esophageal cancer','coronary artery disease','esophageal spasm','eosinophilic esophagitis'],
    severity: 'low',
    guidelines: 'Lifestyle modifications first. PPI trial for 8 weeks. Upper endoscopy if alarm symptoms or refractory. Step-down therapy after symptom control.',
    treatments: ['Omeprazole 20mg daily','Lifestyle modifications','Famotidine 20mg BID','Antacids PRN'],
    evidence_level: 'A'
  },
  {
    id: 'anaphylaxis', name: 'Anaphylaxis', icd10: 'T78.2', category: 'Immunological',
    symptoms: ['urticaria','angioedema','wheezing','stridor','hypotension','tachycardia','throat tightness','abdominal pain','dizziness','syncope'],
    risk_factors: ['prior anaphylaxis','known allergies','asthma','atopy','beta-blocker use'],
    differentials: ['severe asthma','vasovagal syncope','panic attack','carcinoid syndrome','mastocytosis','hereditary angioedema'],
    severity: 'critical',
    guidelines: 'EMERGENCY — Epinephrine IM (thigh) immediately. Do NOT delay. Repeat every 5-15 min if needed. IV fluids. Airway management. Observe 4-6 hours.',
    treatments: ['Epinephrine 0.3-0.5mg IM STAT','IV Normal Saline bolus','Diphenhydramine 50mg IV','Methylprednisolone 125mg IV'],
    evidence_level: 'A'
  },
  {
    id: 'malaria', name: 'Malaria', icd10: 'B54', category: 'Infectious / Tropical',
    symptoms: ['high fever','chills','rigors','profuse sweating','severe headache','nausea','vomiting','muscle pain','body ache','fatigue','anemia','jaundice','splenomegaly'],
    risk_factors: ['travel to endemic tropical area','mosquito bites','stagnant water exposure','monsoon season','lack of mosquito net use','outdoor night exposure'],
    differentials: ['typhoid fever','dengue fever','chikungunya','leptospirosis','viral hepatitis','influenza'],
    severity: 'moderate-high',
    guidelines: 'Confirmatory diagnosis via Peripheral Blood Smear (thick and thin films for Plasmodium species) and Rapid Diagnostic Test (RDT for Pf/Pv antigen). First-line treatment: Artemisinin-based Combination Therapy (ACT). Monitor for severe hemolytic anemia, hypoglycemia, and cerebral complications.',
    treatments: ['Artemether-Lumefantrine (Coartem) 80/480mg PO BID x3d','Artesunate IV for severe/cerebral malaria','Primaquine for P. vivax hypnozoite eradication (check G6PD)','Paracetamol for fever control (avoid NSAIDs if bleeding risk)'],
    evidence_level: 'A'
  },
  {
    id: 'typhoid', name: 'Typhoid (Enteric Fever)', icd10: 'A01.0', category: 'Infectious / Enteric',
    symptoms: ['step-ladder fever','prolonged high fever','headache','abdominal pain','constipation','pea-soup diarrhea','loss of appetite','rose spots','coated tongue','fatigue','malaise','bradycardia'],
    risk_factors: ['contaminated food or water','poor sanitation','recent travel to endemic area','unvaccinated status','eating raw/street food'],
    differentials: ['malaria','dengue fever','infectious mononucleosis','scrub typhus','brucellosis','acute gastroenteritis'],
    severity: 'moderate-high',
    guidelines: 'Blood culture during week 1 (gold standard). Stool/urine cultures in weeks 2-3. Widal test / Typhidot for serological screening. Empiric therapy with Ceftriaxone or Azithromycin due to widespread fluoroquinolone resistance. Monitor for intestinal perforation or hemorrhage.',
    treatments: ['Ceftriaxone 2g IV daily x10-14d','Azithromycin 500mg-1g PO daily x7d','Cefixime 400mg PO BID x14d','Fluid and electrolyte replacement'],
    evidence_level: 'A'
  },
  {
    id: 'chikungunya', name: 'Chikungunya Virus Disease', icd10: 'A92.0', category: 'Infectious / Arbovirus',
    symptoms: ['high fever','severe joint pain','arthralgia','joint swelling','morning stiffness','maculopapular rash','headache','muscle pain','body ache','fatigue','nausea'],
    risk_factors: ['Aedes mosquito exposure','tropical/subtropical climate','post-monsoon season','standing water near dwellings','daytime outdoor activity'],
    differentials: ['dengue fever','malaria','rheumatoid arthritis','reactive arthritis','Zika virus','parvovirus B19'],
    severity: 'moderate',
    guidelines: 'RT-PCR during acute viremic phase (days 1-8). Anti-CHIKV IgM ELISA after day 5. Distinguish from Dengue by checking complete blood count (Chikungunya causes severe disabling polyarthralgia with normal/mildly low platelets, whereas Dengue causes severe thrombocytopenia and vascular leakage). Avoid aspirin and NSAIDs until dengue is excluded.',
    treatments: ['Paracetamol 500-1000mg TID for fever and joint analgesia','Strict fluid hydration and rest','Physical therapy and gentle joint mobilization','Chloroquine or short-course corticosteroids for refractory chronic arthralgia'],
    evidence_level: 'A'
  },
  {
    id: 'dengue', name: 'Dengue Fever', icd10: 'A90', category: 'Infectious / Arbovirus',
    symptoms: ['sudden high fever','retro-orbital pain','severe headache','breakbone muscle and joint pain','petechial rash','nausea','vomiting','bleeding gums','fatigue','thrombocytopenia'],
    risk_factors: ['Aedes aegypti mosquito exposure','tropical urban areas','monsoon/rainy season','standing household water'],
    differentials: ['chikungunya','malaria','typhoid fever','measles','leptospirosis','influenza'],
    severity: 'moderate-high',
    guidelines: 'Dengue NS1 antigen test (days 1-5). Dengue IgM/IgG ELISA (after day 5). Serial complete blood count (CBC) monitoring for rapid platelet drop (< 100,000/uL) and rising hematocrit (> 20% hemoconcentration). Absolute contraindication for NSAIDs and Aspirin due to hemorrhage risk.',
    treatments: ['Oral rehydration solution (ORS) and IV crystalloids','Paracetamol for fever (strict avoidance of NSAIDs/Aspirin)','Close hemodynamic and platelet monitoring','Hospital admission if warning signs present (persistent vomiting, mucosal bleed)'],
    evidence_level: 'A'
  }
];

// Drug interaction database
const drugInteractions = [
  { drug1: 'Warfarin', drug2: 'Aspirin', severity: 'major', effect: 'Increased bleeding risk. Avoid combination unless specifically indicated.' },
  { drug1: 'Warfarin', drug2: 'Ibuprofen', severity: 'major', effect: 'Increased bleeding risk and potential GI hemorrhage.' },
  { drug1: 'Metformin', drug2: 'Contrast Dye', severity: 'major', effect: 'Risk of lactic acidosis. Hold Metformin 48h before/after contrast.' },
  { drug1: 'Lisinopril', drug2: 'Potassium supplements', severity: 'moderate', effect: 'Risk of hyperkalemia. Monitor potassium levels.' },
  { drug1: 'Lisinopril', drug2: 'Spironolactone', severity: 'moderate', effect: 'Additive hyperkalemia risk. Monitor electrolytes closely.' },
  { drug1: 'Sertraline', drug2: 'Tramadol', severity: 'major', effect: 'Risk of serotonin syndrome. Avoid combination.' },
  { drug1: 'Sertraline', drug2: 'MAOIs', severity: 'contraindicated', effect: 'Life-threatening serotonin syndrome. Absolutely contraindicated.' },
  { drug1: 'Simvastatin', drug2: 'Amiodarone', severity: 'major', effect: 'Increased risk of rhabdomyolysis. Limit simvastatin to 20mg.' },
  { drug1: 'Clopidogrel', drug2: 'Omeprazole', severity: 'moderate', effect: 'Reduced antiplatelet effect. Use pantoprazole instead.' },
  { drug1: 'Ciprofloxacin', drug2: 'Theophylline', severity: 'major', effect: 'Increased theophylline levels. Risk of toxicity.' },
  { drug1: 'Methotrexate', drug2: 'NSAIDs', severity: 'major', effect: 'Reduced renal clearance of methotrexate. Risk of toxicity.' },
  { drug1: 'Digoxin', drug2: 'Amiodarone', severity: 'major', effect: 'Increased digoxin levels. Reduce digoxin dose by 50%.' },
  { drug1: 'Fluconazole', drug2: 'Warfarin', severity: 'major', effect: 'Increased warfarin effect. Monitor INR closely.' },
  { drug1: 'Amlodipine', drug2: 'Simvastatin', severity: 'moderate', effect: 'Increased statin levels. Limit simvastatin to 20mg.' },
  { drug1: 'Albuterol', drug2: 'Propranolol', severity: 'moderate', effect: 'Beta-blocker may reduce bronchodilator effect. Use cardioselective beta-blocker.' }
];

// TF-IDF Vector Search Engine
class MedicalVectorSearch {
  constructor() {
    this.documents = [];
    this.idf = {};
    this.tfidfVectors = [];
    this.buildIndex();
  }

  tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  }

  buildIndex() {
    this.documents = conditions.map(c => ({
      id: c.id,
      text: `${c.name} ${c.symptoms.join(' ')} ${c.risk_factors.join(' ')} ${c.guidelines} ${c.differentials.join(' ')} ${c.category}`,
      condition: c
    }));

    const df = {};
    const N = this.documents.length;

    this.documents.forEach(doc => {
      const tokens = new Set(this.tokenize(doc.text));
      tokens.forEach(t => { df[t] = (df[t] || 0) + 1; });
    });

    Object.keys(df).forEach(t => {
      this.idf[t] = Math.log(N / df[t]);
    });

    this.tfidfVectors = this.documents.map(doc => {
      const tokens = this.tokenize(doc.text);
      const tf = {};
      tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      const maxTf = Math.max(...Object.values(tf));
      const vec = {};
      Object.keys(tf).forEach(t => {
        vec[t] = (tf[t] / maxTf) * (this.idf[t] || 0);
      });
      return vec;
    });
  }

  search(query, topK = 5) {
    const queryTokens = this.tokenize(query);
    const qtf = {};
    queryTokens.forEach(t => { qtf[t] = (qtf[t] || 0) + 1; });
    const maxQtf = Math.max(...Object.values(qtf), 1);
    const qVec = {};
    Object.keys(qtf).forEach(t => {
      qVec[t] = (qtf[t] / maxQtf) * (this.idf[t] || 0);
    });

    const scores = this.tfidfVectors.map((docVec, i) => {
      let dot = 0, normA = 0, normB = 0;
      const allKeys = new Set([...Object.keys(qVec), ...Object.keys(docVec)]);
      allKeys.forEach(k => {
        const a = qVec[k] || 0, b = docVec[k] || 0;
        dot += a * b; normA += a * a; normB += b * b;
      });
      const sim = normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
      return { index: i, score: sim, condition: this.documents[i].condition };
    });

    return scores.sort((a, b) => b.score - a.score).slice(0, topK).filter(s => s.score > 0.05);
  }
}

const vectorSearch = new MedicalVectorSearch();

module.exports = { conditions, drugInteractions, vectorSearch };
