(function () {
    'use strict';

    const MIN_SYMPTOMS = 5;

    const grid = document.getElementById('symptomsGrid');
    if (!grid) return;

    const predictBtn = document.getElementById('predictBtn');
    const clearAllBtn = document.getElementById('clearAll');
    const searchInput = document.getElementById('symptomSearch');
    const countBadge = document.getElementById('selectedCountBadge');
    const countSpan = document.getElementById('selectedCount');
    const warningDiv = document.getElementById('minSymptomsWarning');
    const warningCount = document.getElementById('warningCount');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    const resultsSubtitle = document.getElementById('resultsSubtitle');
    const newPredictionBtn = document.getElementById('newPrediction');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const printReportBtn = document.getElementById('printReportBtn');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const manualModeBtn = document.getElementById('manualModeBtn');

    let activeCategory = 'all';
    let lastPredictionData = null;

    function getSelectedCards() {
        return Array.from(grid.querySelectorAll('.symptom-card.selected'));
    }

    function getSelectedSymptoms() {
        return getSelectedCards().map(card => card.dataset.symptom).filter(Boolean);
    }

    function updateUI() {
        const selected = getSelectedCards();
        const count = selected.length;

        if (countSpan) countSpan.textContent = count;
        if (countBadge) countBadge.style.display = count > 0 ? 'flex' : 'none';

        if (predictBtn) {
            predictBtn.disabled = count < MIN_SYMPTOMS;
        }
    }

    function toggleCard(card) {
        const isSelected = card.classList.contains('selected');
        const icon = card.querySelector('.symptom-icon');
        const checkbox = card.querySelector('.symptom-checkbox');

        if (isSelected) {
            card.classList.remove('selected');
            if (icon) icon.textContent = '○';
            if (checkbox) checkbox.checked = false;
        } else {
            card.classList.add('selected');
            if (icon) icon.textContent = '●';
            if (checkbox) checkbox.checked = true;
        }
        updateUI();
    }

    grid.addEventListener('click', function (e) {
        const card = e.target.closest('.symptom-card');
        if (!card) return;
        e.preventDefault();
        toggleCard(card);
    });

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function () {
            grid.querySelectorAll('.symptom-card.selected').forEach(function (card) {
                card.classList.remove('selected');
                const icon = card.querySelector('.symptom-icon');
                const checkbox = card.querySelector('.symptom-checkbox');
                if (icon) icon.textContent = '○';
                if (checkbox) checkbox.checked = false;
            });
            updateUI();
            if (warningDiv) warningDiv.style.display = 'none';
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const query = this.value.trim().toLowerCase();
            grid.querySelectorAll('.symptom-card').forEach(function (card) {
                const name = (card.querySelector('.symptom-name') || {}).textContent || '';
                const category = card.dataset.category || '';
                const matchesSearch = !query || name.toLowerCase().includes(query);
                const matchesCategory = activeCategory === 'all' || category === activeCategory;
                card.classList.toggle('hidden', !(matchesSearch && matchesCategory));
            });
        });
    }

    categoryBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            categoryBtns.forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            activeCategory = this.dataset.category;
            const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
            grid.querySelectorAll('.symptom-card').forEach(function (card) {
                const name = (card.querySelector('.symptom-name') || {}).textContent || '';
                const category = card.dataset.category || '';
                const matchesSearch = !query || name.toLowerCase().includes(query);
                const matchesCategory = activeCategory === 'all' || category === activeCategory;
                card.classList.toggle('hidden', !(matchesSearch && matchesCategory));
            });
        });
    });

    if (manualModeBtn) {
        manualModeBtn.addEventListener('click', function () {
            document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
        });
    }

    if (predictBtn) {
        predictBtn.addEventListener('click', function () {
            const symptoms = getSelectedSymptoms();

            if (symptoms.length < MIN_SYMPTOMS) {
                if (warningDiv) {
                    warningDiv.style.display = 'flex';
                    if (warningCount) warningCount.textContent = symptoms.length;
                }
                return;
            }

            if (warningDiv) warningDiv.style.display = 'none';
            runPrediction(symptoms);
        });
    }

    function runPrediction(symptoms) {
        const patientName = (document.getElementById('patientName') || {}).value || '';
        const patientAge = (document.getElementById('patientAge') || {}).value || null;

        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        fetch('/predict/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                symptoms: symptoms,
                patient_name: patientName,
                patient_age: patientAge ? parseInt(patientAge, 10) : null
            })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (data.error) {
                alert('Error: ' + data.error);
                return;
            }
            lastPredictionData = {
                predictions: data.predictions,
                symptoms: symptoms,
                patient_name: patientName,
                patient_age: patientAge
            };
            showResults(data.predictions, symptoms, patientName, patientAge);
        })
        .catch(function (err) {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            alert('Request failed. Please try again.');
            console.error(err);
        });
    }

    function showResults(predictions, symptoms, patientName, patientAge) {
        if (!resultsSection || !resultsContent) return;

        document.querySelector('.predictor-section') && (document.querySelector('.predictor-section').style.display = 'none');
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        let subtitle = symptoms.length + ' symptom' + (symptoms.length !== 1 ? 's' : '') + ' analysed';
        if (patientName) subtitle = patientName + (patientAge ? ', ' + patientAge + 'y' : '') + ' — ' + subtitle;
        if (resultsSubtitle) resultsSubtitle.textContent = subtitle;

        const SEVERITY_MAP = {
            'Low': 'severity-low',
            'Moderate': 'severity-moderate',
            'High': 'severity-high',
            'Critical': 'severity-critical'
        };

        function getSeverity(prob) {
            if (prob >= 70) return 'Critical';
            if (prob >= 40) return 'High';
            if (prob >= 20) return 'Moderate';
            return 'Low';
        }

        function getProbClass(prob) {
            if (prob >= 50) return 'prob-high';
            if (prob >= 25) return 'prob-medium';
            return 'prob-low';
        }

        let html = '';
        predictions.forEach(function (pred, i) {
            const isTop = i === 0;
            const sev = getSeverity(pred.probability);
            const sevClass = SEVERITY_MAP[sev] || 'severity-low';
            const probClass = getProbClass(pred.probability);

            html += '<div class="result-card' + (isTop ? ' top-result' : '') + '">';
            html += '<div class="result-header">';
            html += '<div>';
            html += '<div class="result-rank">' + (isTop ? '🏆 Top Prediction' : '#' + (i + 1) + ' Alternative') + '</div>';
            html += '<div class="result-disease">' + pred.disease + '</div>';
            html += '</div>';
            html += '<div class="result-right">';
            html += '<div class="probability-circle ' + probClass + '">';
            html += '<span class="prob-number">' + pred.probability + '%</span>';
            html += '<span class="prob-label">match</span>';
            html += '</div>';
            html += '<span class="severity-badge ' + sevClass + '">' + sev + '</span>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        });

        resultsContent.innerHTML = html;
    }

    if (newPredictionBtn) {
        newPredictionBtn.addEventListener('click', function () {
            resultsSection.style.display = 'none';
            const ps = document.querySelector('.predictor-section');
            if (ps) ps.style.display = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (printReportBtn) {
        printReportBtn.addEventListener('click', function () {
            if (!lastPredictionData) return;
            buildPrintReport(lastPredictionData);
            window.print();
        });
    }

    function buildPrintReport(data) {
        const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
        const reportDate = document.getElementById('prReportDate');
        const footerDate = document.getElementById('prFooterDate');
        if (reportDate) reportDate.textContent = dateStr;
        if (footerDate) footerDate.textContent = dateStr;

        const patientSection = document.getElementById('prPatientSection');
        if (patientSection) {
            if (data.patient_name || data.patient_age) {
                patientSection.innerHTML = '<div class="pr-section-title">Patient Information</div>' +
                    '<div class="pr-patient-grid">' +
                    '<div class="pr-patient-field"><span class="pr-field-label">Name</span><span class="pr-field-value">' + (data.patient_name || '—') + '</span></div>' +
                    '<div class="pr-patient-field"><span class="pr-field-label">Age</span><span class="pr-field-value">' + (data.patient_age || '—') + '</span></div>' +
                    '</div>';
            } else {
                patientSection.innerHTML = '';
            }
        }

        const symptomsSection = document.getElementById('prSymptomsSection');
        if (symptomsSection) {
            const chips = data.symptoms.map(function (s) {
                return '<span class="pr-symptom-chip">' + s.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + '</span>';
            }).join('');
            symptomsSection.innerHTML = '<div class="pr-section-title">Symptoms Selected (' + data.symptoms.length + ')</div><div class="pr-symptoms-grid">' + chips + '</div>';
        }

        const predsSection = document.getElementById('prPredictionsSection');
        if (predsSection) {
            let pHtml = '<div class="pr-section-title">Prediction Results</div>';
            data.predictions.forEach(function (pred, i) {
                pHtml += '<div class="pr-pred-card' + (i === 0 ? ' pr-pred-top' : '') + '">';
                pHtml += '<div class="pr-pred-header"><strong>' + (i === 0 ? '🏆 ' : '') + pred.disease + '</strong><strong>' + pred.probability + '%</strong></div>';
                pHtml += '</div>';
            });
            predsSection.innerHTML = pHtml;
        }
    }

    function getCookie(name) {
        const val = '; ' + document.cookie;
        const parts = val.split('; ' + name + '=');
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }

    window.runPredictionFromGuided = function (symptoms) {
        runPrediction(symptoms);
    };

    updateUI();
})();
