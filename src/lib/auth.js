import { sb } from './supabase.js';
import { S } from './state.js';
import { loadData } from './data.js';
import { setView, showAuthMessage, showResetMessage, currentView } from '../views/router.js';
import { render } from '../views/dashboard.js';

  // ─── AUTH HANDLERS (Pass 2.0.4) ───
  const REDIRECT_URL = 'https://catatonica.app/app.html';

  // ─── TURNSTILE (Pass 2.6) ───
  // interaction-only: invisible unless Cloudflare decides a challenge is needed.
  // Tokens are single-use — reset after every auth attempt. If the script fails
  // to load, captchaOptions() returns {} and auth proceeds (Supabase only
  // enforces tokens once CAPTCHA is switched on in its dashboard).
  const TURNSTILE_SITEKEY = '0x4AAAAAADzPcphoZSk0eML9';
  let turnstileWidgetId = null;
  window.onTurnstileReady = () => {
    const el = document.getElementById('authTurnstile');
    if (!el || turnstileWidgetId !== null) return;
    turnstileWidgetId = turnstile.render(el, {
      sitekey: TURNSTILE_SITEKEY,
      theme: 'dark',
      appearance: 'interaction-only'
    });
  };
  function captchaToken() {
    return (window.turnstile && turnstileWidgetId !== null)
      ? (turnstile.getResponse(turnstileWidgetId) || '') : '';
  }
  function captchaReset() {
    if (window.turnstile && turnstileWidgetId !== null) {
      try { turnstile.reset(turnstileWidgetId); } catch (e) { /* widget mid-cycle */ }
    }
  }
  // Wait for a token at click time instead of grabbing whatever exists.
  // Covers: script still loading, widget mid-challenge, and expired tokens
  // (single-use, ~5 min lifetime) after the page sat open.
  async function ensureCaptcha() {
    let t = captchaToken();
    if (t) return { captchaToken: t };
    captchaReset(); // kick a fresh run if the last token expired or was consumed
    const deadline = Date.now() + 8000;
    while (!t && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 250));
      t = captchaToken();
    }
    return t ? { captchaToken: t } : {};
  }

  async function handleSignIn() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSignInBtn');
    if (!email || !password) return showAuthMessage('Email and password required.', 'error');

    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'One moment…';

    const { error } = await sb.auth.signInWithPassword({ email, password, options: await ensureCaptcha() });
    captchaReset();
    btn.disabled = false;
    btn.textContent = orig;
    if (error) return showAuthMessage(error.message, 'error');
    // onAuthStateChange routes to dashboard
  }

  async function handleSignUp() {
    const email = document.getElementById('authSignUpEmail').value.trim();
    const password = document.getElementById('authSignUpPassword').value;
    const btn = document.getElementById('authSignUpBtn');
    if (!email || !password) return showAuthMessage('Email and password required.', 'error');
    if (password.length < 8) return showAuthMessage('Password must be at least 8 characters.', 'error');

    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'One moment…';

    const { error } = await sb.auth.signUp({
      email, password,
      options: { emailRedirectTo: REDIRECT_URL, ...(await ensureCaptcha()) }
    });
    captchaReset();
    btn.disabled = false;
    btn.textContent = orig;
    if (error) return showAuthMessage(error.message, 'error');
    showAuthMessage('Account created. Check your email to verify.', 'success');
  }

  async function handleMagicLink() {
    const email = document.getElementById('authEmail').value.trim();
    if (!email) return showAuthMessage('Enter your email first.', 'error');

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: REDIRECT_URL, ...(await ensureCaptcha()) }
    });
    captchaReset();
    if (error) return showAuthMessage(error.message, 'error');
    showAuthMessage('Check your email for the link.', 'success');
  }

  async function handleForgotPassword() {
    const email = document.getElementById('authEmail').value.trim();
    if (!email) return showAuthMessage('Enter your email first.', 'error');

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: REDIRECT_URL,
      ...(await ensureCaptcha())
    });
    captchaReset();
    if (error) return showAuthMessage(error.message, 'error');
    showAuthMessage('Check your email for a password reset link.', 'success');
  }

  async function handleGoogleSignIn() {
    const btn = document.getElementById('authGoogleBtn');
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = 'Redirecting…';
    // signInWithOAuth navigates the browser to Google on success — it does
    // not resolve normally. An error here means it failed BEFORE redirect
    // (misconfigured provider, network down), so it is always safe to
    // re-enable the button in that case.
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL }
    });
    if (error) {
      btn.disabled = false;
      btn.innerHTML = orig;
      showAuthMessage(error.message, 'error');
    }
  }

  document.getElementById('authGoogleBtn').addEventListener('click', handleGoogleSignIn);
  document.getElementById('authSignInBtn').addEventListener('click', handleSignIn);
  document.getElementById('authMagicLinkBtn').addEventListener('click', handleMagicLink);
  document.getElementById('authForgotBtn').addEventListener('click', handleForgotPassword);
  document.getElementById('authSignUpBtn').addEventListener('click', handleSignUp);

  // Sign-in / sign-up form toggle
  document.getElementById('authShowSignUpBtn').addEventListener('click', () => {
    document.getElementById('authFormSignIn').style.display = 'none';
    document.getElementById('authFormSignUp').style.display = 'block';
  });
  document.getElementById('authShowSignInBtn').addEventListener('click', () => {
    document.getElementById('authFormSignIn').style.display = 'block';
    document.getElementById('authFormSignUp').style.display = 'none';
  });

  // Enter-key wiring on the sign-in form
  document.getElementById('authEmail').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('authPassword').focus(); }
  });
  document.getElementById('authPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleSignIn(); }
  });
  document.getElementById('authSignUpPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleSignUp(); }
  });

  // ─── PASSWORD RESET HANDLER (Pass 2.0.4) ───
  document.getElementById('resetSubmitBtn').addEventListener('click', async () => {
    const newPwd = document.getElementById('resetNewPassword').value;
    if (!newPwd || newPwd.length < 8) return showResetMessage('Password must be at least 8 characters.', 'error');

    const btn = document.getElementById('resetSubmitBtn');
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'One moment…';

    const { error } = await sb.auth.updateUser({ password: newPwd });
    btn.disabled = false;
    btn.textContent = orig;
    if (error) return showResetMessage(error.message, 'error');

    // Recovery token already authenticated the user; load data and route to dashboard
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      S.currentUser = user;
      await loadData();
    }
    setView('dashboard');
  });
  document.getElementById('resetNewPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('resetSubmitBtn').click(); }
  });

  // ─── URL FRAGMENT AUTH HANDLER (Pass 2.0.4) ───
  // Supabase's detectSessionInUrl reads the hash on client init; we read it here for
  // routing intent (recovery vs error vs successful sign-in), then clear it so it
  // doesn't reappear on refresh.
  function readAuthFragment() {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return null;
    const params = new URLSearchParams(hash.substring(1));
    const error = params.get('error');
    if (error) {
      const desc = (params.get('error_description') || 'Link expired or invalid.').replace(/\+/g, ' ');
      return { kind: 'error', message: desc };
    }
    const type = params.get('type');
    if (type === 'recovery') return { kind: 'recovery' };
    if (params.get('access_token')) return { kind: 'signed-in' };
    return null;
  }

  // ─── AUTH STATE LISTENER (Pass 2.0.4) ───
  // Boot handles the initial routing decision. After boot, this listener handles
  // sign-in / sign-out / recovery transitions triggered after the first paint.
  sb.auth.onAuthStateChange(async (event, session) => {
    if (currentView === null) return; // boot owns the first transition

    if (event === 'PASSWORD_RECOVERY') {
      setView('password-reset');
      return;
    }

    if (event === 'SIGNED_IN' && session) {
      S.currentUser = session.user;
      if (currentView !== 'dashboard' && currentView !== 'password-reset') {
        await loadData();
        setView('dashboard');
      }
      return;
    }

    if (event === 'SIGNED_OUT') {
      S.currentUser = null;
      S.situations = [];
      S.archive = [];
      S.profile = {};
      setView('auth');
    }
  });

  // ─── SIGN OUT ───
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    await sb.auth.signOut();
    // The auth state listener handles the rest, but we route immediately for snappiness
    S.currentUser = null; S.situations = []; S.archive = []; S.profile = {};
    setView('auth');
  });

  export { readAuthFragment };
