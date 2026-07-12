  import { sb } from './lib/supabase.js';
  import { S } from './lib/state.js';
  import './lib/ui.js';                 // cursor + toast (side effects: cursor listeners)
  import { setView, hideLoading, showAuthMessage } from './views/router.js';
  import './views/intro.js';            // intro + guest listeners
  import { readAuthFragment } from './lib/auth.js';
  import { loadData } from './lib/data.js';
  import './views/dashboard.js';        // render + situation listeners
  import './views/overlays.js';         // modal listeners

  // ─── SERVICE WORKER ───
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // ─── BOOT (Pass 2.0.4) ───
  async function boot() {
    // If we're returning from a magic link, soften the loader text
    const loaderText = document.getElementById('loaderText');
    if (loaderText && /access_token=|type=magiclink|type=recovery/.test(window.location.hash)) {
      loaderText.textContent = 'Entering…';
    }

    // Capture fragment intent before we clear it
    const fragment = readAuthFragment();

    // Wait for Supabase to settle whatever was in the URL hash
    const { data: { session } } = await sb.auth.getSession();

    // Clear the fragment so refresh doesn't replay it
    if (window.location.hash && window.location.hash.length > 1) {
      try { history.replaceState(null, '', '/app.html'); } catch (e) { /* ignore */ }
    }

    hideLoading();

    // Route by fragment intent first
    if (fragment?.kind === 'error') {
      setView('auth');
      setTimeout(() => showAuthMessage(fragment.message, 'error'), 350);
      return;
    }
    if (fragment?.kind === 'recovery') {
      setView('password-reset');
      return;
    }

    // Default routing
    if (session?.user) {
      S.currentUser = session.user;
      await loadData();
      setView('dashboard');
    } else {
      setView('intro');
    }
  }

  boot().catch(function(err) {
    // A network failure during getSession must never strand the loader.
    console.error('boot failed', err);
    hideLoading();
    setView('auth');
    setTimeout(function() {
      showAuthMessage('Could not reach the void. Check your connection and refresh.', 'error');
    }, 350);
  });
