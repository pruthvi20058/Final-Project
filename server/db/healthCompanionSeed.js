/**
 * MediAgent Health Companion — Verified Medical Knowledge Base & Seed Data
 * Authoritative public health sources: WHO, MoHFW (India), NCDC, NVBDCP, CDC, NHS, WHO Model Formulary.
 */

const MEDICAL_SOURCES = [
  {
    id: 'SRC-WHO-GLOBAL',
    source_name: 'World Health Organization (WHO) Fact Sheets & Guidelines',
    source_url: 'https://www.who.int/news-room/fact-sheets',
    publication_date: '2023-09-15',
    access_date: '2026-10-15',
    review_date: '2026-10-15',
    document_version: 'v2023.2'
  },
  {
    id: 'SRC-MOHFW-INDIA',
    source_name: 'Ministry of Health and Family Welfare (MoHFW), Government of India',
    source_url: 'https://www.mohfw.gov.in',
    publication_date: '2023-06-20',
    access_date: '2026-10-15',
    review_date: '2026-10-15',
    document_version: 'National Health Portal Manual v4.1'
  },
  {
    id: 'SRC-NCDC-INDIA',
    source_name: 'National Centre for Disease Control (NCDC), Directorate General of Health Services',
    source_url: 'https://ncdc.gov.in',
    publication_date: '2022-11-10',
    access_date: '2026-10-15',
    review_date: '2026-10-15',
    document_version: 'NCDC Clinical Management Guidelines'
  },
  {
    id: 'SRC-NVBDCP-INDIA',
    source_name: 'National Vector Borne Disease Control Programme (NVBDCP)',
    source_url: 'https://nvbdcp.gov.in',
    publication_date: '2023-04-12',
    access_date: '2026-10-15',
    review_date: '2026-10-15',
    document_version: 'NVBDCP National Guidelines'
  },
  {
    id: 'SRC-CDC-GLOBAL',
    source_name: 'Centers for Disease Control and Prevention (CDC)',
    source_url: 'https://www.cdc.gov',
    publication_date: '2024-01-18',
    access_date: '2026-10-15',
    review_date: '2026-10-15',
    document_version: 'CDC Yellow Book & Clinical Guidance'
  },
  {
    id: 'SRC-NHS-UK',
    source_name: 'National Health Service (NHS), UK Health A to Z',
    source_url: 'https://www.nhs.uk/conditions',
    publication_date: '2023-08-01',
    access_date: '2026-10-15',
    review_date: '2026-10-15',
    document_version: 'NHS Conditions Directory 2023'
  },
  {
    id: 'SRC-WHO-EML',
    source_name: 'WHO Model List of Essential Medicines & British National Formulary (BNF)',
    source_url: 'https://list.essentialmeds.org',
    publication_date: '2023-07-26',
    access_date: '2026-10-15',
    review_date: '2026-10-15',
    document_version: '23rd WHO Model List'
  }
];

const MEDICINES = [
  {
    id: 'MED-PARACETAMOL-650',
    brand_name: 'Dolo 650, Calpol 650, Crocin 650, P-650',
    generic_name: 'Paracetamol / Acetaminophen',
    active_ingredients: JSON.stringify(['Paracetamol (Acetaminophen)']),
    composition: 'Each uncoated tablet contains: Paracetamol IP 650 mg',
    therapeutic_category: 'Analgesic and Antipyretic',
    uses: 'Relief of mild to moderate pain (headache, toothache, muscle aches, backache) and reduction of fever associated with viral infections, cold, flu, and post-vaccination.',
    mechanism: 'Inhibits prostaglandin synthesis centrally within the central nervous system (CNS) through selective cyclooxygenase (COX-2 / variant COX-3) inhibition, elevating the pain threshold and acting on the hypothalamic heat-regulating center to produce antipyresis.',
    side_effects: JSON.stringify([
      'Nausea and mild gastrointestinal discomfort',
      'Allergic skin rash or urticaria (rare)',
      'Transient elevations in liver transaminases (with excessive dosing)',
      'Thrombocytopenia or leukopenia (extremely rare)'
    ]),
    adverse_effects: 'Dose-dependent hepatotoxicity, acute liver failure resulting from toxic accumulation of N-acetyl-p-benzoquinone imine (NAPQI), angioedema, Stevens-Johnson syndrome, and toxic epidermal necrolysis.',
    contraindications: 'Severe hepatic impairment, end-stage active liver disease, and known hypersensitivity to paracetamol or any excipient in the formulation.',
    precautions: 'Do not exceed maximum daily adult limit of 4,000 mg (4 grams) from all sources. Exercise caution in chronic alcohol dependency, severe malnutrition, anorexia, and mild-to-moderate chronic liver disease. Do not combine with other paracetamol-containing cough/cold formulations.',
    interactions: 'Chronic high-dose co-administration with Warfarin may mildly enhance hypoprothrombinemic effect. Hepatotoxic risk is heightened with chronic ethanol, rifampicin, phenytoin, carbamazepine, and isoniazid. Concomitant cholestyramine decreases paracetamol absorption.',
    storage: 'Store below 25°C in a dry place. Protect from direct heat, sunlight, and moisture. Keep tightly closed and out of reach of children.',
    pregnancy_lactation: 'Epidemiological studies indicate paracetamol is generally acceptable for short-term use during pregnancy and lactation at the lowest effective therapeutic dose under medical supervision.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-ORS-WHO',
    brand_name: 'Electral, ORS-L, Prolyte, Relyte, Walyte',
    generic_name: 'Oral Rehydration Salts (Reduced Osmolarity WHO Formula)',
    active_ingredients: JSON.stringify([
      'Sodium Chloride (2.6 g/L)',
      'Anhydrous Glucose (13.5 g/L)',
      'Potassium Chloride (1.5 g/L)',
      'Trisodium Citrate Dihydrate (2.9 g/L)'
    ]),
    composition: 'Total Osmolarity: 245 mOsm/L. Sodium: 75 mmol/L, Chloride: 65 mmol/L, Glucose: 75 mmol/L, Potassium: 20 mmol/L, Citrate: 10 mmol/L.',
    therapeutic_category: 'Electrolyte Replenisher and Rehydration Solution',
    uses: 'Prevention and replacement of fluid and electrolyte depletion caused by acute diarrheal diseases, cholera, viral gastroenteritis, vomiting, excessive sweating, and high-fever illnesses (dengue, malaria, typhoid, chikungunya).',
    mechanism: 'Utilizes the intact intestinal sodium-glucose coupled cotransport mechanism across the brush border membrane of enterocytes. Sodium is actively absorbed along with glucose, creating an osmotic gradient that drives passive water absorption into the systemic circulation.',
    side_effects: JSON.stringify([
      'Mild nausea or vomiting if ingested too quickly in large gulps',
      'Hypernatremia (if mixed with too little water or concentrated powders improperly)'
    ]),
    adverse_effects: 'Severe hyperkalemia or fluid overload if administered in severe anuric acute kidney injury; worsening dehydration if mixed in hypertonic concentrations.',
    contraindications: 'Severe hypovolemic shock requiring intravenous resuscitation, intestinal obstruction (paralytic ileus), intractable persistent vomiting precluding oral intake, and acute bowel perforation.',
    precautions: 'Must be reconstituted in the exact volume of clean drinking water specified on the sachet (typically 1 liter). Do not add sugar, milk, fruit juices, or soft drinks to the mixture. Reconstituted solution must be used within 24 hours or discarded.',
    interactions: 'Concurrent potassium-sparing diuretics or ACE inhibitors may increase hyperkalemia risk in patients with renal compromise.',
    storage: 'Store sachets in a cool, dry place away from moisture. Once mixed with clean water, store in a clean covered container and discard any unused portion after 24 hours.',
    pregnancy_lactation: 'Safe and strongly recommended during pregnancy and lactation for preventing and correcting dehydration.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-AMOXICILLIN-500',
    brand_name: 'Amoxil, Novamox, Mox, Almox',
    generic_name: 'Amoxicillin Trihydrate',
    active_ingredients: JSON.stringify(['Amoxicillin Trihydrate']),
    composition: 'Each capsule/tablet contains Amoxicillin Trihydrate equivalent to Amoxicillin 500 mg',
    therapeutic_category: 'Aminopenicillin Beta-Lactam Antibiotic',
    uses: 'Prescription-only treatment of documented bacterial infections: acute otitis media, streptococcal pharyngitis, community-acquired pneumonia, skin infections, and urinary tract infections caused by susceptible organisms.',
    mechanism: 'Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins (PBPs), disrupting peptidoglycan cross-linking and activating autolytic enzymes, resulting in bacterial cell lysis and death.',
    side_effects: JSON.stringify([
      'Diarrhea and loose stools',
      'Nausea and dyspepsia',
      'Mild maculopapular skin rash',
      'Oral or vaginal candidiasis (thrush)'
    ]),
    adverse_effects: 'Severe anaphylaxis and angioedema in penicillin-allergic patients, Clostridioides difficile-associated pseudomembranous colitis, interstitial nephritis, and severe cutaneous reactions.',
    contraindications: 'History of immediate-type hypersensitivity (anaphylaxis, hives, angioedema) to penicillins or beta-lactams.',
    precautions: 'PRESCRIPTION ONLY. Must NOT be taken for viral infections (viral fever, common cold, chikungunya, dengue). Inappropriate antibiotic usage drives antimicrobial resistance. In infectious mononucleosis (EBV), causes widespread erythematous rash.',
    interactions: 'Probenecid reduces renal tubular secretion, elevating amoxicillin plasma levels. May transiently decrease efficacy of oral contraceptives. Concurrent allopurinol increases the frequency of antibiotic-induced skin rashes.',
    storage: 'Store below 25°C in a dry place. Protect from heat and moisture.',
    pregnancy_lactation: 'Pregnancy Category B. Widely used and considered safe during pregnancy and lactation when prescribed by a physician.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-AZITHROMYCIN-500',
    brand_name: 'Zithromax, Azithral, Azee, Zady',
    generic_name: 'Azithromycin',
    active_ingredients: JSON.stringify(['Azithromycin']),
    composition: 'Each film-coated tablet contains Azithromycin Dihydrate equivalent to Azithromycin 500 mg',
    therapeutic_category: 'Macrolide / Azalide Antibiotic',
    uses: 'Prescription-only antibiotic for community-acquired respiratory tract infections, atypical pneumonia (Mycoplasma, Chlamydia), uncomplicated typhoid fever (where indicated by culture/sensitivity), and sexually transmitted chlamydial infections.',
    mechanism: 'Reversibly binds to the 50S ribosomal subunit of susceptible microorganisms, inhibiting transpeptidation and protein synthesis without affecting human DNA synthesis.',
    side_effects: JSON.stringify([
      'Gastrointestinal cramping and abdominal pain',
      'Diarrhea',
      'Nausea and vomiting',
      'Headache and dizziness'
    ]),
    adverse_effects: 'QT prolongation, torsades de pointes, cardiac arrhythmias, cholestatic jaundice, hepatic dysfunction, and Clostridioides difficile colitis.',
    contraindications: 'Known hypersensitivity to azithromycin, erythromycin, or any macrolide/ketolide. History of cholestatic jaundice or hepatic impairment associated with prior azithromycin use.',
    precautions: 'PRESCRIPTION ONLY. Do not use without a physician prescription. Contraindicated for self-medication in viral illnesses. Patients with pre-existing prolonged QT intervals, hypokalemia, or taking antiarrhythmics require careful cardiac evaluation.',
    interactions: 'Concurrent administration with antacids containing aluminum or magnesium reduces peak serum concentration. Increased risk of ventricular arrhythmias when co-administered with QT-prolonging drugs (amiodarone, haloperidol, fluoroquinolones).',
    storage: 'Store below 30°C in a dry place. Keep protected from moisture and out of reach of children.',
    pregnancy_lactation: 'Pregnancy Category B. Use during pregnancy only if clearly needed and prescribed by an obstetrician. Excreted in breast milk in small amounts.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-ARTEMETHER-LUMEFANTRINE',
    brand_name: 'Coartem, Riamet, Lumart, Falcigo-Plus',
    generic_name: 'Artemether + Lumefantrine',
    active_ingredients: JSON.stringify(['Artemether (20 mg / 80 mg)', 'Lumefantrine (120 mg / 480 mg)']),
    composition: 'Fixed-dose Artemisinin-based Combination Therapy (ACT): Artemether 80 mg and Lumefantrine 480 mg per forte tablet.',
    therapeutic_category: 'Antimalarial (Artemisinin Combination Therapy - ACT)',
    uses: 'First-line prescription treatment of acute uncomplicated Plasmodium falciparum malaria and chloroquine-resistant Plasmodium vivax malaria, verified by diagnostic microscopy or rapid diagnostic tests (RDT).',
    mechanism: 'Artemether is rapidly metabolized to dihydroartemisinin, which generates reactive endoperoxide free radicals that damage parasite organelles. Lumefantrine clears residual parasites over an extended half-life by preventing hemozoin detoxification.',
    side_effects: JSON.stringify([
      'Headache and dizziness',
      'Palpitations',
      'Abdominal pain, anorexia, and mild nausea',
      'Myalgia and arthralgia'
    ]),
    adverse_effects: 'QTc interval prolongation, severe hypersensitivity reactions, hepatotoxicity, and delayed hemolytic anemia.',
    contraindications: 'Severe/complicated malaria (which mandates parenteral artesunate), first trimester of pregnancy (unless no alternative), severe congenital QT prolongation, and known allergy to artemisinin derivatives.',
    precautions: 'PRESCRIPTION ONLY. Must be taken with fatty food or whole milk to ensure adequate enteral absorption of lumefantrine. Complete the full 3-day 6-dose course even if symptoms subside early to prevent relapse and resistance.',
    interactions: 'Grapefruit juice, ketoconazole, and macrolides may elevate lumefantrine levels. Strong CYP3A4 inducers (rifampicin, carbamazepine, St. John’s wort) significantly reduce ACT blood levels and risk treatment failure.',
    storage: 'Store below 30°C. Protect from heat, light, and humidity.',
    pregnancy_lactation: 'WHO recommends ACT for uncomplicated malaria during the 2nd and 3rd trimesters. In the 1st trimester, use quinine + clindamycin unless parenteral artesunate or ACT is life-saving.',
    source_id: 'SRC-WHO-GLOBAL',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-CHLOROQUINE-250',
    brand_name: 'Lariago, Resochin, Nivaquine',
    generic_name: 'Chloroquine Phosphate',
    active_ingredients: JSON.stringify(['Chloroquine Phosphate']),
    composition: 'Each tablet contains Chloroquine Phosphate IP 250 mg (equivalent to 155 mg chloroquine base).',
    therapeutic_category: '4-Aminoquinoline Antimalarial & Amebicide',
    uses: 'Treatment and chemoprophylaxis of malaria caused by susceptible strains of Plasmodium vivax, P. malariae, and P. ovale; hepatic amebiasis; and certain rheumatologic disorders (rheumatoid arthritis, lupus erythematosus) under specialist care.',
    mechanism: 'Concentrates in the acidic food vacuole of the intraerythrocytic plasmodium, inhibiting heme polymerase. This prevents the crystallization of toxic toxic ferriprotoporphyrin IX (free heme) into non-toxic hemozoin, poisoning the parasite.',
    side_effects: JSON.stringify([
      'Pruritus (especially intense in individuals of African ancestry)',
      'Gastrointestinal distress (nausea, vomiting, diarrhea)',
      'Headache, dizziness, and visual blurring',
      'Transient hypotension'
    ]),
    adverse_effects: 'Irreversible retinopathy with chronic cumulative dosing, sensorineural deafness, cardiomyopathy, prolonged QT arrhythmia, neuropsychiatric manifestations, and agranulocytosis.',
    contraindications: 'Pre-existing retinal disease or maculopathy, myasthenia gravis, hypersensitivity to 4-aminoquinolines, and concurrent administration with other known retinal-toxic medications.',
    precautions: 'PRESCRIPTION ONLY. Not recommended in regions with documented chloroquine-resistant P. falciparum or P. vivax. Caution in patients with porphyria, G6PD deficiency, or severe renal/hepatic impairment.',
    interactions: 'Co-administration with antacids or cimetidine modifies absorption. Avoid concurrent halofantrine or other QT-prolonging agents due to fatal arrhythmia hazard.',
    storage: 'Store protected from light and moisture in a well-closed container below 25°C.',
    pregnancy_lactation: 'Chloroquine has an established safety profile for the treatment and prophylaxis of chloroquine-sensitive malaria during pregnancy under clinician supervision.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-CIPROFLOXACIN-500',
    brand_name: 'Cifran, Ciplox, Ciprobid, Floxin',
    generic_name: 'Ciprofloxacin Hydrochloride',
    active_ingredients: JSON.stringify(['Ciprofloxacin Hydrochloride']),
    composition: 'Each film-coated tablet contains Ciprofloxacin Hydrochloride equivalent to Ciprofloxacin 500 mg.',
    therapeutic_category: 'Second-Generation Fluoroquinolone Antibiotic',
    uses: 'Prescription-only treatment for susceptible bacterial infections including complicated urinary tract infections, infectious diarrhea (severe Shigella/Campylobacter), bone and joint infections, and confirmed enteric fever (Typhoid) where strain susceptibility is demonstrated.',
    mechanism: 'Bactericidal agent that inhibits bacterial DNA gyrase (topoisomerase II) and topoisomerase IV, preventing DNA replication, transcription, repair, and recombination.',
    side_effects: JSON.stringify([
      'Nausea, vomiting, and diarrhea',
      'Restlessness, tremors, and headache',
      'Dizziness and lightheadedness',
      'Skin photosensitivity upon UV/sunlight exposure'
    ]),
    adverse_effects: 'Black box warnings: Tendonitis and tendon rupture (especially Achilles tendon), exacerbation of myasthenia gravis, peripheral neuropathy, central nervous system toxicities, and aortic aneurysm rupture.',
    contraindications: 'Known hypersensitivity to fluoroquinolones, history of quinolone-induced tendon disorders, and concurrent administration of tizanidine.',
    precautions: 'PRESCRIPTION ONLY. Do not use for viral infections or mild self-limiting traveler’s diarrhea. High rates of fluoroquinolone-resistant Salmonella Typhi exist across South Asia. Hydrate well to prevent crystalluria.',
    interactions: 'Divalent and trivalent cations (calcium, magnesium, iron, zinc, aluminum antacids) dramatically reduce ciprofloxacin bioavailability. Increases theophylline and tizanidine toxicity by inhibiting CYP1A2.',
    storage: 'Store below 25°C in a dry environment. Keep shielded from sunlight and moisture.',
    pregnancy_lactation: 'Generally avoided during pregnancy and breastfeeding due to potential risk of cartilage damage in developing joints; reserved only when safer alternatives are unavailable.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-CETIRIZINE-10',
    brand_name: 'Zyrtec, Cetzine, Alerid, Okacet',
    generic_name: 'Cetirizine Hydrochloride',
    active_ingredients: JSON.stringify(['Cetirizine Hydrochloride']),
    composition: 'Each film-coated tablet contains Cetirizine Hydrochloride IP 10 mg.',
    therapeutic_category: 'Second-Generation H1 Antihistamine',
    uses: 'Symptomatic relief of allergic rhinitis, perennial allergic symptoms, seasonal rhinoconjunctivitis, urticaria, pruritus, and histamine-mediated allergic reactions.',
    mechanism: 'Potent, highly selective peripheral H1 receptor antagonist that inhibits histamine release and eosinophil chemotaxis during allergic inflammatory responses without significant anticholinergic or sedative CNS penetration.',
    side_effects: JSON.stringify([
      'Mild somnolence / drowsiness (less than first-generation antihistamines)',
      'Dry mouth',
      'Fatigue and malaise',
      'Pharyngitis and headache'
    ]),
    adverse_effects: 'Urinary retention in predisposed individuals, bronchospasm (rare), angioedema, and severe allergic hypersensitivity.',
    contraindications: 'Severe end-stage renal failure (creatinine clearance < 10 mL/min) and known hypersensitivity to cetirizine, hydroxyzine, or piperazine derivatives.',
    precautions: 'Caution when driving or operating hazardous machinery, as somnolence may occur. Avoid concurrent alcohol or central nervous system depressants. Dosage adjustment required in moderate-to-severe renal impairment.',
    interactions: 'Concomitant alcohol or sedatives can compound psychomotor impairment. Small decrease in clearance when taken with theophylline.',
    storage: 'Store between 15°C and 30°C. Protect from moisture and excessive light.',
    pregnancy_lactation: 'Pregnancy Category B. Animal data show no fetal harm. Consult a healthcare professional before use in pregnancy and breastfeeding.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-PANTOPRAZOLE-40',
    brand_name: 'Pantocid, Pan 40, Pantodac, Protonix',
    generic_name: 'Pantoprazole Sodium',
    active_ingredients: JSON.stringify(['Pantoprazole Sodium Sesquihydrate']),
    composition: 'Each enteric-coated tablet contains Pantoprazole Sodium Sesquihydrate equivalent to Pantoprazole 40 mg.',
    therapeutic_category: 'Proton Pump Inhibitor (PPI) / Antisecretory Agent',
    uses: 'Gastroesophageal reflux disease (GERD), erosive esophagitis, duodenal and gastric ulcers, Zollinger-Ellison syndrome, and prevention of NSAID-induced gastric injury under medical guidance.',
    mechanism: 'Substituted benzimidazole that concentrates in the acidic secretory canaliculi of parietal cells, binding covalently to sulfhydryl groups of the H+/K+-ATPase enzyme, irreversibly blocking final step of gastric acid secretion.',
    side_effects: JSON.stringify([
      'Headache and dizziness',
      'Diarrhea or constipation',
      'Abdominal pain and flatulence',
      'Nausea'
    ]),
    adverse_effects: 'Long-term risks: hypomagnesemia, bone fractures (osteoporosis), Clostridioides difficile colitis, vitamin B12 deficiency, acute interstitial nephritis, and fundic gland polyps.',
    contraindications: 'Known hypersensitivity to pantoprazole or substituted benzimidazoles; concurrent use with rilpivirine-containing HIV regimens.',
    precautions: 'Tablets must be swallowed whole with water 30 to 60 minutes before breakfast; do not chew, crush, or split enteric coating. Rule out gastric malignancy prior to prolonged treatment, as PPIs can mask early symptoms.',
    interactions: 'Reduces gastric absorption of ketoconazole, itraconazole, iron salts, and atazanavir. Pantoprazole has lower CYP2C19 interaction potential than omeprazole with clopidogrel.',
    storage: 'Store below 25°C in original packaging. Protect from excessive heat and direct moisture.',
    pregnancy_lactation: 'Use during pregnancy only if potential benefit justifies potential fetal risk under physician advice. Excreted in human breast milk.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-METFORMIN-500',
    brand_name: 'Glucophage, Glycomet, Riomet, Formin',
    generic_name: 'Metformin Hydrochloride',
    active_ingredients: JSON.stringify(['Metformin Hydrochloride']),
    composition: 'Each sustained/extended release tablet contains Metformin Hydrochloride IP 500 mg.',
    therapeutic_category: 'Biguanide Oral Hypoglycemic Agent',
    uses: 'First-line pharmacological management of Type 2 Diabetes Mellitus in adults and children 10 years and older, used alongside medical nutrition therapy and physical activity; polycystic ovary syndrome (PCOS) under specialist care.',
    mechanism: 'Activates AMP-activated protein kinase (AMPK), suppressing hepatic gluconeogenesis and glycogenolysis, enhancing peripheral insulin sensitivity in skeletal muscle, and slightly retarding intestinal glucose absorption without stimulating pancreatic beta-cell insulin secretion (low hypoglycemia risk).',
    side_effects: JSON.stringify([
      'Diarrhea and flatulence',
      'Nausea and abdominal discomfort',
      'Metallic taste in mouth',
      'Anorexia'
    ]),
    adverse_effects: 'Lactic acidosis (rare but life-threatening emergency, incidence ~3-5 per 100,000 patient-years), and long-term malabsorption of Vitamin B12 leading to peripheral neuropathy.',
    contraindications: 'Severe renal dysfunction (eGFR < 30 mL/min/1.73 m²), acute metabolic acidosis, diabetic ketoacidosis, acute heart failure, tissue hypoxemia, sepsis, and severe hepatic failure.',
    precautions: 'Take with or immediately after meals to minimize gastrointestinal adverse effects. Temporarily withhold prior to iodinated radiocontrast imaging procedures and elective major surgeries. Monitor renal function and B12 annually.',
    interactions: 'Iodinated radiocontrast agents increase risk of acute renal failure and lactic acidosis. Cationic transport inhibitors (cimetidine, dolutegravir) increase metformin blood levels. Alcohol markedly potentiates lactic acidosis risk.',
    storage: 'Store between 20°C and 25°C. Keep protected from moisture and light.',
    pregnancy_lactation: 'Often continued under endocrinologist guidance for gestational diabetes or pre-existing type 2 diabetes when dietary modification alone is insufficient.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'MED-IBUPROFEN-400',
    brand_name: 'Brufen, Advil, Motrin, Ibugesic',
    generic_name: 'Ibuprofen',
    active_ingredients: JSON.stringify(['Ibuprofen']),
    composition: 'Each film-coated tablet contains Ibuprofen IP 400 mg.',
    therapeutic_category: 'Non-Steroidal Anti-Inflammatory Drug (NSAID)',
    uses: 'Relief of inflammatory pain (osteoarthritis, rheumatoid arthritis, dysmenorrhea, dental pain) and post-traumatic soft-tissue injuries.',
    mechanism: 'Non-selectively inhibits cyclooxygenase isoenzymes COX-1 and COX-2, impeding the conversion of arachidonic acid to pro-inflammatory prostaglandins and thromboxane.',
    side_effects: JSON.stringify([
      'Dyspepsia, heartburn, and abdominal discomfort',
      'Nausea',
      'Mild fluid retention and peripheral edema',
      'Dizziness'
    ]),
    adverse_effects: 'Gastrointestinal ulceration, severe hemorrhage, perforation, acute kidney injury, worsening hypertension, thrombotic cardiovascular events (myocardial infarction and stroke), and severe exacerbation of asthma in aspirin-sensitive patients.',
    contraindications: 'CRITICAL WARNING: STRICTLY CONTRAINDICATED in suspected or confirmed DENGUE, CHIKUNGUNYA with bleeding tendencies, or active platelet deficiency due to severe potentiation of fatal gastrointestinal and mucosal hemorrhage! Also contraindicated in active peptic ulcer, severe heart failure, and late pregnancy.',
    precautions: 'NEVER use in acute undifferentiated viral fevers where dengue cannot be excluded. Use the lowest effective dose for the shortest possible duration. Avoid in patients with asthma without prior established tolerance. Take with food or milk.',
    interactions: 'Increases bleeding risk with anticoagulants (warfarin, heparin), antiplatelets (aspirin, clopidogrel), and SSRIs. Blunts antihypertensive efficacy of ACE inhibitors, ARBs, and diuretics, while elevating nephrotoxicity.',
    storage: 'Store below 25°C. Keep dry and protected from light.',
    pregnancy_lactation: 'STRICTLY CONTRAINDICATED in the third trimester of pregnancy (causes premature closure of fetal ductus arteriosus, oligohydramnios, and prolonged labor). Avoid during conception and first/second trimesters unless essential.',
    source_id: 'SRC-WHO-EML',
    last_reviewed_at: '2026-10-15'
  }
];

const DISEASES = [
  {
    id: 'DIS-CHIKUNGUNYA',
    disease_name: 'Chikungunya',
    slug: 'chikungunya',
    clinical_type: 'disease',
    description: 'Chikungunya is a mosquito-borne viral disease caused by the Chikungunya virus (CHIKV), an alphavirus of the Togaviridae family. It is characterized by acute onset of high fever and debilitating polyarthralgia that predominantly affects peripheral joints. While rarely fatal, the severe joint pain can become chronic and persist for months or years.',
    causes: 'Infection with Chikungunya virus (CHIKV), a single-stranded positive-sense RNA alphavirus.',
    transmission: 'Transmitted to humans through the bites of infected female Aedes mosquitoes, primarily Aedes aegypti and Aedes albopictus. These mosquitoes bite primarily during daytime hours (early morning and late afternoon). No direct person-to-person transmission occurs through ordinary casual contact.',
    incubation_period: 'Typically 3 to 7 days (range: 1 to 12 days) after the bite of an infected mosquito.',
    risk_factors: JSON.stringify([
      'Living in or traveling to tropical and subtropical endemic regions',
      'Presence of stagnant water collections around domestic environments (breeding sites)',
      'Lack of mosquito screen barriers and daytime outdoor exposure',
      'Older adults (age > 65 years) who are at higher risk for severe or chronic disease',
      'Newborns exposed during delivery from viremic mothers',
      'Individuals with underlying medical conditions (hypertension, diabetes, heart disease)'
    ]),
    symptoms: JSON.stringify([
      'Abrupt high-grade fever (often > 39°C / 102°F)',
      'Severe, debilitating joint pain (polyarthralgia), typically bilateral and symmetrical, affecting wrists, ankles, fingers, and knees',
      'Joint swelling and stiffness, frequently worse in the morning',
      'Maculopapular rash appearing 2 to 5 days after fever onset, mostly on trunk and limbs',
      'Muscle pain (myalgia) and general fatigue',
      'Severe headache, retro-orbital pain, and nausea'
    ]),
    complications: JSON.stringify([
      'Chronic debilitating polyarthritis persisting for months or even years in up to 30-40% of patients',
      'Neurological complications including meningoencephalitis, Guillain-Barré syndrome, and myelitis (rare)',
      'Ocular manifestations such as anterior uveitis, episcleritis, and retinitis',
      'Severe myocarditis or hemodynamic decompensation in frail elderly individuals'
    ]),
    diagnosis: JSON.stringify({
      clinical_identification: 'Recognized by sudden high fever, bilateral severe joint pain, and characteristic rash in areas with known Aedes mosquito transmission. Clinicians must differentiate it from dengue, malaria, and Zika.',
      laboratory_investigations: [
        {
          test: 'RT-PCR (Reverse Transcriptase Polymerase Chain Reaction)',
          timing: 'First 1 to 7 days from symptom onset',
          significance: 'Detects viral RNA directly; gold standard for confirmation during the acute viremic phase.'
        },
        {
          test: 'Serology (IgM Capture ELISA)',
          timing: 'Day 5 and onwards after symptom onset',
          significance: 'Detects CHIKV-specific IgM antibodies. Highest titers present between 3 to 5 weeks; persists for roughly 2 months.'
        },
        {
          test: 'Complete Blood Count (CBC)',
          timing: 'Acute phase',
          significance: 'Typically reveals mild leukopenia, lymphopenia, and mild thrombocytopenia (platelets rarely drop below 100,000, unlike severe dengue).'
        }
      ],
      limitations: 'Serological cross-reactivity with other alphaviruses (O’nyong-nyong virus) can occur. Negative antibody tests in the first 4 days do not exclude early infection.',
      when_to_seek_care: 'Immediate medical evaluation is needed if fever is accompanied by neurological symptoms, unremitting vomiting, inability to drink fluids, or severe joint swelling.'
    }),
    treatment_information: 'There is no specific antiviral medication for Chikungunya virus. Treatment is entirely supportive and directed toward relieving symptoms: adequate rest, fluid replacement, and antipyretics/analgesics (paracetamol). Aspirin and non-steroidal anti-inflammatory drugs (NSAIDs) must be strictly avoided during the acute phase until dengue is ruled out, to prevent severe bleeding complications. Chronic arthritis requires rheumatologic follow-up.',
    prevention: 'Primary prevention centers on preventing mosquito bites and eliminating breeding sites: install insect wire screens on doors and windows; apply registered insect repellents (containing DEET, Picaridin, or IR3535) to exposed skin; wear light-colored, long-sleeved clothing; empty and scrub domestic water storage containers, flower pots, tires, and roof gutters at least once weekly.',
    warning_signs: JSON.stringify([
      'Altered mental state, confusion, lethargy, or loss of consciousness',
      'Persistent intractable vomiting and inability to retain oral fluids',
      'Signs of severe dehydration (dry tongue, sunken eyes, rapid heart rate, little or no urine output)',
      'Severe unremitting abdominal pain',
      'Spontaneous bleeding from gums, nose, skin petechiae, or blood in vomit/stool',
      'Difficulty breathing or sudden chest tightness'
    ]),
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'DIS-JAUNDICE',
    disease_name: 'Jaundice (Clinical Sign / Hyperbilirubinemia)',
    slug: 'jaundice',
    clinical_type: 'clinical_sign',
    description: 'IMPORTANT CLINICAL DISTINCTION: Jaundice is not a single disease entity; it is a clinical sign characterized by yellowish discoloration of the skin, mucous membranes, and sclera (the whites of the eyes) caused by elevated levels of bilirubin in the bloodstream (hyperbilirubinemia > 2.5–3.0 mg/dL). It is a manifestation of underlying hepatic, hematologic, or biliary tract disorders requiring prompt professional diagnosis.',
    causes: 'Categorized anatomically into three major pathophysiology mechanisms: 1) Pre-hepatic (Hemolytic): excessive breakdown of red blood cells (malaria, hemolytic anemia, sickle cell disease, G6PD deficiency). 2) Intra-hepatic (Hepatocellular): liver parenchyma inflammation, damage, or necrosis (Viral Hepatitis A, B, C, E, alcohol-related liver injury, drug-induced liver injury e.g. paracetamol overdose, autoimmune hepatitis). 3) Post-hepatic (Obstructive): mechanical obstruction of bile ducts preventing bile drainage into the intestine (gallstones/choledocholithiasis, strictures, tumors of head of pancreas or bile duct).',
    transmission: 'Non-transmissible as a sign. However, underlying infectious etiologies have specific transmission pathways: Hepatitis A & E transmit via feco-oral contaminated food and water; Hepatitis B & C transmit parenterally via blood, unsterilized needles, or sexual contact; Malaria transmits through Anopheles mosquito vectors.',
    incubation_period: 'Varies by etiology: Hepatitis A (15-50 days), Hepatitis E (15-64 days), Hepatitis B (30-180 days), Hepatitis C (14-180 days), Gallstones (develop over years).',
    risk_factors: JSON.stringify([
      'Consumption of untreated, contaminated drinking water or unhygienic street food (Hepatitis A & E)',
      'Heavy chronic alcohol consumption',
      'Exposure to hepatotoxic drugs, unmonitored herbal supplements, or industrial solvents',
      'Unprotected blood transfusions, shared needles, tattooing with non-sterile equipment (Hepatitis B & C)',
      'History of gallstones or biliary colic',
      'Family history of hemolytic anemia or Gilbert syndrome'
    ]),
    symptoms: JSON.stringify([
      'Yellow discoloration of the sclera (whites of eyes), skin, and sublingual tissue',
      'Dark, tea-colored or brownish urine',
      'Pale, clay-colored, or acholic stools (indicative of biliary outflow obstruction)',
      'Generalized pruritus (intense itching of the skin due to bile salt deposition)',
      'Loss of appetite (anorexia), nausea, and aversion to oily foods',
      'Fatigue, generalized weakness, and low-grade or fluctuating fever',
      'Right upper quadrant abdominal fullness, tenderness, or dull aching'
    ]),
    complications: JSON.stringify([
      'Acute liver failure (fulminant hepatic failure) with hepatic encephalopathy and cerebral edema',
      'Ascending cholangitis and sepsis from infected obstructed bile ducts',
      'Coagulopathy with life-threatening spontaneous gastrointestinal hemorrhage',
      'Chronic liver disease, cirrhosis, and hepatorenal syndrome'
    ]),
    diagnosis: JSON.stringify({
      clinical_identification: 'Physician visual inspection under natural daylight of sclera, soft palate, and nail beds, coupled with detailed history of onset, stool/urine color, alcohol intake, and medications.',
      laboratory_investigations: [
        {
          test: 'Serum Bilirubin (Total, Direct, and Indirect / Fractionated)',
          timing: 'Immediate upon clinical detection',
          significance: 'Confirms hyperbilirubinemia. Unconjugated (indirect) predominance points to hemolysis or Gilbert syndrome. Conjugated (direct) predominance indicates hepatocellular injury or biliary obstruction.'
        },
        {
          test: 'Liver Function Tests (ALT, AST, ALP, GGT, Total Protein, Albumin)',
          timing: 'Initial evaluation',
          significance: 'Elevated ALT/AST (>10x upper limit) indicates acute hepatocellular damage (hepatitis). Elevated ALP and GGT indicate cholestasis or biliary tract obstruction.'
        },
        {
          test: 'Viral Hepatitis Serology Panel (Anti-HAV IgM, HBsAg, Anti-HCV, Anti-HEV IgM)',
          timing: 'Acute presentation',
          significance: 'Identifies or excludes acute and chronic viral hepatitis etiologies.'
        },
        {
          test: 'Abdominal Ultrasonography (USG Whole Abdomen)',
          timing: 'First 24 hours of clinical evaluation',
          significance: 'Non-invasive visualization of liver echotexture, gallstones, gallbladder inflammation, and biliary duct dilatation.'
        },
        {
          test: 'Prothrombin Time / INR',
          timing: 'Evaluation of hepatic synthetic function',
          significance: 'Crucial prognostic marker; rising INR signals acute liver failure and requires urgent intensive care.'
        }
      ],
      limitations: 'Single lab values cannot establish etiology without imaging and clinical correlation. Gilbert syndrome causes mild fluctuating unconjugated jaundice during stress/fasting without actual liver disease.',
      when_to_seek_care: 'ANY patient presenting with visible yellowish sclera requires professional clinical assessment without delay.'
    }),
    treatment_information: 'Because jaundice is a manifestation of diverse conditions, treatment is targeted strictly at the confirmed underlying etiology. For acute viral hepatitis A and E: supportive care, rest, adequate calories and hydration, avoiding hepatotoxic drugs and alcohol. For obstructive gallstones or cholangitis: endoscopic retrograde cholangiopancreatography (ERCP) or surgical clearance. For drug-induced jaundice: immediate cessation of the offending agent. NEVER rely on unscientific roadside jaundice cures, tattooing, or restrictive starvation diets, which cause malnutrition and worsen liver injury.',
    prevention: 'Vaccination against Hepatitis A and Hepatitis B; drinking only boiled or adequately purified water; strict hand hygiene before eating; food safety practices; avoiding recreational alcohol abuse; using sterile needles and screened blood; cautious medication usage under medical advice.',
    warning_signs: JSON.stringify([
      'Confusion, extreme drowsiness, slurred speech, or personality changes (signs of Hepatic Encephalopathy)',
      'Severe, unremitting upper right abdominal pain with high fever and shaking chills (Charcot triad for cholangitis)',
      'Vomiting blood (hematemesis) or passing dark black tarry stools (melena)',
      'Marked swelling of the abdomen (ascites) or legs (pedal edema)',
      'Spontaneous bruising, bleeding gums, or purpuric spots under the skin',
      'Rapidly deepening yellow-green hue of eyes and skin within 24 to 48 hours'
    ]),
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'DIS-MALARIA',
    disease_name: 'Malaria',
    slug: 'malaria',
    clinical_type: 'disease',
    description: 'Malaria is a life-threatening, preventable and curable infectious disease caused by protozoan parasites of the genus Plasmodium, transmitted through the bites of infected female Anopheles mosquitoes. The infection leads to cyclic destruction of red blood cells, causing acute febrile paroxysms. Left untreated, Plasmodium falciparum malaria can rapidly progress to severe multi-organ failure and death within 24 hours.',
    causes: 'Infection by protozoan parasites of the genus Plasmodium. Five species infect humans: Plasmodium falciparum (most dangerous and responsible for cerebral malaria), Plasmodium vivax (widespread in Asia and Americas, capable of dormant hypnozoite relapses), Plasmodium ovale, Plasmodium malariae, and Plasmodium knowlesi.',
    transmission: 'Transmitted predominantly through the bite of infective female Anopheles mosquitoes, which bite between dusk and dawn. Rarely transmitted through blood transfusion, organ transplantation, or vertical mother-to-child transmission during pregnancy/delivery.',
    incubation_period: 'Typically 9 to 14 days for P. falciparum; 12 to 18 days for P. vivax and P. ovale; 18 to 40 days for P. malariae. Chemoprophylaxis can prolong incubation for weeks or months.',
    risk_factors: JSON.stringify([
      'Living in or traveling to malaria-endemic regions (Sub-Saharan Africa, South Asia, Southeast Asia, parts of South America)',
      'Young children under 5 years of age (lack acquired protective immunity)',
      'Pregnant women (higher risk of severe anemia, miscarriage, and low birthweight)',
      'Patients with HIV/AIDS or immunosuppression',
      'Non-immune travelers entering high-transmission endemic areas without chemoprophylaxis'
    ]),
    symptoms: JSON.stringify([
      'Classic malarial paroxysms featuring three stages: 1) Cold stage (intense shivering and feeling cold for 15-60 min); 2) Hot stage (high fever 39-41°C, dry burning skin, intense headache for 2-6 hrs); 3) Sweating stage (profuse diaphoresis, rapid fever drop, exhaustion for 2-4 hrs)',
      'Periodic fever occurring every 48 hours (tertian in P. vivax/falciparum) or 72 hours (quartan in P. malariae)',
      'Profound generalized fatigue, body aches, and malaise',
      'Nausea, vomiting, diarrhea, and poor appetite',
      'Splenomegaly (enlarged tender spleen) and hepatomegaly over subsequent days',
      'Pallor from progressive hemolytic anemia'
    ]),
    complications: JSON.stringify([
      'Cerebral malaria: seizures, coma, encephalopathy, and neurological deficits (mainly P. falciparum)',
      'Severe malarial anemia due to rapid, widespread red blood cell destruction',
      'Acute respiratory distress syndrome (ARDS) and pulmonary edema',
      'Acute kidney injury (blackwater fever with hemoglobinuria)',
      'Severe hypoglycemia (aggravated by parasite glucose utilization and quinine)',
      'Metabolic acidosis and hyperlactatemia leading to shock and multi-organ failure'
    ]),
    diagnosis: JSON.stringify({
      clinical_identification: 'High index of suspicion in any patient with acute febrile illness residing in or returning from a malaria-endemic area within the past 12 months.',
      laboratory_investigations: [
        {
          test: 'Microscopic Examination of Giemsa-Stained Blood Films (Thick & Thin Smears)',
          timing: 'Immediate upon presentation (ideally during fever peak)',
          significance: 'Gold standard diagnostic method. Thick smear detects low parasite densities; thin smear allows precise Plasmodium species identification and quantifies parasitemia percentage.'
        },
        {
          test: 'Malaria Rapid Diagnostic Test (RDT) for Antigen Detection',
          timing: 'Point-of-care, results in 15-20 minutes',
          significance: 'Detects parasite antigens: Histidine-Rich Protein 2 (HRP-2) specific to P. falciparum, or Plasmodium Lactate Dehydrogenase (pLDH) for pan-species differentiation.'
        },
        {
          test: 'Complete Blood Count (CBC) with Platelet Count',
          timing: 'Initial evaluation',
          significance: 'Demonstrates hemolytic normocytic anemia and thrombocytopenia. Severe thrombocytopenia (<50,000) warrants vigilant monitoring.'
        },
        {
          test: 'Blood Glucose and Serum Creatinine',
          timing: 'Initial workup for severe malaria',
          significance: 'Screening for hypoglycemia (<40 mg/dL) and acute renal impairment.'
        }
      ],
      limitations: 'A single negative blood smear does not exclude malaria; repeated blood smears every 8 to 12 hours for 24-48 hours are necessary if suspicion remains high. HRP-2 antigens may persist for 2-4 weeks after parasite clearance, yielding false-positive RDTs in recently treated individuals.',
      when_to_seek_care: 'Any fever in a malaria-endemic zone or post-travel requires immediate same-day blood testing before initiating treatment.'
    }),
    treatment_information: 'Malaria treatment must be confirmed by diagnostic testing before initiating medication. For uncomplicated P. falciparum: Artemisinin-based Combination Therapy (ACT) such as Artemether-Lumefantrine or Artesunate-Amodiaquine for 3 days. For chloroquine-sensitive P. vivax: Chloroquine for 3 days followed by Primaquine (14 days, after confirming normal G6PD levels) to eradicate dormant liver hypnozoites and prevent relapse. Severe malaria is a medical emergency requiring immediate intravenous artesunate for at least 24 hours in an intensive care setting, transition to full oral ACT, and supportive fluid management.',
    prevention: 'Vector control and personal protection: sleep under long-lasting insecticidal nets (LLINs); indoor residual spraying (IRS); use insect repellents on exposed skin; wear permethrin-treated clothing; eliminate standing water around dwellings; prescribed chemoprophylaxis (atovaquone-proguanil, doxycycline, or mefloquine) for travelers to endemic areas; RTS,S and R21/Matrix-M malaria vaccines in designated high-transmission African zones.',
    warning_signs: JSON.stringify([
      'Inability to sit, stand, walk, or severe prostration / unresponsiveness',
      'Seizures, convulsions, delirium, or abnormal posturing (Cerebral Malaria)',
      'Fast, labored, or deep breathing (respiratory distress / metabolic acidosis)',
      'Passing dark red, brown, or black urine (Blackwater Fever / Hemoglobinuria)',
      'Severe persistent vomiting preventing any oral medication or fluid retention',
      'Bleeding from gums, nose, or spontaneous petechial skin hemorrhages',
      'Extreme pallor or visible yellowing of eyes (severe anemia and jaundice)'
    ]),
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'DIS-TYPHOID',
    disease_name: 'Typhoid (Enteric Fever)',
    slug: 'typhoid',
    clinical_type: 'disease',
    description: 'Typhoid fever, also known as enteric fever, is a systemic bacterial infection caused by Salmonella enterica serovar Typhi (and less commonly Salmonella Paratyphi A, B, or C). It is characterized by sustained step-ladder fever, constitutional malaise, abdominal pain, and relative bradycardia. Without appropriate antibiotic therapy, serious gastrointestinal complications like intestinal perforation and severe hemorrhage can develop in the second to third week of illness.',
    causes: 'Infection with Salmonella enterica serovar Typhi, a flagellated, Gram-negative, facultative intracellular bacillus that penetrates intestinal mucosa and multiplies within the reticuloendothelial system.',
    transmission: 'Transmitted almost exclusively via the feco-oral route through ingestion of water or food contaminated by the feces or urine of infected patients or chronic asymptomatic carriers. Poor sanitation, untreated drinking water, and lack of hand hygiene are major drivers.',
    incubation_period: 'Typically 7 to 14 days (range: 3 to 60 days), depending heavily on the size of the ingested bacterial inoculum and host gastric acidity.',
    risk_factors: JSON.stringify([
      'Living in or traveling to areas with poor municipal sanitation and unsafe drinking water (South Asia, Southeast Asia, parts of Africa)',
      'Consumption of unboiled tap water, street beverages with ice, and uncooked street foods',
      'Household contact with a chronic Salmonella carrier',
      'Decreased gastric acidity (use of antacids, PPIs, or previous gastrectomy)',
      'Laboratory personnel working with Salmonella cultures'
    ]),
    symptoms: JSON.stringify([
      'Gradual onset of rising fever in a step-ladder pattern, reaching 39-40°C (103-104°F) by the end of week one',
      'Relative bradycardia (Faget’s sign): heart rate that is noticeably slower than expected for the degree of fever',
      'Severe, persistent frontal headache and body ache',
      'Abdominal discomfort, bloating, tenderness (especially in the right lower quadrant), and either constipation (common early in adults) or pea-soup diarrhea (children)',
      'Coated tongue with red, inflamed edges and tip',
      'Rose spots: faint, blanching, salmon-pink maculopapular rash on trunk and chest (appears in 20-30% of patients during the second week)',
      'Profound lethargy, apathy, and stuporous mental state (the "typhoid state")'
    ]),
    complications: JSON.stringify([
      'Intestinal perforation: life-threatening peritonitis occurring in the 2nd to 3rd week due to ulceration of necrotic Peyer’s patches in the terminal ileum',
      'Severe lower gastrointestinal hemorrhage',
      'Typhoid encephalopathy and delirium',
      'Myocarditis, toxic shock, and multi-organ failure',
      'Development of chronic biliary carriage (1-4% of patients remain asymptomatic shedders for years)'
    ]),
    diagnosis: JSON.stringify({
      clinical_identification: 'Suspected in any persistent high fever (>5-7 days) with headache, abdominal symptoms, coated tongue, and travel history to an endemic region.',
      laboratory_investigations: [
        {
          test: 'Blood Culture for Salmonella Typhi',
          timing: 'First week of fever (before initiating antibiotics)',
          significance: 'Gold standard definitive diagnostic test. Yield is highest (60-80%) in the first 7-10 days of fever and before antibiotic administration.'
        },
        {
          test: 'Stool Culture and Urine Culture',
          timing: 'Second and third weeks of illness',
          significance: 'Positive as bacteria are shed from biliary system into intestinal tract. Useful for detecting chronic carriers.'
        },
        {
          test: 'Widal Agglutination Test',
          timing: 'After day 7-10 of illness',
          significance: 'Measures agglutinating antibodies against O (somatic) and H (flagellar) antigens. High limitations: high false-positive rates due to cross-reacting antigens and prior infection/vaccination. A single high titer is inconclusive; a fourfold rise in paired sera is required for diagnostic support.'
        },
        {
          test: 'Complete Blood Count (CBC)',
          timing: 'Initial evaluation',
          significance: 'Typically reveals leukopenia or normal WBC count despite high fever (absence of expected leukocytosis), thrombocytopenia, and mild anemia.'
        }
      ],
      limitations: 'Widal test must never be used alone to initiate treatment without clinical evaluation. Prior antibiotic therapy reduces blood culture yield by over 50%.',
      when_to_seek_care: 'Any fever persisting beyond 3 days without clear cause, or sudden severe abdominal pain with rigid belly, requires urgent medical evaluation.'
    }),
    treatment_information: 'Definitive treatment requires appropriate antimicrobial therapy based on local susceptibility patterns. Due to widespread multidrug resistance (MDR) and fluoroquinolone resistance, empirical choices include third-generation cephalosporins (intravenous Ceftriaxone or oral Cefixime) or Azithromycin for uncomplicated cases, prescribed strictly by a physician. Carbapenems are reserved for extensively drug-resistant (XDR) strains. Supportive management includes fluid and electrolyte balance, nutritional support, and watchful monitoring for acute peritonitis. Intestinal perforation requires emergency exploratory laparotomy.',
    prevention: 'Typhoid Conjugate Vaccines (TCV, such as Typbar-TCV) provide robust, long-lasting immunity for adults and children aged 6 months and older. Additional measures: drink only boiled, filtered, or bottled water; thoroughly cook all food and consume it while hot; peel fruits yourself; practice scrupulous handwashing with soap before eating and after toilet use.',
    warning_signs: JSON.stringify([
      'Sudden severe, sharp abdominal pain with a rigid, board-like abdomen (indicates intestinal perforation)',
      'Passing frank blood or large quantities of black, tarry stool (intestinal hemorrhage)',
      'Severe confusion, delirium, hallucination, or unresponsiveness',
      'Persistent high fever unresponsive to medication combined with rapid, shallow breathing and low blood pressure',
      'Inability to tolerate any oral liquids with persistent vomiting'
    ]),
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'DIS-DENGUE',
    disease_name: 'Dengue Fever',
    slug: 'dengue',
    clinical_type: 'disease',
    description: 'Dengue is an acute viral infection caused by the Dengue virus (DENV, serotypes 1–4) transmitted by Aedes mosquitoes. It typically presents as a severe flu-like illness known as "breakbone fever". CRITICAL MEDICAL WARNING: The most dangerous phase of dengue—the Critical Phase marked by plasma leakage, severe thrombocytopenia, and hypovolemic shock—paradoxically occurs as the high fever subsides (defervescence, typically between days 3 and 7). Absence of fever does NOT mean recovery.',
    causes: 'Infection with one of four closely related dengue virus serotypes (DENV-1, DENV-2, DENV-3, DENV-4) of the Flaviviridae family. Infection with one serotype confers lifelong immunity to that serotype, but only transient cross-protection against others. Subsequent secondary infection with a different serotype markedly increases the risk of severe dengue via antibody-dependent enhancement (ADE).',
    transmission: 'Transmitted to humans through the bites of infected female Aedes aegypti (and to a lesser degree Aedes albopictus) mosquitoes. These mosquitoes bite mostly during daytime hours (peak activity early morning and late afternoon before dusk).',
    incubation_period: 'Typically 4 to 10 days (range: 3 to 14 days) following the bite of an infected mosquito.',
    risk_factors: JSON.stringify([
      'Living in or traveling to tropical and subtropical urban environments with water container breeding sites',
      'Secondary infection with a heterologous dengue serotype (major risk for severe dengue / dengue hemorrhagic fever)',
      'Infants and young children, who have higher microvascular permeability',
      'Pregnancy, which increases risks of severe hemorrhage and pre-term labor',
      'Underlying chronic conditions: diabetes, asthma, sickle cell disease, hypertension, peptic ulcer disease'
    ]),
    symptoms: JSON.stringify([
      'Sudden onset of high-grade fever (40°C / 104°F) lasting 2 to 7 days',
      'Severe headache, classically accompanied by intense retro-orbital pain (pain behind the eyes aggravated by eye movement)',
      'Severe muscle pain (myalgia) and bone/joint pain ("breakbone fever")',
      'Nausea, vomiting, and loss of appetite',
      'Flushed skin and measles-like maculopapular rash appearing during defervescence (often described as "islands of white in a sea of red")',
      'Mild hemorrhagic manifestations: epistaxis (nosebleeds), bleeding gums, or skin petechiae',
      'Marked physical prostration and extreme weakness'
    ]),
    complications: JSON.stringify([
      'Severe Dengue (Dengue Hemorrhagic Fever / Dengue Shock Syndrome - DSS): plasma leakage leading to hypovolemic shock, pleural effusion, and ascites',
      'Severe hemorrhage: massive gastrointestinal bleeding, intracranial hemorrhage, especially exacerbated if aspirin/NSAIDs were taken',
      'Severe organ impairment: acute hepatitis / fulminant hepatic failure (AST/ALT markedly elevated), acute myocarditis, and encephalitis'
    ]),
    diagnosis: JSON.stringify({
      clinical_identification: 'Acute high fever with retro-orbital pain, severe myalgia, flushed facies, and positive tourniquet test in endemic seasons. Must monitor three distinct phases: Febrile Phase, Critical Phase, and Recovery Phase.',
      laboratory_investigations: [
        {
          test: 'Dengue NS1 Antigen (ELISA or Rapid Test)',
          timing: 'Days 1 to 5 of fever (Febrile phase)',
          significance: 'Detects viral non-structural protein 1 during early viremia. High specificity; confirms early acute dengue.'
        },
        {
          test: 'Dengue IgM / IgG Antibody ELISA',
          timing: 'Day 5 and onwards',
          significance: 'IgM indicates current or recent infection. High IgG titers early in illness indicate secondary infection (higher risk for severe dengue).'
        },
        {
          test: 'Complete Blood Count (CBC) with Hematocrit and Platelet Count',
          timing: 'Daily serial monitoring throughout days 3 to 7',
          significance: 'Critical for disease tracking. Leukopenia is common early. A rising hematocrit (>20% increase from baseline) signals plasma leakage, while rapid platelet count drop (<100,000 /mm³) heralds the critical phase.'
        }
      ],
      limitations: 'NS1 test sensitivity drops significantly after day 5. Serology can cross-react with Zika, Chikungunya, and yellow fever antibodies.',
      when_to_seek_care: 'Daily clinical and platelet/hematocrit monitoring is mandatory. Immediate emergency admission is required upon the appearance of any warning signs.'
    }),
    treatment_information: 'There is NO specific antiviral medication for dengue. Management is supportive and centered entirely around meticulous fluid therapy. In uncomplicated dengue: maintenance of oral hydration with Oral Rehydration Salts (ORS), fresh juices, coconut water, and soups; fever control exclusively with Paracetamol. CRITICAL CONTRAINDICATION: Strictly AVOID Aspirin, Ibuprofen, Diclofenac, Naproxen, or any other NSAID, as they cause platelet dysfunction and trigger catastrophic gastrointestinal and mucosal bleeding. Severe dengue requires carefully titrated intravenous crystalloids (isotonic saline or Ringer’s lactate) in an intensive care setting with continuous hematocrit and vital signs monitoring.',
    prevention: 'Mosquito vector eradication and bite avoidance: eradicate stagnant water in coolers, tires, drums, and plant trays; install mesh screens on windows; apply DEET or Picaridin repellents; wear full-sleeve protective clothing; use bed nets for resting patients to prevent mosquito-to-patient transmission; Dengvaxia and Qdenga vaccines in specific approved populations according to national guidelines.',
    warning_signs: JSON.stringify([
      'CRITICAL: Warning signs typically appear during defervescence (days 3–7) as the fever drops!',
      'Severe, continuous, or worsening abdominal pain or tenderness',
      'Persistent vomiting (at least 3 episodes in 24 hours) preventing any fluid retention',
      'Clinical fluid accumulation: puffiness of face, swelling in feet, difficulty breathing from pleural effusion or ascites',
      'Mucosal bleeding: bleeding from gums, nose, vomit containing blood (coffee ground), black tarry stools, or heavy unexpected menstrual bleeding',
      'Lethargy, restlessness, extreme drowsiness, confusion, or behavioral agitation',
      'Postural hypotension, cold clammy extremities, rapid and weak pulse (heralds impending Dengue Shock Syndrome)',
      'Laboratory warning sign: sudden rise in hematocrit concurrent with rapid drop in platelet count'
    ]),
    last_reviewed_at: '2026-10-15'
  },
  {
    id: 'DIS-VIRAL-FEVER',
    disease_name: 'Viral Fever (Acute Viral Syndrome)',
    slug: 'viral-fever',
    clinical_type: 'syndrome',
    description: 'IMPORTANT CLINICAL DISTINCTION: "Viral fever" is not a single confirmed diagnosis or specific medical disease; it is a broad, non-specific descriptive clinical term used to describe an acute, self-limiting febrile syndrome caused by any of hundreds of diverse human viruses (including respiratory viruses like Influenza, Rhinovirus, Adenovirus, Enteroviruses, and Parainfluenza). In the absence of localized bacterial infection, it resolves spontaneously with supportive care. ANTIBIOTICS ARE COMPLETELY INEFFECTIVE against viral fever.',
    causes: 'Infection by diverse viruses: Respiratory viruses (Influenza A & B, RSV, Parainfluenza, Adenoviruses, Rhinoviruses), Enteroviruses (Coxsackievirus, Echovirus), Arboviruses (early stages before serological differentiation), Epstein-Barr virus, and Cytomegalovirus.',
    transmission: 'Varies by viral agent: respiratory droplet transmission through coughing and sneezing; airborne aerosol inhalation; direct hand-to-mucosa contact with contaminated surfaces (fomites); and feco-oral transmission (enteroviruses).',
    incubation_period: 'Varies widely by pathogen: typically 1 to 4 days for respiratory viruses, 2 to 7 days for common enteroviruses.',
    risk_factors: JSON.stringify([
      'Seasonal weather transitions (monsoon and winter outbreaks)',
      'Crowded indoor environments: schools, public transit, daycares, office buildings',
      'Lack of routine influenza or childhood viral vaccinations',
      'Poor hand hygiene and touching eyes/nose/mouth after contact with shared surfaces',
      'Stress, sleep deprivation, and poor nutritional status'
    ]),
    symptoms: JSON.stringify([
      'Acute onset of low to moderate-grade fever (38-39°C / 100-102°F), occasionally with chills',
      'Generalized body aches, muscle soreness (myalgia), and back stiffness',
      'Mild to moderate headache and feeling of heaviness in the head',
      'Upper respiratory symptoms: sore throat, nasal congestion, runny nose, or dry irritating cough',
      'Mild eye redness, watering, or burning sensation',
      'Loss of appetite, mild nausea, and transient gastrointestinal queasiness',
      'Generalized malaise and fatigue lasting several days'
    ]),
    complications: JSON.stringify([
      'Dehydration secondary to poor oral fluid intake, sweating, and fever',
      'Secondary bacterial infections (bacterial sinusitis, otitis media, bacterial pneumonia) if viral inflammation impairs mucosal barriers',
      'Febrile seizures in young children (aged 6 months to 5 years)',
      'Exacerbation of underlying chronic pulmonary conditions (asthma, COPD)'
    ]),
    diagnosis: JSON.stringify({
      clinical_identification: 'Physician diagnosis of exclusion: thorough physical examination confirming absence of focal bacterial infection (clear lung fields, normal otoscopy, absence of peritoneal signs, no purulent pharyngeal exudates).',
      laboratory_investigations: [
        {
          test: 'Complete Blood Count (CBC) with Differential',
          timing: 'Day 2 to 3 if fever persists',
          significance: 'Typically reveals normal or low total white blood cell count (WBC), with relative lymphocytosis. Marked leukocytosis with left shift (high neutrophils/bands) suggests bacterial infection rather than simple viral fever.'
        },
        {
          test: 'Rapid Influenza / Respiratory Viral Multiplex PCR (where available)',
          timing: 'Early acute presentation',
          significance: 'Identifies Influenza A/B, RSV, SARS-CoV-2.'
        },
        {
          test: 'Erythrocyte Sedimentation Rate (ESR) and C-Reactive Protein (CRP)',
          timing: 'Persistent fever',
          significance: 'Mildly elevated in viral syndromes; markedly elevated CRP (>50-100 mg/L) alerts to bacterial etiology or serious systemic inflammation.'
        },
        {
          test: 'Urine Routine and Microscopy',
          timing: 'Fever without clear source',
          significance: 'Rules out occult urinary tract infection, particularly in women, elderly, and infants.'
        }
      ],
      limitations: 'Because viral fever is a clinical syndrome, routine viral panels are rarely necessary for mild self-limiting cases in outpatients. However, persistent fever (>3-5 days) requires testing to exclude dengue, malaria, and typhoid.',
      when_to_seek_care: 'Fever persisting longer than 3 to 4 days, recurrence of fever after initial improvement, or onset of any red flag symptoms.'
    }),
    treatment_information: 'Treatment is entirely supportive, symptom-focused, and conservative: 1) Adequate rest to allow immune clearance; 2) Generous oral hydration (water, ORS, warm broths, herbal teas) to compensate for insensible fluid loss; 3) Paracetamol for symptom relief and fever reduction if discomfort is significant. CRITICAL MEDICAL RULE: Antibiotics have ZERO activity against viruses. Empiric use of antibiotics (like Amoxicillin, Azithromycin, or Ciprofloxacin) for viral fever does NOT accelerate recovery, disrupts gut microbiota, and causes dangerous antimicrobial resistance. Only take antibiotics if a doctor confirms a secondary bacterial infection.',
    prevention: 'Annual influenza vaccination; frequent and thorough handwashing with soap and water; covering mouth and nose with a tissue or flexed elbow when coughing or sneezing; staying home when sick to prevent transmission to coworkers and classmates; avoiding crowded poorly ventilated indoor areas during seasonal epidemics; maintaining adequate hydration and balanced nutrition.',
    warning_signs: JSON.stringify([
      'Fever persisting continuously for more than 4 to 5 days without downtrend',
      'Shortness of breath, rapid breathing, chest pain, or bluish discoloration of lips/fingernails',
      'Severe unremitting headache accompanied by stiff neck, photophobia, or confusion',
      'Persistent vomiting preventing any oral intake, leading to dark concentrated urine and dry mouth',
      'Cough producing thick rust-colored or purulent sputum, or coughing up blood',
      'Appearance of a non-blanching dark red/purple petechial or purpuric rash on the skin',
      'Excessive lethargy, difficulty waking up, or altered mental responsiveness'
    ]),
    last_reviewed_at: '2026-10-15'
  }
];

const DISEASE_GUIDELINES = [
  // --- CHIKUNGUNYA GUIDELINES ---
  {
    disease_slug: 'chikungunya',
    guideline_type: 'dos',
    content: JSON.stringify([
      'Get plenty of bed rest during the acute febrile and joint pain phase to avoid joint stress.',
      'Drink plenty of oral fluids (ORS, clean water, coconut water, fresh soups) to prevent dehydration.',
      'Take paracetamol as advised by a healthcare provider for fever and joint discomfort.',
      'Apply cold packs wrapped in a towel to inflamed joints for 15 minutes at a time to reduce acute swelling.',
      'Perform gentle range-of-motion stretching exercises once the acute severe inflammation subsides.',
      'Sleep under a mosquito bed net during daytime to prevent mosquitoes from biting you and spreading the virus to family members.',
      'Consult a rheumatologist or physician if joint pain persists for weeks or months after fever.'
    ]),
    source_id: 'SRC-NCDC-INDIA'
  },
  {
    disease_slug: 'chikungunya',
    guideline_type: 'donts',
    content: JSON.stringify([
      'Do NOT take Aspirin, Ibuprofen, Diclofenac, or any other NSAID without medical evaluation, especially early on when dengue cannot be ruled out (dengue co-infection carries severe bleeding risks).',
      'Do NOT take antibiotics. Chikungunya is caused by a virus, and antibiotics have no effect.',
      'Do NOT engage in heavy strenuous physical exercise or weight lifting while joints are acutely inflamed.',
      'Do NOT ignore severe warning signs like confusion, extreme drowsiness, or continuous vomiting.',
      'Do NOT rely on unproven roadside herbal remedies or magic cures claiming to eliminate joint pain instantly.'
    ]),
    source_id: 'SRC-NCDC-INDIA'
  },
  {
    disease_slug: 'chikungunya',
    guideline_type: 'food_hydration',
    content: JSON.stringify({
      hydration_target: 'At least 2.5 to 3 liters of fluids daily for adults unless medically restricted for heart or kidney reasons.',
      recommended_fluids: [
        'Oral Rehydration Salts (ORS) solution',
        'Tender coconut water (rich in potassium and electrolytes)',
        'Clear warm vegetable and chicken broths',
        'Diluted freshly squeezed fruit juices (orange, pomegranate, lemon)',
        'Boiled and cooled drinking water'
      ],
      dietary_guidelines: [
        'Consume small, frequent, easily digestible meals (kichdi, dalia, soft rice, steamed vegetables).',
        'Include anti-inflammatory foods rich in omega-3 and antioxidants: turmeric milk, ginger tea, citrus fruits, leafy greens.',
        'Ensure adequate protein intake (lentils, paneer, eggs, steamed fish) to support muscle and joint recovery.'
      ],
      foods_to_avoid: [
        'Heavy, greasy, deeply fried foods that strain digestion during fever',
        'Excessively sugary carbonated sodas',
        'Alcohol and caffeinated energy drinks which worsen dehydration'
      ]
    }),
    source_id: 'SRC-MOHFW-INDIA'
  },
  {
    disease_slug: 'chikungunya',
    guideline_type: 'warning_signs',
    content: JSON.stringify([
      'Altered mental state, disorientation, extreme sleepiness, or loss of consciousness',
      'Persistent vomiting preventing any oral hydration',
      'Sudden severe dizziness, fainting upon standing, or cold clammy extremities',
      'Bleeding from gums, nose, skin spots, or dark stools',
      'Inability to pass urine for over 8-12 hours'
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },
  {
    disease_slug: 'chikungunya',
    guideline_type: 'prevention',
    content: JSON.stringify([
      'Prevent mosquito bites using EPA-registered insect repellent containing DEET, Picaridin, or Oil of Lemon Eucalyptus.',
      'Wear loose-fitting, light-colored long-sleeved shirts and long pants.',
      'Install fine wire mesh screens on all windows and doors to keep mosquitoes outside.',
      'Empty, clean, or cover water storage containers, flower pot saucers, birdbaths, and discarded tires every week (Aedes mosquitoes breed in clean standing water).'
    ]),
    source_id: 'SRC-NVBDCP-INDIA'
  },
  {
    disease_slug: 'chikungunya',
    guideline_type: 'faqs',
    content: JSON.stringify([
      {
        question: 'Can Chikungunya kill a person?',
        answer: 'Chikungunya is very rarely fatal. Most deaths occur in frail elderly patients with multiple severe pre-existing comorbidities (like heart disease or renal failure) or in newborns infected around delivery. The primary burden is severe, persistent joint pain and prolonged disability.'
      },
      {
        question: 'Why do my joints still hurt months after the fever went away?',
        answer: 'Up to 30% to 40% of patients experience chronic post-chikungunya polyarthralgia or reactive arthritis that can persist for months or even years. This is caused by persistent viral fragments, synovial inflammation, and autoimmune responses. If pain continues beyond 4 weeks, consult a physician or rheumatologist for structured anti-inflammatory therapy and supervised physiotherapy.'
      },
      {
        question: 'Is Chikungunya contagious directly from one person to another?',
        answer: 'No. Chikungunya cannot spread directly from person to person through coughing, sneezing, touching, hugging, or sharing food. It requires an infected Aedes mosquito to bite a person carrying the virus and then bite another person.'
      },
      {
        question: 'Can I get Chikungunya twice in my lifetime?',
        answer: 'It is widely believed that infection with Chikungunya virus provides lifelong protective immunity against future infection. Documented second infections are exceptionally rare.'
      },
      {
        question: 'How is Chikungunya different from Dengue?',
        answer: 'Both are transmitted by Aedes mosquitoes and share symptoms like fever, headache, and rash. However, Chikungunya is characterized by severe, prominent joint pain (arthralgia) with swelling that often outlasts the fever. Dengue is characterized by severe muscle pain (myalgia), retro-orbital eye pain, and carries a significant risk of plasma leakage, severe platelet drops, and hemorrhage during defervescence.'
      },
      {
        question: 'Can I take painkillers like Ibuprofen for Chikungunya joint pain?',
        answer: 'During the initial acute phase (first 7 days), avoid ibuprofen, aspirin, and other NSAIDs until a doctor confirms that dengue is not present, because NSAIDs can cause life-threatening bleeding if the illness turns out to be dengue. Once dengue is firmly excluded by lab tests, a doctor may prescribe NSAIDs for chronic joint pain.'
      }
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },

  // --- JAUNDICE GUIDELINES ---
  {
    disease_slug: 'jaundice',
    guideline_type: 'dos',
    content: JSON.stringify([
      'Seek professional medical evaluation immediately to determine the exact cause of hyperbilirubinemia.',
      'Drink plenty of boiled and cooled water or freshly prepared ORS to maintain hydration.',
      'Eat small, frequent, light, carbohydrate-rich meals that are easy on the liver.',
      'Take adequate physical rest, as liver regeneration requires resting metabolic conditions.',
      'Inform your doctor of every medicine, vitamin, herbal supplement, or traditional remedy you have been taking.',
      'Monitor urine and stool color daily and report changes (such as pale clay-colored stool) to your doctor.'
    ]),
    source_id: 'SRC-MOHFW-INDIA'
  },
  {
    disease_slug: 'jaundice',
    guideline_type: 'donts',
    content: JSON.stringify([
      'Do NOT consume ANY alcohol. Alcohol directly damages liver cells and can convert acute hepatitis into fatal liver failure.',
      'Do NOT take over-the-counter paracetamol, painkillers, or sleeping pills without doctor approval (many drugs are processed by the liver).',
      'Do NOT follow harmful starvation diets or unscientific boiled-vegetable-only restrictions that lead to severe malnutrition.',
      'Do NOT undergo unscientific roadside cures, skin branding, tattooing, or uncertified herbal potions.',
      'Do NOT eat raw, unwashed street salads, cut fruits, or drink tap water from unreliable sources.'
    ]),
    source_id: 'SRC-NCDC-INDIA'
  },
  {
    disease_slug: 'jaundice',
    guideline_type: 'food_hydration',
    content: JSON.stringify({
      hydration_target: '2.5 to 3 liters of safe drinking water and electrolyte fluids daily.',
      recommended_fluids: [
        'Boiled and filtered clean drinking water',
        'Fresh tender coconut water',
        'Thin rice water (kanji), barley water, or clear vegetable broth',
        'Diluted fresh fruit juices prepared with hygienic clean water'
      ],
      dietary_guidelines: [
        'Eat light, carbohydrate-rich foods that provide clean energy without overworking the liver (porridge, khichdi, idli, mashed boiled potatoes, soft rice).',
        'Consume ripe bananas, apples, papaya, and boiled vegetables.',
        'Gradually reintroduce lean proteins (steamed dal, curd, egg whites) as appetite returns. Severe protein restriction is outdated unless hepatic encephalopathy is diagnosed by a doctor.'
      ],
      foods_to_avoid: [
        'Deep-fried, fatty, spicy, and buttery foods which trigger nausea and impaired bile digestion',
        'Street food, raw shellfish, unpasteurized milk, and raw salads from dubious sources',
        'Alcohol in all forms (beer, wine, spirits)'
      ]
    }),
    source_id: 'SRC-MOHFW-INDIA'
  },
  {
    disease_slug: 'jaundice',
    guideline_type: 'warning_signs',
    content: JSON.stringify([
      'Confusion, drowsiness, unusual irritability, slurred speech, or altered sleep-wake cycle (indicates Hepatic Encephalopathy)',
      'Severe, unremitting right upper abdominal pain accompanied by high fever and shaking chills',
      'Vomiting blood (hematemesis) or passing black, tar-like stools',
      'Severe swelling in the abdomen (ascites) or swelling in both legs (edema)',
      'Spontaneous bleeding from gums, nose, or small red/purple spots under the skin'
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },
  {
    disease_slug: 'jaundice',
    guideline_type: 'prevention',
    content: JSON.stringify([
      'Get vaccinated against Hepatitis A and Hepatitis B.',
      'Drink only safe, boiled, or properly filtered water; avoid unhygienic ice in beverages.',
      'Wash hands thoroughly with soap before preparing or eating food and after using the restroom.',
      'Ensure single-use, sterile disposable syringes and needles are used for any medical or cosmetic procedure (including tattooing/piercing).',
      'Practice safe sex using barrier protection to prevent transmission of Hepatitis B and C.'
    ]),
    source_id: 'SRC-NCDC-INDIA'
  },
  {
    disease_slug: 'jaundice',
    guideline_type: 'faqs',
    content: JSON.stringify([
      {
        question: 'Is jaundice a disease in itself?',
        answer: 'No. Jaundice is a visible sign (symptom) caused by elevated levels of bilirubin in the bloodstream. It indicates that an underlying condition is affecting the liver, gallbladder, bile ducts, or red blood cells. A doctor must investigate the cause to provide proper treatment.'
      },
      {
        question: 'Should I stop eating fats and turmeric completely if I have jaundice?',
        answer: 'While reducing very oily and greasy foods is helpful because bile flow may be temporarily impaired, starving oneself or eating an extreme diet of only boiled radish or sugar cane is medically harmful and delays liver recovery. The liver requires balanced calories, carbohydrates, and moderate proteins to repair damaged cells. Turmeric in normal culinary amounts does not cause or cure jaundice.'
      },
      {
        question: 'Can drinking sugarcane juice from roadside stalls cure jaundice?',
        answer: 'No. Sugarcane juice has no proven medicinal curative action against hepatitis viruses or gallstones. In fact, drinking unhygienic roadside sugarcane juice prepared with dirty ice or contaminated water frequently spreads Hepatitis A and E, making the condition worse. If consumed, it must be freshly and hygienically prepared at home with pure water.'
      },
      {
        question: 'How long does it take for the yellow color to disappear?',
        answer: 'In acute viral hepatitis (such as Hepatitis A or E), the yellow tint in the eyes and skin usually peaks in 1 to 2 weeks and gradually fades over 4 to 6 weeks as liver enzymes normalize. Bilirubin binds to elastin in the skin and sclera, so yellowing often resolves more slowly than blood test levels.'
      },
      {
        question: 'What does pale or clay-colored stool mean in jaundice?',
        answer: 'Normal stool color comes from stercobilin, a breakdown product of bile. Pale or chalky clay-colored stool means that bile is blocked from entering the intestine, typically due to gallstones, bile duct strictures, or tumors. This is a medical emergency that requires prompt imaging (ultrasound/CT) and intervention.'
      },
      {
        question: 'Is jaundice contagious?',
        answer: 'Jaundice itself is not contagious. However, if the jaundice is caused by an infectious virus like Hepatitis A or Hepatitis E, the virus can spread to others through contaminated food or water. Hepatitis B and C spread through blood and bodily fluids.'
      }
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },

  // --- MALARIA GUIDELINES ---
  {
    disease_slug: 'malaria',
    guideline_type: 'dos',
    content: JSON.stringify([
      'Get a blood test (smear microscopy or rapid antigen test) immediately if you develop sudden fever with chills in a malaria area.',
      'Complete the entire prescribed course of antimalarial medications, even if fever disappears in 24 hours.',
      'Take Artemisinin Combination Therapy (ACT) with a glass of milk or a meal with some fat to maximize medicine absorption.',
      'Sleep under an insecticide-treated bed net (LLIN) every night.',
      'Drink plenty of oral rehydration fluids and water to prevent dehydration during sweating cycles.',
      'Report back to your doctor if fever recurs after finishing the medication.'
    ]),
    source_id: 'SRC-NVBDCP-INDIA'
  },
  {
    disease_slug: 'malaria',
    guideline_type: 'donts',
    content: JSON.stringify([
      'Do NOT start antimalarial medicines without confirming the diagnosis with a blood smear or rapid test.',
      'Do NOT stop taking your medication early when you start feeling better (incomplete therapy causes drug-resistant strains and relapses).',
      'Do NOT take expired, damaged, or unverified antimalarials purchased from unregulated vendors.',
      'Do NOT ignore severe symptoms like breathlessness, extreme sleepiness, or dark urine.',
      'Do NOT skip chemoprophylaxis if traveling into high-risk malaria zones.'
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },
  {
    disease_slug: 'malaria',
    guideline_type: 'food_hydration',
    content: JSON.stringify({
      hydration_target: '3 liters of fluids daily to replace heavy sweat losses and support kidney function.',
      recommended_fluids: [
        'Oral Rehydration Solution (ORS)',
        'Boiled and filtered water',
        'Tender coconut water and diluted fresh citrus juices',
        'Clear warm soups with a pinch of salt'
      ],
      dietary_guidelines: [
        'High-carbohydrate, easily digestible meals: rice gruel, porridge, toast, boiled vegetables.',
        'High-calorie snacks to prevent hypoglycemia (malaria parasites consume host glucose rapidly).',
        'Iron-rich and protein-rich foods (spinach, lentils, eggs) during recovery to rebuild red blood cells lost to hemolysis.'
      ],
      foods_to_avoid: [
        'Very heavy, oily, or fried meals that trigger nausea during high fever',
        'Excessive caffeine and carbonated sodas',
        'Alcohol'
      ]
    }),
    source_id: 'SRC-NVBDCP-INDIA'
  },
  {
    disease_slug: 'malaria',
    guideline_type: 'warning_signs',
    content: JSON.stringify([
      'Inability to sit, stand, walk, or extreme weakness/unresponsiveness',
      'Seizures, delirium, confusion, or difficulty waking up (Cerebral Malaria)',
      'Fast, deep, or labored breathing (indicates metabolic acidosis or pulmonary edema)',
      'Dark red, brown, or black urine (Blackwater Fever)',
      'Severe, persistent vomiting that prevents keeping down oral medicines'
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },
  {
    disease_slug: 'malaria',
    guideline_type: 'prevention',
    content: JSON.stringify([
      'Sleep under Long-Lasting Insecticidal Nets (LLINs) tucked under the mattress.',
      'Apply DEET or Picaridin mosquito repellents to exposed skin between dusk and dawn (when Anopheles mosquitoes bite).',
      'Spray indoor surfaces with approved residual insecticides.',
      'Eliminate stagnant water pools around gardens, drains, and coolers where Anopheles mosquitoes lay eggs.',
      'Take prescribed preventive medicines (chemoprophylaxis) when traveling into malaria-endemic regions.'
    ]),
    source_id: 'SRC-NVBDCP-INDIA'
  },
  {
    disease_slug: 'malaria',
    guideline_type: 'faqs',
    content: JSON.stringify([
      {
        question: 'What causes the classic shivering chills in malaria?',
        answer: 'The chills and fever spikes correspond to the synchronous bursting of thousands of red blood cells by mature Plasmodium merozoites. This releases parasite toxins and cellular debris into the bloodstream, triggering a massive surge of inflammatory pyrogens (like TNF-alpha) in the hypothalamus.'
      },
      {
        question: 'Why does P. vivax malaria keep coming back months later?',
        answer: 'Plasmodium vivax and Plasmodium ovale have a dormant liver stage called hypnozoites. Even after blood parasites are cleared, these dormant parasites can wake up weeks or months later to cause a relapse. To prevent this, doctors prescribe a 14-day course of Primaquine after ruling out G6PD deficiency.'
      },
      {
        question: 'Can malaria be diagnosed from a routine blood test?',
        answer: 'A routine CBC can show signs like low platelets and anemia, but confirmation requires a dedicated Giemsa-stained blood smear (thick and thin films) or a Malaria Rapid Diagnostic Test (RDT) that detects specific Plasmodium proteins.'
      },
      {
        question: 'Is malaria contagious from one person to another?',
        answer: 'No. Malaria is not spread directly from person to person through touch, saliva, kissing, or sharing items. It requires transmission via the bite of an infected female Anopheles mosquito.'
      },
      {
        question: 'What is cerebral malaria?',
        answer: 'Cerebral malaria is the most dangerous complication of Plasmodium falciparum. Infected red blood cells adhere to the lining of tiny capillaries in the brain, causing blockages, swelling, seizures, and coma. It is a critical medical emergency with a high mortality rate without immediate intravenous artesunate.'
      },
      {
        question: 'Can pregnant women take malaria medications?',
        answer: 'Yes, but the choice of medication depends on the trimester and the type of malaria. Pregnant women are at heightened risk of severe disease, anemia, and pregnancy loss, so they must be treated promptly by a qualified doctor following national clinical guidelines.'
      }
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },

  // --- TYPHOID GUIDELINES ---
  {
    disease_slug: 'typhoid',
    guideline_type: 'dos',
    content: JSON.stringify([
      'Consult a doctor promptly if you have continuous high fever lasting more than 3 to 4 days with headache and stomach pain.',
      'Take the complete course of prescribed antibiotics exactly on time, even if fever resolves completely within 48 to 72 hours.',
      'Drink only safe, boiled, or purified water; ensure hot, freshly cooked food is consumed.',
      'Maintain strict hand hygiene by washing hands with soap and water after using the toilet and before eating.',
      'Get plenty of rest to support intestinal healing of inflamed Peyer’s patches.',
      'Report any sudden, severe belly pain or blood in your stool to emergency medical services immediately.'
    ]),
    source_id: 'SRC-MOHFW-INDIA'
  },
  {
    disease_slug: 'typhoid',
    guideline_type: 'donts',
    content: JSON.stringify([
      'Do NOT stop taking your antibiotic medicine early. Incomplete treatment leads to relapse in up to 10-20% of patients and fosters dangerous drug-resistant bacteria.',
      'Do NOT consume tap water, drinks with ice cubes of unknown origin, or unpasteurized dairy.',
      'Do NOT eat raw, unpeeled fruits, roadside salads, or food handled by street vendors without proper hygiene.',
      'Do NOT take over-the-counter antibiotics without a doctor’s prescription and blood culture.',
      'Do NOT prepare food for other people while you are ill or until your doctor confirms bacteria are cleared from your stool.'
    ]),
    source_id: 'SRC-NCDC-INDIA'
  },
  {
    disease_slug: 'typhoid',
    guideline_type: 'food_hydration',
    content: JSON.stringify({
      hydration_target: 'At least 3 liters of safe fluids daily to replace fluid lost from fever, sweating, and diarrhea.',
      recommended_fluids: [
        'Oral Rehydration Salts (ORS) solution',
        'Boiled drinking water (boiled for at least 1-2 minutes)',
        'Thin rice water (kanji), barley water, or clear strained vegetable soup',
        'Tender coconut water'
      ],
      dietary_guidelines: [
        'Eat a soft, low-fiber, bland diet during the acute and recovery phases to avoid irritating the inflamed intestinal lining (soft khichdi, porridge, mashed boiled potatoes, bananas, curd/yogurt).',
        'Consume small, frequent meals rather than large, heavy meals.',
        'Include easily digestible protein sources like boiled lentils, soft paneer, or poached egg as appetite recovers.'
      ],
      foods_to_avoid: [
        'High-fiber, rough, or raw vegetables that can mechanically irritate ulcerated intestines',
        'Spicy, heavily seasoned, greasy, and fried foods',
        'Gas-producing foods like cabbage, cauliflower, and heavy beans during the acute phase'
      ]
    }),
    source_id: 'SRC-MOHFW-INDIA'
  },
  {
    disease_slug: 'typhoid',
    guideline_type: 'warning_signs',
    content: JSON.stringify([
      'Sudden, severe, stabbing abdominal pain with a rigid or board-like stomach (signals life-threatening intestinal perforation)',
      'Passing bright red blood, blood clots, or dark black tar-like stools',
      'Severe confusion, delirium, hallucination, or extreme stupor ("typhoid state")',
      'Persistent vomiting preventing any oral hydration or medicine intake',
      'Rapid, weak pulse accompanied by sudden drop in blood pressure and cold clammy skin'
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },
  {
    disease_slug: 'typhoid',
    guideline_type: 'prevention',
    content: JSON.stringify([
      'Get vaccinated with Typhoid Conjugate Vaccine (TCV), which provides long-lasting protection for adults and children aged 6 months and older.',
      'Drink only safe, boiled, or certified bottled water; avoid tap water and ice from questionable sources.',
      'Follow the rule: "Boil it, cook it, peel it, or forget it."',
      'Wash hands thoroughly with soap for at least 20 seconds after using the bathroom and before handling food.',
      'Avoid raw vegetables and unpasteurized milk products in areas with high typhoid transmission.'
    ]),
    source_id: 'SRC-NCDC-INDIA'
  },
  {
    disease_slug: 'typhoid',
    guideline_type: 'faqs',
    content: JSON.stringify([
      {
        question: 'Why is the Widal test often unreliable?',
        answer: 'The Widal test measures antibodies that cross-react with many common bacteria. It often yields false-positive results due to prior infections, non-typhoidal salmonellae, or vaccination. A single high titer is not conclusive; a confirmed diagnosis requires a blood culture or a four-fold increase in antibody titer on paired blood samples.'
      },
      {
        question: 'Why is it dangerous to stop antibiotics early in typhoid?',
        answer: 'Salmonella Typhi bacteria hide inside macrophages in the liver, spleen, and bone marrow. If antibiotics are stopped as soon as fever drops, surviving intracellular bacteria will multiply again, causing a relapse within 1 to 3 weeks and increasing the risk of becoming a chronic asymptomatic carrier.'
      },
      {
        question: 'What is a chronic typhoid carrier?',
        answer: 'About 1% to 4% of people who recover from typhoid fever continue to carry the bacteria in their gallbladder or urinary tract for months or years without having symptoms. They shed bacteria in their stool and urine, unknowingly transmitting the disease to others if they handle food without proper hygiene (such as the famous historical case of Typhoid Mary).'
      },
      {
        question: 'Why do doctors advise against high-fiber food in typhoid?',
        answer: 'Salmonella Typhi invades and causes severe inflammation and ulceration of the Peyer’s patches (lymph tissue) in the lower small intestine (terminal ileum). In the 2nd and 3rd weeks of illness, these ulcers can perforate. Eating rough, hard, or high-fiber foods can irritate or tear these fragile ulcers, increasing perforation risk.'
      },
      {
        question: 'Can typhoid fever spread through coughing or sneezing?',
        answer: 'No. Typhoid is an enteric infection spread through the feco-oral route—meaning through water or food contaminated with feces or urine from an infected person or carrier. It is not transmitted through respiratory airborne droplets.'
      },
      {
        question: 'Is there an effective vaccine for typhoid?',
        answer: 'Yes. Modern Typhoid Conjugate Vaccines (TCVs, such as Typbar-TCV) are highly effective (over 80-85% efficacy), safe, and provide long-lasting immunity with a single injection for individuals from 6 months of age up to 45-65 years.'
      }
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },

  // --- DENGUE GUIDELINES ---
  {
    disease_slug: 'dengue',
    guideline_type: 'dos',
    content: JSON.stringify([
      'CRITICAL: Stay on high alert when the high fever starts dropping (days 3 to 7)—this is when severe dengue complications usually occur!',
      'Drink plenty of oral fluids (ORS, coconut water, fruit juices, clear soups) to counteract plasma leakage into tissues.',
      'Take ONLY paracetamol for fever and pain, strictly adhering to the recommended dosage.',
      'Get daily complete blood counts (CBC) to monitor platelet levels and hematocrit percentages as advised by your doctor.',
      'Rest completely in bed; avoid physical exertion.',
      'Sleep under a mosquito bed net during daytime to avoid passing the virus to mosquitoes that could bite family members.',
      'Seek emergency hospitalization immediately if any warning sign appears.'
    ]),
    source_id: 'SRC-NVBDCP-INDIA'
  },
  {
    disease_slug: 'dengue',
    guideline_type: 'donts',
    content: JSON.stringify([
      'CRITICAL WARNING: NEVER take Aspirin, Ibuprofen, Diclofenac, Naproxen, or any other NSAID! They cause platelet dysfunction and provoke catastrophic stomach and internal bleeding.',
      'Do NOT take antibiotics. Dengue is caused by a virus; antibiotics have zero effect and cause gastrointestinal upset.',
      'Do NOT assume that the drop in fever means you are fully cured. The critical plasma-leakage phase begins when fever subsides!',
      'Do NOT receive intramuscular injections, which can cause large hematomas due to low platelets.',
      'Do NOT demand unnecessary platelet transfusions if platelet count is above 10,000-20,000 unless there is active clinical bleeding or emergency doctor advice.'
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },
  {
    disease_slug: 'dengue',
    guideline_type: 'food_hydration',
    content: JSON.stringify({
      hydration_target: '3 to 4 liters of oral fluids daily for adults (or per doctor calculation in children) to replace intravascular fluid lost from capillary leakage.',
      recommended_fluids: [
        'Oral Rehydration Salts (ORS) solution (provides balanced sodium and electrolytes)',
        'Fresh tender coconut water (rich in natural electrolytes)',
        'Freshly prepared pomegranate, kiwi, apple, or orange juice',
        'Clear warm vegetable and chicken broths',
        'Boiled and cooled water'
      ],
      dietary_guidelines: [
        'Soft, bland, easily digestible foods (khichdi, curd rice, mashed boiled vegetables, dal soup).',
        'Foods rich in Vitamin C, iron, and folate to support bone marrow platelet regeneration during recovery.',
        'Small, frequent sips of fluid rather than drinking large volumes all at once, which can trigger nausea.'
      ],
      foods_to_avoid: [
        'Red, brown, or black colored foods and drinks (like dark chocolate, grape juice, beet juice) which can be mistaken for gastrointestinal bleeding in vomit or stool',
        'Deep-fried, greasy, or spicy foods that irritate the stomach',
        'Alcohol and caffeinated energy drinks'
      ]
    }),
    source_id: 'SRC-NVBDCP-INDIA'
  },
  {
    disease_slug: 'dengue',
    guideline_type: 'warning_signs',
    content: JSON.stringify([
      'CRITICAL WARNING: Watch closely as the fever breaks (days 3–7)!',
      'Severe, persistent abdominal pain or tenderness',
      'Persistent vomiting (at least 3 episodes in 24 hours) preventing any fluid retention',
      'Bleeding from gums, nose, vomit with blood, or black tarry stools',
      'Difficulty breathing, fast breathing, or chest heaviness (from fluid in lungs / pleural effusion)',
      'Extreme drowsiness, restlessness, irritability, or confusion',
      'Cold, clammy, pale skin and dizziness upon standing (signals impending shock)'
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },
  {
    disease_slug: 'dengue',
    guideline_type: 'prevention',
    content: JSON.stringify([
      'Empty and scrub water storage barrels, pet dishes, flower pot saucers, and air cooler trays every week (Aedes mosquitoes lay eggs in clean artificial containers).',
      'Install fine wire mesh screens on windows and doors.',
      'Apply DEET or Picaridin mosquito repellents on exposed skin, especially in early morning and late afternoon.',
      'Wear loose-fitting, light-colored long-sleeve shirts, long pants, and socks.',
      'Keep dengue patients under bed nets to prevent mosquitoes from biting them and spreading the virus to others.'
    ]),
    source_id: 'SRC-NVBDCP-INDIA'
  },
  {
    disease_slug: 'dengue',
    guideline_type: 'faqs',
    content: JSON.stringify([
      {
        question: 'Why is the critical phase of dengue after the fever drops?',
        answer: 'In dengue, the virus causes temporary capillary permeability (leakage of fluid from blood vessels into body cavities). This hyper-permeability peaks right around defervescence (days 3 to 7), causing blood volume to drop, blood concentration (rising hematocrit), and rapid platelet consumption. Patients must be monitored most closely during this critical window.'
      },
      {
        question: 'Does every dengue patient with low platelets need a platelet transfusion?',
        answer: 'No. Clinical guidelines from WHO and MoHFW emphasize that prophylactic platelet transfusion is NOT recommended simply for a low number (even down to 10,000 to 20,000 /mm³) unless there is active mucosal bleeding or emergency surgery. Platelets naturally recover once the critical phase passes (usually by day 7-8). Unnecessary transfusions carry risks of fluid overload and allergic reactions.'
      },
      {
        question: 'Why are Ibuprofen and Aspirin strictly forbidden in dengue?',
        answer: 'Ibuprofen and Aspirin are non-steroidal anti-inflammatory drugs (NSAIDs) that inhibit platelet aggregation and irritate the stomach lining. In dengue, where platelets are already low and blood vessels are fragile, NSAIDs dramatically multiply the risk of massive, fatal gastrointestinal bleeding.'
      },
      {
        question: 'Can papaya leaf extract cure dengue?',
        answer: 'While small clinical studies suggest papaya leaf extract may mildly support platelet stabilization, it does NOT kill the dengue virus or treat plasma leakage. It must NEVER replace medical supervision, adequate fluid hydration, and daily blood count monitoring. Relying solely on home remedies without medical care can be fatal.'
      },
      {
        question: 'Why is a second infection with dengue more dangerous than the first?',
        answer: 'There are four distinct dengue virus serotypes (DENV 1 to 4). When you are infected with a second, different serotype, pre-existing antibodies from the first infection bind to the new virus but fail to neutralize it. Instead, they facilitate viral entry into immune cells—a process called Antibody-Dependent Enhancement (ADE)—triggering massive cytokine release, severe plasma leakage, and shock.'
      },
      {
        question: 'How much water should I drink during dengue?',
        answer: 'An adult should generally consume around 2.5 to 3.5 liters of fluids daily, including Oral Rehydration Salts (ORS), coconut water, and soups, unless restricted by a doctor for heart or kidney issues. Adequate fluid replacement keeps blood vessels filled and prevents dengue shock.'
      }
    ]),
    source_id: 'SRC-WHO-GLOBAL'
  },

  // --- VIRAL FEVER GUIDELINES ---
  {
    disease_slug: 'viral-fever',
    guideline_type: 'dos',
    content: JSON.stringify([
      'Get plenty of rest to conserve physical energy and allow your immune system to clear the virus.',
      'Drink plenty of fluids (warm water, broths, herbal teas, fruit juices, ORS) to prevent dehydration caused by sweating and fever.',
      'Take paracetamol as needed to alleviate body aches and high fever discomfort.',
      'Use warm saltwater gargles and steam inhalation to relieve sore throat and nasal congestion.',
      'Keep track of your temperature and monitor for any emerging red flags like breathing difficulty or extreme drowsiness.',
      'Cover your mouth and nose with a tissue or your flexed elbow when coughing or sneezing to protect others.'
    ]),
    source_id: 'SRC-MOHFW-INDIA'
  },
  {
    disease_slug: 'viral-fever',
    guideline_type: 'donts',
    content: JSON.stringify([
      'CRITICAL MEDICAL RULE: Do NOT take antibiotics for a viral fever. Antibiotics kill bacteria; they have ZERO effect on viruses, do NOT shorten viral fever, and cause antibiotic resistance and gut distress.',
      'Do NOT force yourself to carry out strenuous workouts, heavy lifting, or exhausting work while febrile.',
      'Do NOT take over-the-counter multi-drug cocktail syrups that contain combinations of paracetamol, decongestants, and antihistamines without checking total paracetamol dose.',
      'Do NOT send sick children to school or daycare, or go to crowded offices while symptomatic, to prevent spreading the infection.',
      'Do NOT ignore a fever that persists for more than 4 to 5 days without medical evaluation.'
    ]),
    source_id: 'SRC-CDC-GLOBAL'
  },
  {
    disease_slug: 'viral-fever',
    guideline_type: 'food_hydration',
    content: JSON.stringify({
      hydration_target: '2.5 to 3 liters of warm fluids daily for adults.',
      recommended_fluids: [
        'Warm water with lemon and honey',
        'Warm herbal teas (ginger, tulsi/holy basil)',
        'Clear vegetable or chicken soup with garlic and black pepper',
        'Oral Rehydration Salts (ORS) solution',
        'Diluted fresh fruit juices'
      ],
      dietary_guidelines: [
        'Eat light, warm, comforting foods (khichdi, vegetable dalia, clear soups, oatmeal, steamed rice with curd).',
        'Include fruits rich in Vitamin C (oranges, amla, guava) and zinc to support immune defense.',
        'Eat small, frequent meals if appetite is depressed.'
      ],
      foods_to_avoid: [
        'Very oily, deep-fried, and heavily spiced foods that can provoke gastrointestinal distress',
        'Chilled drinks and ice creams if suffering from acute pharyngitis or sore throat',
        'Alcohol and excessive caffeine which contribute to dehydration'
      ]
    }),
    source_id: 'SRC-MOHFW-INDIA'
  },
  {
    disease_slug: 'viral-fever',
    guideline_type: 'warning_signs',
    content: JSON.stringify([
      'Shortness of breath, rapid breathing, or chest pain upon taking a deep breath',
      'Fever lasting continuously for more than 4 to 5 days without any downward trend',
      'Severe, unremitting headache accompanied by a stiff neck, light sensitivity, or confusion',
      'Persistent vomiting preventing any fluid retention',
      'Appearance of a new dark purple or red petechial rash that does not fade when pressed'
    ]),
    source_id: 'SRC-CDC-GLOBAL'
  },
  {
    disease_slug: 'viral-fever',
    guideline_type: 'prevention',
    content: JSON.stringify([
      'Receive an annual influenza vaccine, especially if you are over 65, pregnant, or have chronic respiratory/cardiac conditions.',
      'Wash your hands frequently with soap and water for at least 20 seconds, especially after public transit or coughing.',
      'Avoid touching your eyes, nose, and mouth with unwashed hands.',
      'Maintain good indoor ventilation at home and work.',
      'Stay home and rest when you feel feverish to break transmission chains.'
    ]),
    source_id: 'SRC-CDC-GLOBAL'
  },
  {
    disease_slug: 'viral-fever',
    guideline_type: 'faqs',
    content: JSON.stringify([
      {
        question: 'Why shouldn’t I take an antibiotic just in case it’s bacterial?',
        answer: 'Over 90% of acute uncomplicated fevers with upper respiratory symptoms are caused by viruses. Taking antibiotics "just in case" does not kill viruses, does not cure the fever faster, kills beneficial gut microbiome bacteria, can cause allergic reactions, and directly fuels dangerous drug-resistant superbugs. Antibiotics should only be taken when a doctor confirms a bacterial infection.'
      },
      {
        question: 'How long does a typical viral fever last?',
        answer: 'Most uncomplicated viral fevers last between 3 and 5 days. General fatigue, mild dry cough, or mild muscle aches may linger for an additional week as your immune system winds down. If high fever persists beyond day 4 or 5, consult a doctor to test for specific conditions like dengue, typhoid, or malaria.'
      },
      {
        question: 'Does a higher temperature mean a more dangerous illness?',
        answer: 'Not necessarily. Fever is a natural, healthy immune defense mechanism created by the body to make the internal environment inhospitable for viral replication. A child or young adult can easily reach 39.5°C (103°F) with a common harmless viral infection, whereas an elderly patient might have a severe infection with barely any fever. What matters more than the exact number is how you feel, your hydration status, and the absence of warning signs.'
      },
      {
        question: 'Can I take cold showers to bring down high fever fast?',
        answer: 'No. Cold showers or ice baths cause shivering, which actually increases core body temperature and causes vasoconstriction. Instead, take lukewarm sponge baths or a comfortable lukewarm shower, wear light breathable clothing, and stay in a well-ventilated room.'
      },
      {
        question: 'Is viral fever contagious to family members?',
        answer: 'Yes. Most viral infections spread easily via microscopic droplets expelled when an infected person coughs, sneezes, or talks, as well as by touching contaminated surfaces like door handles and phones. To protect your family, use a separate room, wash hands often, cover your mouth when coughing, and avoid sharing drinking glasses or towels.'
      },
      {
        question: 'When should a doctor be consulted for a viral fever?',
        answer: 'Consult a doctor if the fever exceeds 39.5°C (103°F) and does not respond to paracetamol, if the fever lasts longer than 3-4 days, if you develop breathing difficulties, persistent vomiting, chest pain, a stiff neck, or a rash, or if the patient is an infant under 3 months of age.'
      }
    ]),
    source_id: 'SRC-CDC-GLOBAL'
  }
];

module.exports = {
  MEDICAL_SOURCES,
  MEDICINES,
  DISEASES,
  DISEASE_GUIDELINES
};
