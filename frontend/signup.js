function wirePasswordToggle(buttonId, inputId) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!button || !input) return;

  button.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.textContent = showing ? '👁' : '🙈';
  });
}

wirePasswordToggle('togglePassword', 'password');
wirePasswordToggle('toggleConfirmPassword', 'confirmPassword');

const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async event => {
  event.preventDefault();

  const displayName = document.getElementById('displayName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const submitBtn = signupForm.querySelector('button[type="submit"]');

  if (password !== confirmPassword) {
    setFormMessage('signup-message', 'Passwords do not match.', 'error');
    return;
  }

  setFormMessage('signup-message', 'Creating account...', '');
  submitBtn.disabled = true;

  try {
    await apiFetch('/auth/signup', {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: displayName }),
    });

    const loginData = await apiFetch('/auth/login', {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    saveAuthState({
      idToken: loginData.idToken,
      refreshToken: loginData.refreshToken,
      email: loginData.email || email,
      displayName: loginData.displayName || displayName,
      localId: loginData.localId || loginData.uid || '',
      expiresAt: Date.now() + Number(loginData.expiresIn || 3600) * 1000,
    });

    setFormMessage('signup-message', 'Account created. Redirecting...', 'ok');
    window.location.href = 'profile.html';
  } catch (err) {
    setFormMessage('signup-message', err.message || 'Could not create account.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});
