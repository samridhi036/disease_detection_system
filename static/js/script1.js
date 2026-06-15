// ── Guided Symptom Checker ─────────────────────────────────────────────────
(function () {
    const AREA_QUESTIONS = {
        upper_gi: {
            title: 'Upper GI / Stomach Symptoms',
            icon: '🫁',
            questions: [
                { symptom: 'nausea',          label: 'Do you have nausea (feeling like you might vomit)?' },
                { symptom: 'vomiting',        label: 'Do you have vomiting?' },
                { symptom: 'heartburn',       label: 'Do you have heartburn — a burning feeling in your chest after eating?' },
                { symptom: 'acid_reflux',     label: 'Do you experience acid reflux (stomach acid coming up into your throat)?' },
                { symptom: 'indigestion',     label: 'Do you have indigestion or an upset stomach?' },
                { symptom: 'bloating',        label: 'Do you feel bloated or uncomfortably full?' },
                { symptom: 'belching',        label: 'Do you belch or burp excessively?' },
                { symptom: 'early_satiety',   label: 'Do you feel full very quickly after starting to eat (early satiety)?' },
                { symptom: 'epigastric_pain', label: 'Do you have pain or burning in the upper-middle area of your abdomen?' },
                { symptom: 'hematemesis',     label: 'Have you vomited blood or noticed coffee-ground material in your vomit?' },
                { symptom: 'regurgitation',   label: 'Do you have regurgitation (food coming back up into your mouth without nausea)?' },
                { symptom: 'dysphagia',       label: 'Do you have difficulty swallowing food or liquid?' },
            ]
        },
        lower_gi: {
            title: 'Lower GI / Bowel Symptoms',
            icon: '🫃',
            questions: [
                { symptom: 'diarrhea',                label: 'Do you have diarrhea (loose or watery stools)?' },
                { symptom: 'constipation',            label: 'Do you have constipation (difficulty passing stools or infrequent bowel movements)?' },
                { symptom: 'blood_in_stool',          label: 'Have you noticed blood in your stool?' },
                { symptom: 'rectal_bleeding',         label: 'Do you have rectal bleeding (blood from your rectum)?' },
                { symptom: 'abdominal_pain',          label: 'Do you have cramping or pain in your lower abdomen?' },
                { symptom: 'mucus_in_stool',          label: 'Do you notice mucus or slime in your stool?' },
                { symptom: 'urgency_to_defecate',     label: 'Do you have sudden strong urges to have a bowel movement?' },
                { symptom: 'painful_defecation',      label: 'Do you have pain during bowel movements?' },
                { symptom: 'alternating_bowel_habits',label: 'Do you alternate between diarrhea and constipation?' },
                { symptom: 'tenesmus',                label: 'Do you feel like you still need to go after a bowel movement (incomplete emptying)?' },
                { symptom: 'gas',                     label: 'Do you have excessive gas or flatulence?' },
                { symptom: 'melena',                  label: 'Have you noticed very dark or tarry stools?' },
            ]
        },
        liver: {
            title: 'Liver / Hepatic Symptoms',
            icon: '🫀',
            questions: [
                { symptom: 'jaundice',              label: 'Do you have yellowing of your skin or eyes (jaundice)?' },
                { symptom: 'dark_urine',            label: 'Is your urine dark brown or tea-coloured?' },
                { symptom: 'pale_stools',           label: 'Are your stools pale, grey, or clay-coloured?' },
                { symptom: 'itching',               label: 'Do you have persistent itching (pruritus) of your skin?' },
                { symptom: 'abdominal_swelling',    label: 'Is your abdomen swollen or distended (not from eating)?' },
                { symptom: 'swelling_legs',         label: 'Do you have swelling in your legs or ankles?' },
                { symptom: 'right_upper_quadrant_pain', label: 'Do you have pain or discomfort under your right ribcage?' },
                { symptom: 'elevated_liver_enzymes',label: 'Have you been told your liver enzymes are elevated on a blood test?' },
                { symptom: 'spider_angiomas',       label: 'Do you have small spider-like blood vessels visible on your skin?' },
                { symptom: 'palmar_erythema',       label: 'Is the skin on your palms unusually red?' },
                { symptom: 'yellowing_eyes',        label: 'Do the whites of your eyes appear yellow?' },
            ]
        },
        systemic: {
            title: 'General / Systemic Symptoms',
            icon: '🌡️',
            questions: [
                { symptom: 'fatigue',           label: 'Do you feel unusually tired or fatigued even with adequate rest?' },
                { symptom: 'fever',             label: 'Do you have a fever (body temperature above 38°C / 100.4°F)?' },
                { symptom: 'weight_loss',       label: 'Have you lost weight unintentionally in recent weeks or months?' },
                { symptom: 'loss_of_appetite',  label: 'Have you lost your appetite or desire to eat?' },
                { symptom: 'night_sweats',      label: 'Do you experience night sweats (drenching sweats that wake you up)?' },
                { symptom: 'chills',            label: 'Do you have chills or feel cold and shivery?' },
                { symptom: 'joint_pain',        label: 'Do you have pain or aching in your joints?' },
                { symptom: 'muscle_pain',       label: 'Do you have unexplained muscle aches or pain?' },
                { symptom: 'anemia',            label: 'Have you been told you are anaemic, or do you feel very pale and weak?' },
                { symptom: 'low_grade_fever',   label: 'Do you have a persistent low-grade fever (slightly elevated temperature most of the time)?' },
            ]
        }
    };

    const overlay     = document.getElementById('guidedOverlay');
    const openBtn     = document.getElementById('guidedModeBtn');
    const closeBtn    = document.getElementById('guidedClose');
    const progressFill= document.getElementById('guidedProgressFill');

    const stepArea    = document.getElementById('gStepArea');
    const stepQuestions= document.getElementById('gStepQuestions');
    const stepSummary = document.getElementById('gStepSummary');

    const areaGrid    = document.getElementById('areaGrid');
    const areaNext    = document.getElementById('areaNext');
    const qStepLabel  = document.getElementById('qStepLabel');
    const qStepTitle  = document.getElementById('qStepTitle');
    const questionList= document.getElementById('questionList');
    const qBack       = document.getElementById('qBack');
    const qNext       = document.getElementById('qNext');
    const summaryDesc = document.getElementById('summaryDesc');
    const summaryChips= document.getElementById('summaryChips');
    const summaryNone = document.getElementById('summaryNone');
    const summaryBack = document.getElementById('summaryBack');
    const summaryPredict = document.getElementById('summaryPredict');

    let selectedAreas = [];
    let areaQueue     = [];
    let currentAreaIdx= 0;
    let guidedAnswers = {};   // symptomKey -> true/false

    function openGuided() {
        selectedAreas = [];
        areaQueue     = [];
        currentAreaIdx= 0;
        guidedAnswers = {};
        areaGrid.querySelectorAll('.area-card').forEach(c => c.classList.remove('selected'));
        areaNext.disabled = true;
        showStep(stepArea, 0);
        overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    function closeGuided() {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    function setProgress(pct) {
        progressFill.style.width = pct + '%';
    }

    function showStep(stepEl, progress) {
        [stepArea, stepQuestions, stepSummary].forEach(s => s.style.display = 'none');
        stepEl.style.display = 'block';
        setProgress(progress);
    }

    if (openBtn)  openBtn.addEventListener('click', openGuided);
    if (closeBtn) closeBtn.addEventListener('click', closeGuided);
    overlay && overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeGuided();
    });

    // Area selection
    areaGrid.addEventListener('click', function (e) {
        const card = e.target.closest('.area-card');
        if (!card) return;
        card.classList.toggle('selected');
        selectedAreas = Array.from(areaGrid.querySelectorAll('.area-card.selected')).map(c => c.dataset.area);
        areaNext.disabled = selectedAreas.length === 0;
    });

    areaNext.addEventListener('click', function () {
        areaQueue = [...selectedAreas];
        currentAreaIdx = 0;
        showQuestionStep();
    });

    function showQuestionStep() {
        const totalAreas = areaQueue.length;
        const areaKey = areaQueue[currentAreaIdx];
        const areaData = AREA_QUESTIONS[areaKey];
        const stepNum = currentAreaIdx + 2;
        const totalSteps = totalAreas + 2;
        const progress = Math.round(((stepNum - 1) / totalSteps) * 100);

        qStepLabel.textContent = `Step ${stepNum} of ${totalSteps} — ${areaData.icon} ${areaData.title}`;
        qStepTitle.textContent = areaData.title;
        showStep(stepQuestions, progress);

        questionList.innerHTML = areaData.questions.map(q => {
            const existing = guidedAnswers.hasOwnProperty(q.symptom) ? guidedAnswers[q.symptom] : null;
            return `
            <div class="q-row" data-symptom="${q.symptom}">
                <span class="q-label">${q.label}</span>
                <div class="q-btns">
                    <button class="q-btn q-yes ${existing === true ? 'selected' : ''}" data-val="yes">Yes</button>
                    <button class="q-btn q-no  ${existing === false ? 'selected' : ''}" data-val="no">No</button>
                </div>
            </div>`;
        }).join('');
    }

    questionList.addEventListener('click', function (e) {
        const btn = e.target.closest('.q-btn');
        if (!btn) return;
        const row = btn.closest('.q-row');
        const symptom = row.dataset.symptom;
        const isYes = btn.dataset.val === 'yes';
        row.querySelectorAll('.q-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        guidedAnswers[symptom] = isYes;
    });

    qBack.addEventListener('click', function () {
        if (currentAreaIdx === 0) {
            showStep(stepArea, 0);
        } else {
            currentAreaIdx--;
            showQuestionStep();
        }
    });

    qNext.addEventListener('click', function () {
        if (currentAreaIdx < areaQueue.length - 1) {
            currentAreaIdx++;
            showQuestionStep();
        } else {
            showSummaryStep();
        }
    });

    function showSummaryStep() {
        const totalSteps = areaQueue.length + 2;
        showStep(stepSummary, 90);
        const yesSymptoms = Object.entries(guidedAnswers).filter(([, v]) => v).map(([k]) => k);
        summaryDesc.textContent = yesSymptoms.length > 0
            ? `You reported ${yesSymptoms.length} symptom${yesSymptoms.length !== 1 ? 's' : ''}. Review them below before running the prediction.`
            : 'You answered "No" to all symptoms.';
        if (yesSymptoms.length > 0) {
            summaryChips.style.display = 'flex';
            summaryNone.style.display = 'none';
            summaryChips.innerHTML = yesSymptoms.map(s => {
                const label = s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return `<span class="sum-chip" data-symptom="${s}">${label} <button class="sum-chip-remove" data-symptom="${s}" title="Remove">✕</button></span>`;
            }).join('');
        } else {
            summaryChips.style.display = 'none';
            summaryNone.style.display = 'flex';
        }
        summaryPredict.disabled = yesSymptoms.length === 0;
    }

    summaryChips.addEventListener('click', function (e) {
        const removeBtn = e.target.closest('.sum-chip-remove');
        if (!removeBtn) return;
        const sym = removeBtn.dataset.symptom;
        guidedAnswers[sym] = false;
        showSummaryStep();
    });

    summaryBack.addEventListener('click', function () {
        currentAreaIdx = areaQueue.length - 1;
        showQuestionStep();
    });

    summaryPredict.addEventListener('click', function () {
        const yesSymptoms = Object.entries(guidedAnswers).filter(([, v]) => v).map(([k]) => k);
        if (yesSymptoms.length === 0) return;
        closeGuided();
        applyGuidedSymptoms(yesSymptoms);
    });

    function applyGuidedSymptoms(symptoms) {
        // Use the main module's symptom state via a custom event
        document.dispatchEvent(new CustomEvent('guided:apply', { detail: { symptoms } }));
    }
})();

// ── Main App ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    const symptomsGrid = document.getElementById('symptomsGrid');
    const predictBtn = document.getElementById('predictBtn');
    const clearAllBtn = document.getElementById('clearAll');
    const symptomSearch = document.getElementById('symptomSearch');
    const selectedCountBadge = document.getElementById('selectedCountBadge');
    const selectedCountEl = document.getElementById('selectedCount');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    const resultsSubtitle = document.getElementById('resultsSubtitle');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const newPredictionBtn = document.getElementById('newPrediction');
    const printReportBtn = document.getElementById('printReportBtn');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const patientNameInput = document.getElementById('patientName');
    const patientAgeInput = document.getElementById('patientAge');

    if (!symptomsGrid) return;

    const CATEGORIES = {
        digestive: ['nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating', 'gas', 'heartburn', 'acid_reflux', 'indigestion', 'belching', 'flatulence', 'regurgitation', 'early_satiety', 'dyspepsia', 'hematemesis', 'melena', 'hiccups', 'bad_breath'],
        pain: ['abdominal_pain', 'chest_pain', 'upper_abdominal_pain', 'right_upper_quadrant_pain', 'left_lower_quadrant_pain', 'right_lower_quadrant_pain', 'epigastric_pain', 'cramping', 'anal_pain', 'rebound_tenderness', 'guarding', 'rigidity', 'tenderness', 'muscle_pain', 'joint_pain', 'headache'],
        systemic: ['fatigue', 'fever', 'weight_loss', 'loss_of_appetite', 'night_sweats', 'chills', 'anemia', 'low_grade_fever', 'weight_gain', 'rash', 'anxiety', 'stress_related_symptoms', 'confusion', 'swelling_legs'],
        liver: ['jaundice', 'dark_urine', 'pale_stools', 'itching', 'abdominal_swelling', 'spider_angiomas', 'palmar_erythema', 'elevated_liver_enzymes', 'yellowing_eyes', 'clay_colored_stools'],
        bowel: ['blood_in_stool', 'rectal_bleeding', 'mucus_in_stool', 'urgency_to_defecate', 'tenesmus', 'painful_defecation', 'alternating_bowel_habits', 'pellet_stools', 'ribbon_like_stools', 'hard_stools', 'straining', 'infrequent_stools', 'rectal_prolapse', 'anal_fissure', 'perianal_fistula', 'increased_bowel_sounds', 'decreased_bowel_sounds', 'borborygmi'],
    };

    let selectedSymptoms = new Set();
    let activeCategory = 'all';
    let lastPredictionData = null;

    function getSymptomCategory(symptomKey) {
        for (const [cat, symptoms] of Object.entries(CATEGORIES)) {
            if (symptoms.includes(symptomKey)) return cat;
        }
        return 'other';
    }

    function updateUI() {
        const count = selectedSymptoms.size;
        predictBtn.disabled = count === 0;
        if (count > 0) {
            selectedCountBadge.style.display = 'flex';
            selectedCountEl.textContent = count;
        } else {
            selectedCountBadge.style.display = 'none';
        }
    }

    function applyFilters() {
        const searchTerm = symptomSearch.value.toLowerCase().trim();
        const cards = symptomsGrid.querySelectorAll('.symptom-card');
        cards.forEach(card => {
            const key = card.dataset.symptom;
            const label = card.querySelector('.symptom-name').textContent.toLowerCase();
            const cat = getSymptomCategory(key);
            const matchesSearch = !searchTerm || label.includes(searchTerm);
            const matchesCategory = activeCategory === 'all' || cat === activeCategory;
            card.classList.toggle('hidden', !(matchesSearch && matchesCategory));
        });
    }

//    symptomsGrid.addEventListener('click', function (e) {
//        const card = e.target.closest('.symptom-card');
//        if (!card) return;
//        const key = card.dataset.symptom;
//        const checkbox = card.querySelector('.symptom-checkbox');
//        if (selectedSymptoms.has(key)) {
//            selectedSymptoms.delete(key);
//            card.classList.remove('selected');
//            card.querySelector('.symptom-icon').textContent = '○';
//            checkbox.checked = false;
//        } else {
//            selectedSymptoms.add(key);
//            card.classList.add('selected');
//            card.querySelector('.symptom-icon').textContent = '✓';
//            checkbox.checked = true;
//        }
//        updateUI();
//    });

    symptomsGrid.addEventListener('change', function (e) {
        if (!e.target.classList.contains('symptom-checkbox')) return;

        const checkbox = e.target;
        const card = checkbox.closest('.symptom-card');
        const key = checkbox.value;

        if (checkbox.checked) {
            selectedSymptoms.add(key);
            card.classList.add('selected');
            card.querySelector('.symptom-icon').textContent = '✓';
        } else {
            selectedSymptoms.delete(key);
            card.classList.remove('selected');
            card.querySelector('.symptom-icon').textContent = '○';
        }

        updateUI();
    });

    symptomSearch.addEventListener('input', applyFilters);

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.category;
            applyFilters();
        });
    });

    clearAllBtn.addEventListener('click', function () {
        selectedSymptoms.clear();
        symptomsGrid.querySelectorAll('.symptom-card').forEach(card => {
            card.classList.remove('selected');
            card.querySelector('.symptom-icon').textContent = '○';
            card.querySelector('.symptom-checkbox').checked = false;
        });
        symptomSearch.value = '';
        activeCategory = 'all';
        categoryBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.category-btn[data-category="all"]').classList.add('active');
        applyFilters();
        updateUI();
        resultsSection.style.display = 'none';
        lastPredictionData = null;
    });

    predictBtn.addEventListener('click', async function () {
        if (selectedSymptoms.size === 0) return;

        loadingOverlay.style.display = 'flex';
        resultsSection.style.display = 'none';

        const patientName = patientNameInput ? patientNameInput.value.trim() : '';
        const patientAge = patientAgeInput ? parseInt(patientAgeInput.value) || null : null;

        try {
            const response = await fetch('/predict/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symptoms: Array.from(selectedSymptoms),
                    patient_name: patientName,
                    patient_age: patientAge,
                })
            });

            const data = await response.json();
            loadingOverlay.style.display = 'none';

            if (data.error) {
                alert('Error: ' + data.error);
                return;
            }

            lastPredictionData = { data, patientName, patientAge, symptoms: Array.from(selectedSymptoms) };
            renderResults(data, patientName, patientAge);
            buildPrintReport(data, patientName, patientAge, Array.from(selectedSymptoms));
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            loadingOverlay.style.display = 'none';
            alert('An error occurred while connecting to the server. Please try again.');
        }
    });

    newPredictionBtn.addEventListener('click', function () {
        resultsSection.style.display = 'none';
        lastPredictionData = null;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (printReportBtn) {
        printReportBtn.addEventListener('click', function () {
            if (!lastPredictionData) return;
            window.print();
        });
    }

    // ── Print report builder ──────────────────────────────────────────────
    function buildPrintReport(data, patientName, patientAge, symptoms) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const fullDate = `${dateStr} at ${timeStr}`;

        const prReportDate = document.getElementById('prReportDate');
        const prFooterDate = document.getElementById('prFooterDate');
        if (prReportDate) prReportDate.textContent = fullDate;
        if (prFooterDate) prFooterDate.textContent = fullDate;

        // Patient section
        const prPatient = document.getElementById('prPatientSection');
        if (prPatient) {
            if (patientName || patientAge) {
                prPatient.innerHTML = `
                    <div class="pr-section-title">Patient Information</div>
                    <div class="pr-patient-grid">
                        <div class="pr-patient-field">
                            <span class="pr-field-label">Name</span>
                            <span class="pr-field-value">${escapeHtml(patientName || '—')}</span>
                        </div>
                        <div class="pr-patient-field">
                            <span class="pr-field-label">Age</span>
                            <span class="pr-field-value">${patientAge ? patientAge + ' years' : '—'}</span>
                        </div>
                        <div class="pr-patient-field">
                            <span class="pr-field-label">Report Date</span>
                            <span class="pr-field-value">${dateStr}</span>
                        </div>
                        <div class="pr-patient-field">
                            <span class="pr-field-label">Report Time</span>
                            <span class="pr-field-value">${timeStr}</span>
                        </div>
                    </div>`;
            } else {
                prPatient.innerHTML = `
                    <div class="pr-section-title">Report Information</div>
                    <div class="pr-patient-grid">
                        <div class="pr-patient-field">
                            <span class="pr-field-label">Date</span>
                            <span class="pr-field-value">${dateStr}</span>
                        </div>
                        <div class="pr-patient-field">
                            <span class="pr-field-label">Time</span>
                            <span class="pr-field-value">${timeStr}</span>
                        </div>
                    </div>`;
            }
        }

        // Symptoms section
        const prSymptoms = document.getElementById('prSymptomsSection');
        if (prSymptoms) {
            const formatted = symptoms.map(s => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
            prSymptoms.innerHTML = `
                <div class="pr-section-title">Reported Symptoms (${symptoms.length})</div>
                <div class="pr-symptoms-grid">
                    ${formatted.map(s => `<span class="pr-symptom-chip">${escapeHtml(s)}</span>`).join('')}
                </div>`;
        }

        // Predictions section
        const prPreds = document.getElementById('prPredictionsSection');
        if (prPreds) {
            const rankLabels = ['Primary Prediction', 'Secondary Prediction', 'Tertiary Prediction'];
            prPreds.innerHTML = `
                <div class="pr-section-title">Prediction Results</div>
                ${data.predictions.map((p, i) => `
                    <div class="pr-pred-card ${i === 0 ? 'pr-pred-top' : ''}">
                        <div class="pr-pred-header">
                            <div class="pr-pred-left">
                                <div class="pr-pred-rank">${rankLabels[i] || `#${i+1}`}</div>
                                <div class="pr-pred-disease">${escapeHtml(p.disease)}</div>
                            </div>
                            <div class="pr-pred-right">
                                <div class="pr-pred-prob">${p.probability}%</div>
                                <div class="pr-pred-prob-label">confidence</div>
                            </div>
                        </div>
                        <div class="pr-pred-bar-track">
                            <div class="pr-pred-bar" style="width:${p.probability}%"></div>
                        </div>
                        ${p.description ? `<div class="pr-pred-desc">${escapeHtml(p.description)}</div>` : ''}
                        <div class="pr-pred-meta">
                            <div class="pr-pred-meta-item"><span class="pr-label">Severity:</span> <strong>${escapeHtml(p.severity)}</strong></div>
                            <div class="pr-pred-meta-item"><span class="pr-label">Specialist:</span> <strong>${escapeHtml(p.specialist)}</strong></div>
                        </div>
                        ${p.recommendations && p.recommendations.length ? `
                        <div class="pr-pred-recs">
                            <div class="pr-label">Recommendations:</div>
                            <ul class="pr-rec-list">
                                ${p.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                            </ul>
                        </div>` : ''}
                    </div>
                `).join('')}`;
        }
    }

    // ── Screen results renderer ────────────────────────────────────────────
    function getSeverityClass(severity) {
        const s = (severity || '').toLowerCase();
        if (s.includes('emergency')) return 'severity-emergency';
        if (s.includes('critical')) return 'severity-critical';
        if (s.includes('high')) return 'severity-high';
        if (s.includes('moderate') || s.includes('low-moderate')) return 'severity-moderate';
        return 'severity-low';
    }

    function getProbClass(prob) {
        if (prob >= 50) return 'prob-high';
        if (prob >= 25) return 'prob-medium';
        return 'prob-low';
    }

    function renderResults(data, patientName, patientAge) {
        const { predictions, symptoms_count } = data;

        let patientLine = '';
        if (patientName || patientAge) {
            const parts = [];
            if (patientName) parts.push(patientName);
            if (patientAge) parts.push(`Age ${patientAge}`);
            patientLine = `<span class="results-patient">👤 ${escapeHtml(parts.join(', '))}</span>`;
        }

        resultsSubtitle.innerHTML = `${patientLine}Based on ${symptoms_count} symptom${symptoms_count !== 1 ? 's' : ''} — top ${predictions.length} prediction${predictions.length !== 1 ? 's' : ''}`;

        const ranks = ['🥇 Top Prediction', '🥈 Second Most Likely', '🥉 Third Most Likely'];
        const rankKeys = ['top-result', '', ''];

        resultsContent.innerHTML = predictions.map((p, i) => `
            <div class="result-card ${rankKeys[i]}">
                <div class="result-header">
                    <div class="result-left">
                        <div class="result-rank">${ranks[i] || `#${i + 1}`}</div>
                        <div class="result-disease">${escapeHtml(p.disease)}</div>
                    </div>
                    <div class="result-right">
                        <div class="probability-circle ${getProbClass(p.probability)}">
                            <span class="prob-number">${p.probability}%</span>
                            <span class="prob-label">match</span>
                        </div>
                        <span class="severity-badge ${getSeverityClass(p.severity)}">${escapeHtml(p.severity)}</span>
                    </div>
                </div>
                ${p.description ? `<div class="result-description">${escapeHtml(p.description)}</div>` : ''}
                <div class="result-info-grid">
                    <div class="info-block">
                        <h4>Recommended Specialist</h4>
                        <span class="specialist-tag">🏥 ${escapeHtml(p.specialist)}</span>
                    </div>
                    ${p.recommendations && p.recommendations.length ? `
                    <div class="info-block">
                        <h4>Recommendations</h4>
                        <ul class="recommendations-list">
                            ${p.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ── Mode switcher ──────────────────────────────────────────────────────
    const manualModeBtn = document.getElementById('manualModeBtn');
    const guidedModeBtn2 = document.getElementById('guidedModeBtn');

    if (manualModeBtn) manualModeBtn.addEventListener('click', function () {
        manualModeBtn.classList.add('active');
        if (guidedModeBtn2) guidedModeBtn2.classList.remove('active');
    });
    if (guidedModeBtn2) guidedModeBtn2.addEventListener('click', function () {
        guidedModeBtn2.classList.add('active');
        if (manualModeBtn) manualModeBtn.classList.remove('active');
    });

    // ── Apply symptoms from guided checker ────────────────────────────────
    document.addEventListener('guided:apply', function (e) {
        const symptoms = e.detail.symptoms;

        // Clear all first
        selectedSymptoms.clear();
        symptomsGrid.querySelectorAll('.symptom-card').forEach(card => {
            card.classList.remove('selected');
            card.querySelector('.symptom-icon').textContent = '○';
            card.querySelector('.symptom-checkbox').checked = false;
        });

        // Apply guided selections
        symptoms.forEach(symptom => {
            const card = symptomsGrid.querySelector(`.symptom-card[data-symptom="${symptom}"]`);
            if (card) {
                selectedSymptoms.add(symptom);
                card.classList.add('selected');
                card.querySelector('.symptom-icon').textContent = '✓';
                card.querySelector('.symptom-checkbox').checked = true;
            } else {
                // Symptom exists in model but may not be in grid — add anyway
                selectedSymptoms.add(symptom);
            }
        });

        // Reset filters so all selected cards are visible
        symptomSearch.value = '';
        activeCategory = 'all';
        categoryBtns.forEach(b => b.classList.remove('active'));
        const allBtn = document.querySelector('.category-btn[data-category="all"]');
        if (allBtn) allBtn.classList.add('active');
        applyFilters();
        updateUI();

        // Switch back to manual mode view and scroll to symptom grid
        if (manualModeBtn) manualModeBtn.classList.add('active');
        if (guidedModeBtn2) guidedModeBtn2.classList.remove('active');

        const grid = document.getElementById('symptomsGrid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Show a brief toast confirmation
        showToast(`${symptoms.length} symptom${symptoms.length !== 1 ? 's' : ''} added from guided checker — review and click Predict`);
    });

    function showToast(msg) {
        let toast = document.getElementById('guidedToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'guidedToast';
            toast.className = 'guided-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    updateUI();
});
