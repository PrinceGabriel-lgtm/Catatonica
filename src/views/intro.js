import { setView, showAuthMessage } from './router.js';

  // ─── INTRO HANDLERS (Pass 2.0.4) ───
  document.getElementById('introReadyBtn').addEventListener('click', () => setView('auth'));
  document.getElementById('introSkipBtn').addEventListener('click', () => setView('guest-session'));

  // ─── GUEST SESSION HANDLERS (Pass 2.0.4 — stub) ───
  document.querySelectorAll('.guest-duration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setView('auth');
      // Defer message until view-auth is in the DOM and visible
      setTimeout(() => {
        showAuthMessage('Guest taste sessions are coming soon. Sign up below to begin.', 'success');
      }, 350);
    });
  });
  document.getElementById('guestBackBtn').addEventListener('click', () => setView('auth'));
