// ==========================================================================
// CocoFiber. Admin — Login page logic
// Menggunakan Supabase Auth (bukan lagi mode demo hardcode).
// ==========================================================================
(function () {
  var form = document.getElementById('adminLoginForm');
  var submitBtn = document.getElementById('submitBtn');
  var alertBox = document.getElementById('loginAlert');
  var alertText = document.getElementById('loginAlertText');
  var toggleBtn = document.getElementById('togglePassword');
  var passwordInput = document.getElementById('password');
  var eyeIcon = document.getElementById('eyeIcon');

  var DASHBOARD_URL = './dashboard.html';

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

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideAlert();

    var email = document.getElementById('username').value.trim();
    var password = passwordInput.value;

    if (!email || !password) {
      showAlert('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);

    var result = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (result.error) {
      var msg = 'Email atau password salah. Silakan coba lagi.';
      if (result.error.message && result.error.message.indexOf('Invalid login') === -1) {
        msg = result.error.message;
      }
      showAlert(msg);
      setLoading(false);
      return;
    }

    // Supabase otomatis menyimpan session (termasuk refresh token) di localStorage
    // lewat SDK-nya sendiri, jadi kita tidak perlu simpan token manual lagi.
    window.location.href = DASHBOARD_URL;
  });
})();
