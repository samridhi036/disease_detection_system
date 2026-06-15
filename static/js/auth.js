document.querySelectorAll('.eye-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        var input = document.getElementById(btn.dataset.target);
        if (!input) return;
        var willShow = input.type === 'password';
        input.type = willShow ? 'text' : 'password';
        btn.classList.toggle('is-visible', willShow);
        btn.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
    });
});

var registerForm = document.getElementById('registerForm');

if (registerForm) {
    var firstName = document.getElementById('firstName');
    var middleName = document.getElementById('middleName');
    var lastName = document.getElementById('lastName');
    var username = document.getElementById('username');
    var dob = document.getElementById('dob');

    var cardName = document.getElementById('cardName');
    var cardUsername = document.getElementById('cardUsername');
    var cardDob = document.getElementById('cardDob');

    function formatDob(value) {
        if (!value) return '\u2014';
        var d = new Date(value + 'T00:00:00');
        if (isNaN(d.getTime())) return '\u2014';
        return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function updateCard() {
        if (cardName) {
            var first = firstName ? firstName.value.trim() : '';
            var middle = middleName ? middleName.value.trim() : '';
            var last = lastName ? lastName.value.trim() : '';
            var fullName = [first, middle, last].filter(Boolean).join(' ');
            cardName.textContent = fullName || 'Your name';
        }
        if (cardUsername) {
            var uname = username ? username.value.trim() : '';
            cardUsername.textContent = uname ? '@' + uname : '@username';
        }
        if (cardDob) {
            cardDob.textContent = dob ? formatDob(dob.value) : '\u2014';
        }
    }

    [firstName, middleName, lastName].forEach(function (el) {
        if (el) el.addEventListener('input', updateCard);
    });
    if (username) username.addEventListener('input', updateCard);
    if (dob) dob.addEventListener('input', updateCard);

    var password = document.getElementById('password');
    var confirmPassword = document.getElementById('confirmPassword');
    var confirmMsg = document.getElementById('confirmMsg');
    var pwChecklist = document.getElementById('pwChecklist');

    function checkPassword(val) {
        if (!pwChecklist) return;
        var rules = {
            length: val.length >= 8,
            upper: /[A-Z]/.test(val),
            number: /[0-9]/.test(val),
            special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(val)
        };
        pwChecklist.querySelectorAll('li').forEach(function (li) {
            var rule = li.dataset.rule;
            li.classList.toggle('ok', !!rules[rule]);
        });
    }

    if (password) {
        password.addEventListener('input', function () {
            checkPassword(this.value);
            checkConfirm();
        });
    }

    function checkConfirm() {
        if (!confirmMsg || !password || !confirmPassword) return;
        if (!confirmPassword.value) { confirmMsg.textContent = ''; return; }
        if (password.value === confirmPassword.value) {
            confirmMsg.textContent = '✓ Passwords match';
            confirmMsg.style.color = '#16a34a';
        } else {
            confirmMsg.textContent = '✗ Passwords do not match';
            confirmMsg.style.color = '#dc2626';
        }
    }

    if (confirmPassword) confirmPassword.addEventListener('input', checkConfirm);
}
