/* ===== SYMPTOM SELECTION & PREDICT ===== */

const MIN_SYMPTOMS = 5;

const symptomsGrid   = document.getElementById('symptomsGrid');
const predictBtn     = document.getElementById('predictBtn');
const clearAllBtn    = document.getElementById('clearAll');
const selectedBadge  = document.getElementById('selectedCountBadge');
const selectedCount  = document.getElementById('selectedCount');
const symptomSearch  = document.getElementById('symptomSearch');
const resultsSection = document.getElementById('resultsSection');
const resultsContent = document.getElementById('resultsContent');
const resultsSubtitle = document.getElementById('resultsSubtitle');
const loadingOverlay = document.getElementById('loadingOverlay');
const minWarning     = document.getElementById('minSymptomsWarning');

let selectedSymptoms = new Set();

/* ---- toggle a single card (select / deselect) ---- */
function toggleCard(card) {
    const key = card.dataset.symptom;
    if (!key) return;

    if (selectedSymptoms.has(key)) {
        selectedSymptoms.delete(key);
        card.classList.remove('selected');
        const icon = card.querySelector('.symptom-icon');
        if (icon) icon.textContent = '○';
        const cb = card.querySelector('.symptom-checkbox');
        if (cb) cb.checked = false;
    } else {
        selectedSymptoms.add(key);
        card.classList.add('selected');
        const icon = card.querySelector('.symptom-icon');
        if (icon) icon.textContent = '✓';
        const cb = card.querySelector('.symptom-checkbox');
        if (cb) cb.checked = true;
    }

    updateUI();
}

/* ---- attach click listeners to all cards ---- */
if (symptomsGrid) {
    symptomsGrid.addEventListener('click', function(e) {
        const card = e.target.closest('.symptom-card');
        if (!card) return;
        e.preventDefault();
        toggleCard(card);
    });
}

/* ---- update badge, button state, warning ---- */
function updateUI() {
    const count = selectedSymptoms.size;

    if (selectedBadge) {
        selectedBadge.style.display = count > 0 ? 'flex' : 'none';
    }
    if (selectedCount) {
        selectedCount.textContent = count;
    }

    if (predictBtn) {
        predictBtn.disabled = count < MIN_SYMPTOMS;
        predictBtn.title = count < MIN_SYMPTOMS
            ? `Select at least ${MIN_SYMPTOMS} symptoms to predict`
            : '';
    }

    if (minWarning) {
        if (count > 0 && count < MIN_SYMPTOMS) {
            minWarning.textContent = `Select ${MIN_SYMPTOMS - count} more symptom${MIN_SYMPTOMS - count === 1 ? '' : 's'} to unlock prediction.`;
            minWarning.style.display = 'block';
        } else {
            minWarning.style.display = 'none';
        }
    }
}

/* ---- clear all ---- */
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', function() {
        selectedSymptoms.clear();
        document.querySelectorAll('.symptom-card.selected').forEach(function(card) {
            card.classList.remove('selected');
            const icon = card.querySelector('.symptom-icon');
            if (icon) icon.textContent = '○';
            const cb = card.querySelector('.symptom-checkbox');
            if (cb) cb.checked = false;
        });
        updateUI();
        if (resultsSection) resultsSection.style.display = 'none';
    });
}

/* ---- search filter ---- */
if (symptomSearch) {
    symptomSearch.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        document.querySelectorAll('.symptom-card').forEach(function(card) {
            const name = (card.dataset.symptom || '').toLowerCase().replace(/_/g, ' ');
            const label = (card.querySelector('.symptom-name') || {}).textContent || '';
            const match = !query || name.includes(query) || label.toLowerCase().includes(query);
            card.classList.toggle('hidden', !match);
        });
    });
}

/* ---- category filter ---- */
document.querySelectorAll('.category-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.category-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        const cat = btn.dataset.category;
        document.querySelectorAll('.symptom-card').forEach(function(card) {
            if (cat === 'all') {
                card.classList.remove('hidden');
            } else {
                card.classList.toggle('hidden', card.dataset.category !== cat);
            }
        });
        if (symptomSearch) symptomSearch.value = '';
    });
});

/* ---- predict ---- */
if (predictBtn) {
    predictBtn.addEventListener('click', async function() {
        if (selectedSymptoms.size < MIN_SYMPTOMS) {
            if (minWarning) {
                minWarning.style.display = 'block';
                minWarning.textContent = `Please select at least ${MIN_SYMPTOMS} symptoms.`;
            }
            return;
        }

        const patientName = (document.getElementById('patientName') || {}).value || '';
        const patientAge  = (document.getElementById('patientAge')  || {}).value || null;

        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (resultsSection) resultsSection.style.display = 'none';

        try {
            const resp = await fetch('/predict/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    symptoms: Array.from(selectedSymptoms),
                    patient_name: patientName,
                    patient_age: patientAge ? parseInt(patientAge) : null
                })
            });

            const data = await resp.json();

            if (loadingOverlay) loadingOverlay.style.display = 'none';

            if (data.error) {
                showResultsError(data.error);
                return;
            }

            showPredictions(data);
        } catch (err) {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            showResultsError('Network error. Please try again.');
        }
    });
}

function showResultsError(msg) {
    if (!resultsSection) return;
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (resultsContent) {
        resultsContent.innerHTML = `<div class="alert alert-error"><span class="alert-icon">⚠️</span><div>${msg}</div></div>`;
    }
}

function showPredictions(data) {
    if (!resultsSection || !resultsContent) return;

    if (resultsSubtitle) {
        resultsSubtitle.textContent = `Based on ${data.symptoms_count} matched symptom${data.symptoms_count !== 1 ? 's' : ''}`;
    }

    const preds = data.predictions || [];
    if (!preds.length) {
        resultsContent.innerHTML = '<p class="no-results">No predictions available. Try selecting different symptoms.</p>';
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    const colors = ['var(--primary)', 'var(--warning)', 'var(--success)'];
    const badges = ['🥇 Top Match', '🥈 Second', '🥉 Third'];

    let html = '<div class="predictions-list">';
    preds.forEach(function(pred, i) {
        const pct = pred.probability.toFixed(1);
        const barColor = colors[i] || 'var(--text-muted)';
        const badge = badges[i] || '';
        html += `
        <div class="pred-card ${i === 0 ? 'pred-card-top' : ''}">
            <div class="pred-card-header">
                <div>
                    <span class="pred-rank">${badge}</span>
                    <h3 class="pred-disease">${pred.disease}</h3>
                </div>
                <span class="pred-pct" style="color:${barColor}">${pct}%</span>
            </div>
            <div class="pred-bar-track">
                <div class="pred-bar-fill" style="width:${Math.min(pct,100)}%; background:${barColor}"></div>
            </div>
        </div>`;
    });
    html += '</div>';

    html += `<div class="results-disclaimer">
        ⚠️ This tool is for educational purposes only and does not replace professional medical advice. Always consult a qualified healthcare provider.
    </div>`;

    resultsContent.innerHTML = html;
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    buildPrintReport(data, preds);
}

/* ---- new prediction ---- */
const newPredBtn = document.getElementById('newPrediction');
if (newPredBtn) {
    newPredBtn.addEventListener('click', function() {
        if (resultsSection) resultsSection.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ---- print report ---- */
const printBtn = document.getElementById('printReportBtn');
if (printBtn) {
    printBtn.addEventListener('click', function() {
        window.print();
    });
}

function buildPrintReport(data, preds) {
    const dateEl = document.getElementById('prReportDate');
    const footerEl = document.getElementById('prFooterDate');
    const now = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
    if (dateEl) dateEl.textContent = now;
    if (footerEl) footerEl.textContent = now;

    const patientSec = document.getElementById('prPatientSection');
    if (patientSec) {
        const name = (document.getElementById('patientName') || {}).value || '—';
        const age  = (document.getElementById('patientAge')  || {}).value || '—';
        patientSec.innerHTML = `
            <h3 class="pr-section-title">Patient Information</h3>
            <div class="pr-patient-grid">
                <div><span class="pr-label">Name</span><span class="pr-value">${name}</span></div>
                <div><span class="pr-label">Age</span><span class="pr-value">${age}</span></div>
            </div>`;
    }

    const symptomsSec = document.getElementById('prSymptomsSection');
    if (symptomsSec) {
        const chips = Array.from(selectedSymptoms).map(function(s) {
            return `<span class="pr-chip">${s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</span>`;
        }).join('');
        symptomsSec.innerHTML = `<h3 class="pr-section-title">Symptoms Selected (${selectedSymptoms.size})</h3><div class="pr-chips">${chips}</div>`;
    }

    const predSec = document.getElementById('prPredictionsSection');
    if (predSec) {
        let predHtml = '<h3 class="pr-section-title">Prediction Results</h3>';
        preds.forEach(function(p, i) {
            predHtml += `<div class="pr-pred-row"><span>${['1st','2nd','3rd'][i] || ''} ${p.disease}</span><strong>${p.probability.toFixed(1)}%</strong></div>`;
        });
        predSec.innerHTML = predHtml;
    }
}

/* ---- guided mode ---- */
const manualModeBtn = document.getElementById('manualModeBtn');
const guidedModeBtn = document.getElementById('guidedModeBtn');
const guidedOverlay = document.getElementById('guidedOverlay');
const guidedClose   = document.getElementById('guidedClose');

if (manualModeBtn) {
    manualModeBtn.addEventListener('click', function() {
        manualModeBtn.classList.add('active');
        if (guidedModeBtn) guidedModeBtn.classList.remove('active');
    });
}

if (guidedModeBtn) {
    guidedModeBtn.addEventListener('click', function() {
        guidedModeBtn.classList.add('active');
        if (manualModeBtn) manualModeBtn.classList.remove('active');
        if (guidedOverlay) guidedOverlay.style.display = 'flex';
    });
}

if (guidedClose) {
    guidedClose.addEventListener('click', function() {
        if (guidedOverlay) guidedOverlay.style.display = 'none';
    });
}

/* ---- utility ---- */
function getCookie(name) {
    const val = `; ${document.cookie}`;
    const parts = val.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
}

updateUI();
