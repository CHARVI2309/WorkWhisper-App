Auth.redirectIfLoggedIn();

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const formError = document.getElementById('form-error');
const togglePassword = document.getElementById('toggle-password');
const demoLoginBtn = document.getElementById('demo-login-btn');
const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = '';
}

function handleLogin(email, password) {
  clearError();
  const result = Auth.login(email, password);

  if (result.success) {
    showToast(result.message);
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 600);
  } else {
    showError(result.message);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  handleLogin(emailInput.value, passwordInput.value);
});

demoLoginBtn.addEventListener('click', () => {
  emailInput.value = Auth.DEMO_USER.email;
  passwordInput.value = Auth.DEMO_USER.password;
  handleLogin(Auth.DEMO_USER.email, Auth.DEMO_USER.password);
});

togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.querySelector('.icon-show').hidden = isPassword;
  togglePassword.querySelector('.icon-hide').hidden = !isPassword;
  togglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

emailInput.focus();
