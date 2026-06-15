/* ===== PASSWORD VISIBILITY TOGGLES ===== */
document.querySelectorAll('.eye-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var input = document.getElementById(btn.dataset.target);
        if (!input) return;
        var willShow = input.type === 'password';
        input.type = willShow ? 'text' : 'password';
        btn.classList.toggle('is-visible', willShow);
        btn.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
    });
});

/* ===== REGISTER PAGE ===== */
var password = document.getElementById('password');
var confirmPassword = document.getElementById('confirm_password');
var checklist = document.getElementById('pwChecklist');
var confirmMsg = document.getElementById('confirmMsg');

var rules = {
    length:  function(pw) { return pw.length >= 8; },
    upper:   function(pw) { return /[A-Z]/.test(pw); },
    number:  function(pw) { return /[0-9]/.test(pw); },
    special: function(pw) { return /[^A-Za-z0-9]/.test(pw); }
};

function updateChecklist() {
    if (!checklist || !password) return;
    var pw = password.value;
    Object.keys(rules).forEach(function(key) {
        var li = checklist.querySelector('[data-rule="' + key + '"]');
        if (li) li.classList.toggle('met', rules[key](pw));
    });
}

function updateConfirmMsg() {
    if (!confirmMsg || !confirmPassword || !password) return;
    if (!confirmPassword.value) {
        confirmMsg.textContent = '';
        confirmMsg.className = 'field-msg';
        return;
    }
    var matches = confirmPassword.value === password.value;
    confirmMsg.textContent = matches ? '✓ Passwords match.' : '✗ Passwords do not match.';
    confirmMsg.className = 'field-msg ' + (matches ? 'ok' : 'err');
}

if (password) {
    password.addEventListener('input', function() {
        updateChecklist();
        updateConfirmMsg();
    });
}
if (confirmPassword) {
    confirmPassword.addEventListener('input', updateConfirmMsg);
}
