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

const signinForm = document.getElementById('signinForm');

signinForm.addEventListener('submit', async event => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const submitBtn = signinForm.querySelector('button[type="submit"]');

  setFormMessage('signin-message', 'Signing in...', '');
  submitBtn.disabled = true;

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    saveAuthState({
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      email: data.email || email,
      displayName: data.displayName || data.display_name || '',
      localId: data.localId || data.uid || '',
      expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000,
    });

    setFormMessage('signin-message', 'Signed in. Redirecting...', 'ok');
    window.location.href = 'profile.html';
  } catch (err) {
    setFormMessage('signin-message', err.message || 'Could not sign in.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});
