  // ─── VIEW STATE MACHINE (Pass 2.0.4) ───
  let currentView = null;
  const VALID_VIEWS = ['intro', 'auth', 'guest-session', 'dashboard', 'password-reset'];

  function setView(name) {
    if (!VALID_VIEWS.includes(name)) return;
    if (name === currentView) return;

    const current = currentView ? document.getElementById('view-' + currentView) : null;
    const next = document.getElementById('view-' + name);
    if (!next) return;

    if (current) {
      current.classList.add('is-leaving');
      current.classList.remove('is-visible');
    }

    const transitionDelay = current ? 300 : 0;
    setTimeout(() => {
      if (current) {
        current.style.display = 'none';
        current.classList.remove('is-leaving');
      }
      next.style.display = 'block';
      // Force reflow so transition triggers
      // eslint-disable-next-line no-unused-expressions
      next.offsetHeight;
      next.classList.add('is-visible');
      currentView = name;

      // Acknowledge the user entering the dashboard
      if (name === 'dashboard' && typeof VoidAmbient !== 'undefined') {
        VoidAmbient.pulse();
      }
    }, transitionDelay);
  }

  function hideLoading() {
    const ls = document.getElementById('loadingScreen');
    if (ls) ls.classList.add('hidden');
  }

  // ─── AUTH MESSAGE HELPER (Pass 2.0.4) ───
  function showAuthMessage(msg, type) {
    const el = document.getElementById('authMessage');
    if (!el) return;
    el.textContent = msg;
    el.className = 'auth-message' + (type ? ' ' + type : '');
    el.style.display = 'block';
    // Auto-hide after 6s so stale messages don't linger
    clearTimeout(showAuthMessage._t);
    showAuthMessage._t = setTimeout(() => {
      el.style.display = 'none';
      el.className = 'auth-message';
    }, 6000);
  }

  function showResetMessage(msg, type) {
    const el = document.getElementById('resetMessage');
    if (!el) return;
    el.textContent = msg;
    el.className = 'auth-message' + (type ? ' ' + type : '');
    el.style.display = 'block';
  }

  export { setView, hideLoading, showAuthMessage, showResetMessage, currentView };
