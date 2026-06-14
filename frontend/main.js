// Shared frontend helpers for A-DAP-T.
// Keep this file boring: page-specific logic should stay inside each page.

window.ADAPT_API_BASE = window.ADAPT_API_BASE || 'https://adapt-3s27.onrender.com';

const ADPT_AUTH_KEY = 'adpt_auth';

function getAuthState() {
  try {
    return JSON.parse(localStorage.getItem(ADPT_AUTH_KEY) || 'null');
  } catch (_) {
    return null;
  }
}

function saveAuthState(auth) {
  localStorage.setItem(ADPT_AUTH_KEY, JSON.stringify(auth));
}

function clearAuthState() {
  localStorage.removeItem(ADPT_AUTH_KEY);
}

function getAuthToken() {
  const auth = getAuthState();
  return auth && auth.idToken ? auth.idToken : null;
}

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiUrl(path) {
  return `${window.ADAPT_API_BASE}${path}`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getAuthToken();

  if (token && options.auth !== false) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl(path), { ...options, headers });
  const text = await response.text();
  const data = safeJsonParse(text) ?? text;

  if (!response.ok) {
    const detail = data && typeof data === 'object' && data.detail ? data.detail : text;
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
  const toggle = document.getElementById('chatbotToggle');
  const container = document.getElementById('chatbotContainer');
  if (!toggle || !container) return;

  toggle.addEventListener('click', () => {
    container.style.display = container.style.display === 'flex' ? 'none' : 'flex';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('ready');
  setupAuthNav();
  setupLenis();
  setupChatbotShell();
});
