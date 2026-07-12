  import { sb } from './lib/supabase.js';
  import { S } from './lib/state.js';
  import './lib/ui.js';                 // cursor + toast (side effects: cursor listeners)
  import { setView, hideLoading, showAuthMessage } from './views/router.js';
  import './views/intro.js';            // intro + guest listeners
  import { readAuthFragment } from './lib/auth.js';
  import { loadData } from './lib/data.js';
  import './views/dashboard.js';        // render + situation listeners
  import './views/overlays.js';         // modal listeners
  import { VoidAmbient } from './engines/void-ambient.js';

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

  // Initialize ambient void field for dashboard.
  // Gated on window load: the engine measures canvas.offsetWidth at init,
  // and module scripts can execute before external CSS is applied — the
  // inline-<style> original never had that race.
  function startAmbient() {
    const cv = document.getElementById('voidAmbientCanvas');
    VoidAmbient.init({
      canvas: cv,
      density: 'medium',
      temperature: 'warm',
      catatons: 0,
      responsive: true,
      // Pass 2.8 — the dashboard's violet-navy (2.5A.4 tokens), passed
      // directly instead of the old CSS hue-rotate workaround. Same
      // luminance/saturation as the engine defaults, hue in the --void family.
      palette: {
        trail:     [11, 14, 30],   /* --void #0b0e1e */
        nebulaIn:  [5, 5, 18],     /* --void-deep #050512 */
        nebulaMid: [5, 8, 20],     /* --nebula-veining #050814 */
        wave:      [25, 35, 88],
        dust:      [8, 13, 35],
        variants: [
          { r: 25, g: 36, b: 77, baseAlpha: 0.55 },
          { r: 15, g: 23, b: 55, baseAlpha: 0.65 },
          { r: 40, g: 50, b: 96, baseAlpha: 0.45 }
        ]
      }
    });
    VoidAmbient.start();
    // If init measured before layout settled (canvas bitmap left at 0),
    // re-trigger the engine's own resize path until it sticks.
    if (cv && cv.width === 0) {
      const retry = setInterval(() => {
        if (cv.offsetWidth > 0) window.dispatchEvent(new Event('resize'));
        if (cv.width > 0) clearInterval(retry);
      }, 200);
      setTimeout(() => clearInterval(retry), 10000);
    }
  }
  if (document.readyState === 'complete') startAmbient();
  else window.addEventListener('load', startAmbient);
