// ---------- password visibility toggles ----------

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

// ---------- helpers ----------

function showStatus(form, message, kind) {
  var el = form.querySelector('.status-msg');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('ok', 'err');
  el.classList.add('show', kind);
}

function formatDob(value) {
  if (!value) return '\u2014';
  var d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------- registration page ----------

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
  var cardPhoto = document.getElementById('cardPhoto');

  function updateCard() {
    var first = firstName.value.trim();
    var middle = middleName.value.trim();
    var last = lastName.value.trim();

    var nameParts = [first, middle ? middle.charAt(0).toUpperCase() + '.' : '', last].filter(Boolean);
    cardName.textContent = nameParts.length ? nameParts.join(' ') : 'Your name';

    cardUsername.textContent = username.value.trim() ? '@' + username.value.trim() : '@username';
    cardDob.textContent = formatDob(dob.value);

    var initials = (first.charAt(0) + last.charAt(0)).toUpperCase().trim();
    cardPhoto.textContent = initials || '\u2726';
  }

  [firstName, middleName, lastName, username, dob].forEach(function (field) {
    field.addEventListener('input', updateCard);
  });

  // password rules

  var password = document.getElementById('password');
  var confirmPassword = document.getElementById('confirmPassword');
  var checklist = document.getElementById('pwChecklist');
  var confirmMsg = document.getElementById('confirmMsg');

  var rules = {
    length: function (pw) { return pw.length >= 8; },
    upper: function (pw) { return /[A-Z]/.test(pw); },
    number: function (pw) { return /[0-9]/.test(pw); },
    special: function (pw) { return /[^A-Za-z0-9]/.test(pw); }
  };

  function passwordMeetsRules(pw) {
    return Object.keys(rules).every(function (key) { return rules[key](pw); });
  }

  function updateChecklist() {
    var pw = password.value;
    Object.keys(rules).forEach(function (key) {
      var li = checklist.querySelector('[data-rule="' + key + '"]');
      if (li) li.classList.toggle('met', rules[key](pw));
    });
  }

  function updateConfirmMsg() {
    if (!confirmPassword.value) {
      confirmMsg.textContent = '';
      confirmMsg.classList.remove('ok', 'err');
      return;
    }
    var matches = confirmPassword.value === password.value;
    confirmMsg.textContent = matches ? 'Passwords match.' : 'Passwords do not match.';
    confirmMsg.classList.toggle('ok', matches);
    confirmMsg.classList.toggle('err', !matches);
  }

  password.addEventListener('input', function () {
    updateChecklist();
    updateConfirmMsg();
  });
  confirmPassword.addEventListener('input', updateConfirmMsg);

  registerForm.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!passwordMeetsRules(password.value)) {
      showStatus(registerForm, 'Your password does not meet all the requirements above.', 'err');
      password.focus();
      return;
    }

    if (password.value !== confirmPassword.value) {
      showStatus(registerForm, 'Password and confirm password do not match.', 'err');
      confirmPassword.focus();
      return;
    }

    showStatus(registerForm, 'Account created. You can now sign in.', 'ok');
  });

  updateCard();
}

// ---------- login page ----------

var loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    showStatus(loginForm, 'Signed in successfully.', 'ok');
  });
}