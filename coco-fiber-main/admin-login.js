// ==========================================================================
// CocoFiber. Admin — Login page logic
// Menggunakan Supabase Auth + lapisan keamanan tambahan di sisi klien:
//   1. Rate limiting / lockout setelah beberapa kali gagal login
//   2. Honeypot field untuk mempersulit bot pengisi form otomatis
//   3. Peringatan Caps Lock aktif
// Catatan: keamanan sesungguhnya tetap ditegakkan oleh Supabase Auth &
// Row Level Security di server. Lapisan di sini adalah pertahanan tambahan
// (defense in depth) dan pencegah brute force yang kasar di sisi klien.
// ==========================================================================
(function () {
  var form = document.getElementById('adminLoginForm');
  var submitBtn = document.getElementById('submitBtn');
  var alertBox = document.getElementById('loginAlert');
  var alertText = document.getElementById('loginAlertText');
  var lockoutAlert = document.getElementById('lockoutAlert');
  var lockoutAlertText = document.getElementById('lockoutAlertText');
  var attemptsLeftEl = document.getElementById('attemptsLeft');
  var toggleBtn = document.getElementById('togglePassword');
  var passwordInput = document.getElementById('password');
  var usernameInput = document.getElementById('username');
  var honeypotInput = document.getElementById('website');
  var eyeIcon = document.getElementById('eyeIcon');
  var capslockWarning = document.getElementById('capslockWarning');

  var DASHBOARD_URL = './dashboard.html';

  // ---------- Brute-force protection config ----------
  var MAX_ATTEMPTS = 5;
  var LOCKOUT_MS = 60 * 1000;        // 60 detik setelah percobaan ke-5 gagal
  var ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // hitungan direset setelah 10 menit tanpa percobaan
  var STORAGE_KEY = 'cf_admin_login_guard';

  function loadGuard() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { attempts: 0, lastAttempt: 0, lockUntil: 0 };
      var parsed = JSON.parse(raw);
      return {
        attempts: parsed.attempts || 0,
        lastAttempt: parsed.lastAttempt || 0,
        lockUntil: parsed.lockUntil || 0
      };
    } catch (e) {
      return { attempts: 0, lastAttempt: 0, lockUntil: 0 };
    }
  }
  function saveGuard(guard) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(guard)); } catch (e) {}
  }

  var guard = loadGuard();
  var countdownTimer = null;

  function formatCountdown(ms) {
    var s = Math.ceil(ms / 1000);
    return s + ' detik';
  }

  function showLockout(remainingMs) {
    form.querySelectorAll('input, button').forEach(function (el) { el.disabled = true; });
    lockoutAlert.classList.add('show');
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function () {
      var now = Date.now();
      var left = guard.lockUntil - now;
      if (left <= 0) {
        clearInterval(countdownTimer);
        endLockout();
        return;
      }
      lockoutAlertText.textContent = 'Terlalu banyak percobaan gagal. Coba lagi dalam ' + formatCountdown(left) + '.';
    }, 250);
    lockoutAlertText.textContent = 'Terlalu banyak percobaan gagal. Coba lagi dalam ' + formatCountdown(remainingMs) + '.';
  }

  function endLockout() {
    form.querySelectorAll('input, button').forEach(function (el) { el.disabled = false; });
    lockoutAlert.classList.remove('show');
    guard.attempts = 0;
    guard.lockUntil = 0;
    saveGuard(guard);
    updateAttemptsLeftLabel();
  }

  function updateAttemptsLeftLabel() {
    if (!attemptsLeftEl) return;
    var remaining = MAX_ATTEMPTS - guard.attempts;
    if (guard.attempts > 0 && remaining > 0 && remaining <= 3) {
      attemptsLeftEl.textContent = 'Percobaan tersisa: ' + remaining;
    } else {
      attemptsLeftEl.textContent = '';
    }
  }

  function checkLockoutOnLoad() {
    var now = Date.now();
    // Reset hitungan kalau sudah lama tidak ada percobaan gagal.
    if (guard.lastAttempt && now - guard.lastAttempt > ATTEMPT_WINDOW_MS && now >= guard.lockUntil) {
      guard.attempts = 0;
      guard.lockUntil = 0;
      saveGuard(guard);
    }
    if (guard.lockUntil && now < guard.lockUntil) {
      showLockout(guard.lockUntil - now);
    } else {
      updateAttemptsLeftLabel();
    }
  }

  function registerFailedAttempt() {
    var now = Date.now();
    guard.attempts += 1;
    guard.lastAttempt = now;
    if (guard.attempts >= MAX_ATTEMPTS) {
      guard.lockUntil = now + LOCKOUT_MS;
      saveGuard(guard);
      showLockout(LOCKOUT_MS);
    } else {
      saveGuard(guard);
      updateAttemptsLeftLabel();
    }
  }

  function registerSuccess() {
    guard = { attempts: 0, lastAttempt: 0, lockUntil: 0 };
    saveGuard(guard);
  }

  var EYE_OPEN =
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  var EYE_CLOSED =
    '<path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.4 21.4 0 015.06-6.06M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a21.4 21.4 0 01-2.68 3.9M14.12 14.12a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

  toggleBtn.addEventListener('click', function () {
    var isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleBtn.setAttribute('aria-label', isPassword ? 'Sembunyikan password' : 'Tampilkan password');
    eyeIcon.innerHTML = isPassword ? EYE_CLOSED : EYE_OPEN;
  });

  // ---------- Caps Lock warning ----------
  function handleCapsLock(e) {
    if (typeof e.getModifierState === 'function') {
      capslockWarning.classList.toggle('show', e.getModifierState('CapsLock'));
    }
  }
  passwordInput.addEventListener('keyup', handleCapsLock);
  passwordInput.addEventListener('keydown', handleCapsLock);
  passwordInput.addEventListener('blur', function () { capslockWarning.classList.remove('show'); });

  function showAlert(message) {
    alertText.textContent = message;
    alertBox.classList.add('show');
  }
  function hideAlert() {
    alertBox.classList.remove('show');
  }
  function setLoading(isLoading) {
    submitBtn.classList.toggle('loading', isLoading);
    submitBtn.disabled = isLoading;
  }

  // Kalau sudah login (masih ada session valid), langsung lempar ke dashboard
  supabaseClient.auth.getSession().then(function (res) {
    if (res.data.session) {
      window.location.href = DASHBOARD_URL;
    }
  });

  checkLockoutOnLoad();

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideAlert();

    var now = Date.now();
    if (guard.lockUntil && now < guard.lockUntil) {
      showLockout(guard.lockUntil - now);
      return;
    }

    // Honeypot: kalau bidang tersembunyi ini terisi, kemungkinan besar bot.
    // Tolak diam-diam dengan pesan generik tanpa memanggil Supabase sama sekali.
    if (honeypotInput && honeypotInput.value) {
      showAlert('Email atau password salah. Silakan coba lagi.');
      return;
    }

    var email = usernameInput.value.trim();
    var password = passwordInput.value;

    if (!email || !password) {
      showAlert('Email dan password wajib diisi.');
      return;
    }
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showAlert('Format email tidak valid.');
      return;
    }

    setLoading(true);

    var result = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (result.error) {
      registerFailedAttempt();
      var msg = 'Email atau password salah. Silakan coba lagi.';
      if (result.error.message && result.error.message.indexOf('Invalid login') === -1) {
        msg = result.error.message;
      }
      showAlert(msg);
      setLoading(false);
      return;
    }

    registerSuccess();

    // Supabase otomatis menyimpan session (termasuk refresh token) di localStorage
    // lewat SDK-nya sendiri, jadi kita tidak perlu simpan token manual lagi.
    window.location.href = DASHBOARD_URL;
  });
})();
