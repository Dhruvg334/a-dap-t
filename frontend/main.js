// Shared frontend helpers for A-DAP-T.
// Keep this file boring: page-specific logic should stay inside each page.

window.ADAPT_API_BASE = window.ADAPT_API_BASE || 'https://adapt-3s27.onrender.com';

const ADPT_AUTH_KEY = 'adpt_auth';
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

function normalizeAuthState(auth) {
  if (!auth) return null;

  if (typeof auth === 'string') {
    return { idToken: auth };
  }

  if (typeof auth !== 'object') return null;

  const normalized = { ...auth };

  // Firebase REST uses both camelCase and snake_case across endpoints.
  normalized.idToken = normalized.idToken || normalized.id_token || normalized.token || normalized.accessToken || null;
  normalized.refreshToken = normalized.refreshToken || normalized.refresh_token || null;
  normalized.uid = normalized.uid || normalized.localId || normalized.user_id || null;

  if (!normalized.expiresAt && normalized.expiresIn) {
    const seconds = Number(normalized.expiresIn);
    if (Number.isFinite(seconds)) {
      normalized.expiresAt = Date.now() + (seconds * 1000);
    }
  }

  return normalized.idToken ? normalized : null;
}

function getAuthState() {
  const raw = localStorage.getItem(ADPT_AUTH_KEY);
  if (!raw) return null;

  try {
    return normalizeAuthState(JSON.parse(raw));
  } catch (_) {
    // Older builds sometimes stored only the token string.
    return normalizeAuthState(raw);
  }
}

function saveAuthState(auth) {
  const normalized = normalizeAuthState(auth);
  if (!normalized) return;
  localStorage.setItem(ADPT_AUTH_KEY, JSON.stringify(normalized));
}

function clearAuthState() {
  localStorage.removeItem(ADPT_AUTH_KEY);
}

function getAuthToken() {
  const auth = getAuthState();
  return auth && auth.idToken ? auth.idToken : null;
}

function tokenNeedsRefresh(auth) {
  if (!auth || !auth.idToken) return true;
  if (!auth.expiresAt) return false;
  return Date.now() >= (Number(auth.expiresAt) - TOKEN_REFRESH_MARGIN_MS);
}

async function refreshAuthToken(auth = getAuthState()) {
  if (!auth || !auth.refreshToken) return null;

  const response = await fetch(`${window.ADAPT_API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: auth.refreshToken })
  });

  const text = await response.text();
  const data = safeJsonParse(text) ?? {};

  if (!response.ok) {
    clearAuthState();
    throw new Error((data && data.detail) || 'Session refresh failed. Please sign in again.');
  }

  const nextAuth = normalizeAuthState({
    ...auth,
    ...data,
    email: auth.email || data.email,
    displayName: auth.displayName || data.displayName,
    uid: auth.uid || data.localId || data.user_id
  });

  if (!nextAuth) {
    clearAuthState();
    throw new Error('Session refresh failed. Please sign in again.');
  }

  saveAuthState(nextAuth);
  return nextAuth.idToken;
}

async function getValidAuthToken() {
  const auth = getAuthState();
  if (!auth || !auth.idToken) return null;

  if (!tokenNeedsRefresh(auth)) {
    return auth.idToken;
  }

  return refreshAuthToken(auth);
}

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authHeadersAsync() {
  const token = await getValidAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiUrl(path) {
  return `${window.ADAPT_API_BASE}${path}`;
}

function isLoggedIn() {
  return !!getAuthToken();
}

function signInPathForCurrentPage() {
  return window.location.pathname.includes('/pages/') ? '../signin.html' : 'signin.html';
}

function signUpPathForCurrentPage() {
  return window.location.pathname.includes('/pages/') ? '../signup.html' : 'signup.html';
}

function isProtectedPage() {
  const path = window.location.pathname.toLowerCase();
  return (
    path.endsWith('/profile.html') ||
    path.endsWith('/pages/scanner.html') ||
    path.endsWith('/pages/report.html') ||
    path.endsWith('/pages/dashboard.html')
  );
}

function currentRelativePath() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function redirectToSignIn(message = '') {
  const next = encodeURIComponent(currentRelativePath());
  const msg = message ? `&message=${encodeURIComponent(message)}` : '';
  window.location.href = `${signInPathForCurrentPage()}?next=${next}${msg}`;
}

function requireAuthForProtectedPage() {
  if (!isProtectedPage()) return;
  if (isLoggedIn()) return;

  const next = encodeURIComponent(currentRelativePath());
  window.location.href = `${signUpPathForCurrentPage()}?next=${next}`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function isAuthFailure(response, detail) {
  if (response.status === 401 || response.status === 403) return true;
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail || {});
  return /invalid|expired|authentication|required|unauthorized/i.test(text);
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.auth !== false) {
    try {
      const token = await getValidAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      if (isProtectedPage()) {
        redirectToSignIn('Your session expired. Please sign in again.');
        return;
      }
      throw error;
    }
  }

  const response = await fetch(apiUrl(path), { ...options, headers });
  const text = await response.text();
  const data = safeJsonParse(text) ?? text;

  if (!response.ok) {
    const detail = data && typeof data === 'object' && data.detail ? data.detail : text;

    if (isAuthFailure(response, detail)) {
      clearAuthState();
      if (isProtectedPage()) {
        redirectToSignIn('Your session expired. Please sign in again.');
        return;
      }
    }

    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return data;
}

function setFormMessage(id, message, type = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || '';
  el.className = `form-msg ${type}`.trim();
}

function setupAuthNav() {
  const auth = getAuthState();
  const guestEls = document.querySelectorAll('[data-auth="guest"]');
  const userEls = document.querySelectorAll('[data-auth="user"]');
  const emailEls = document.querySelectorAll('[data-user-email]');

  guestEls.forEach(el => el.classList.toggle('auth-hidden', !!auth));
  userEls.forEach(el => el.classList.toggle('auth-hidden', !auth));
  emailEls.forEach(el => {
    el.textContent = auth && auth.email ? auth.email : '';
  });

  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      clearAuthState();
      window.location.href = btn.getAttribute('data-logout-redirect') || 'index.html';
    });
  });
}

function setupLenis() {
  if (window.__adptLenisLoaded) return;
  window.__adptLenisLoaded = true;

  const lenisScript = document.createElement('script');
  lenisScript.src = 'https://unpkg.com/@studio-freight/lenis@1.0.42/bundled/lenis.min.js';

  lenisScript.onload = () => {
    if (typeof Lenis === 'undefined') return;
    const lenis = new Lenis({
      duration: 3.2,
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
  };

  document.head.appendChild(lenisScript);
}

function setupChatbotShell() {
  if (!isProtectedPage() || !isLoggedIn()) return;

  let toggle = document.getElementById('chatbotToggle');
  let container = document.getElementById('chatbotContainer');

  if (!toggle || !container) {
    const shell = document.createElement('div');
    shell.className = 'dap-chat-shell';
    shell.innerHTML = `
      <button id="chatbotToggle" class="dap-chat-toggle" type="button" aria-label="Open DAP assistant">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="6" y="8" width="12" height="9" rx="3"></rect>
          <path d="M12 8V5"></path>
          <circle cx="9.5" cy="12.5" r="1"></circle>
          <circle cx="14.5" cy="12.5" r="1"></circle>
          <path d="M9 17v2h6v-2"></path>
        </svg>
      </button>
      <section id="chatbotContainer" class="dap-chat-container" aria-label="DAP assistant">
        <div class="dap-chat-head">
          <div>
            <strong>DAP</strong>
            <span>Report assistant</span>
          </div>
          <button type="button" id="dapChatClose" aria-label="Close assistant">×</button>
        </div>
        <div id="dapChatMessages" class="dap-chat-messages">
          <div class="dap-msg dap-msg-bot">Ask me about the current scan report, highest risks, or what to fix first.</div>
        </div>
        <form id="dapChatForm" class="dap-chat-form">
          <input id="dapChatInput" type="text" autocomplete="off" placeholder="Ask about this report...">
          <button type="submit">SEND</button>
        </form>
      </section>
    `;
    document.body.appendChild(shell);

    toggle = document.getElementById('chatbotToggle');
    container = document.getElementById('chatbotContainer');
  }

  const closeBtn = document.getElementById('dapChatClose');
  const form = document.getElementById('dapChatForm');
  const input = document.getElementById('dapChatInput');
  const messages = document.getElementById('dapChatMessages');

  function addMessage(text, type) {
    const msg = document.createElement('div');
    msg.className = `dap-msg dap-msg-${type}`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  toggle.addEventListener('click', () => {
    container.style.display = container.style.display === 'flex' ? 'none' : 'flex';
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      container.style.display = 'none';
    });
  }

  if (form && input && messages) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const question = input.value.trim();
      if (!question) return;

      const rawReport = sessionStorage.getItem('adpt_result');
      if (!rawReport) {
        addMessage('Run a scan or open a saved report first so I can answer from real findings.', 'bot');
        return;
      }

      let scanResult;
      try {
        scanResult = JSON.parse(rawReport);
      } catch (_) {
        addMessage('I could not read the current report. Please run the scan again.', 'bot');
        return;
      }

      input.value = '';
      addMessage(question, 'user');
      const pending = addMessage('Thinking...', 'bot');

      try {
        const data = await apiFetch('/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            scan_result: scanResult
          })
        });

        pending.textContent = data.answer || 'DAP could not generate an answer.';
      } catch (error) {
        pending.textContent = error.message || 'DAP is unavailable right now.';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuthForProtectedPage();
  document.body.classList.add('ready');
  setupAuthNav();
  setupLenis();
  setupChatbotShell();
});
