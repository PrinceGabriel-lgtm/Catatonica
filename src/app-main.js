  import { S } from './lib/state.js';

  // ─── SUPABASE ───
  const { createClient } = supabase;
  const sb = createClient(
    'https://azqlxjvlxttztjzjvryt.supabase.co',
    'sb_publishable_j0rnqo9byK5ep3UlrGgQDg_4nnm9Pv4'
  );

  const FREE_SESSION_MAX = 10; // free users: max 10 min sessions
  const THRESHOLD = 7;

  // Stripe payment links — replace with your actual links from Stripe Dashboard
  const STRIPE = {
    deep: 'https://buy.stripe.com/test_4gMbJ0fUZfqvcsvcDz4Rq00',   // $9/mo — Deep
    order: 'https://buy.stripe.com/test_bJe6oGcIN7Y3fEHfPL4Rq01',  // $29/mo — The Order
  };

  // ─── CURSOR ───
  const cursorEl = document.getElementById('cursor');
  const ringEl = document.getElementById('cursorRing');
  const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (cursorEl && hasHover) {
    let mx=0,my=0,rx=0,ry=0;
    document.addEventListener('mousemove', e => {
      mx=e.clientX; my=e.clientY;
      cursorEl.style.left=mx+'px'; cursorEl.style.top=my+'px';
    });
    (function animRing(){
      rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
      ringEl.style.left=rx+'px'; ringEl.style.top=ry+'px';
      requestAnimationFrame(animRing);
    })();
    document.addEventListener('mouseover', e => {
      if(e.target.matches('button,a,input,textarea')) {
        cursorEl.style.transform='translate(-50%,-50%) scale(2.5)';
        ringEl.style.width='44px'; ringEl.style.height='44px';
      }
    });
    document.addEventListener('mouseout', e => {
      if(e.target.matches('button,a,input,textarea')) {
        cursorEl.style.transform='translate(-50%,-50%) scale(1)';
        ringEl.style.width='28px'; ringEl.style.height='28px';
      }
    });
  }

  // ─── TOAST ───
  function toast(msg, duration = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }

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

  // ─── LOAD DATA ───
  async function loadData() {
    const uid = S.currentUser.id;

    // Production rule: never render zeros over a failed load — a practitioner
    // seeing "0 catatons" because of a network blip is a broken promise.
    let profRes, sitRes, arcRes;
    try {
      [profRes, sitRes, arcRes] = await Promise.all([
        sb.from('profiles').select('*').eq('id', uid).single(),
        sb.from('situations').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        sb.from('archive').select('*').eq('user_id', uid).order('completed_at', { ascending: false }),
      ]);
    } catch (netErr) {
      console.error('loadData network failure', netErr);
      dataLoadFailed();
      return;
    }
    if (profRes.error || sitRes.error || arcRes.error) {
      console.error('loadData query failure', profRes.error || sitRes.error || arcRes.error);
      dataLoadFailed();
      return;
    }

    S.profile = profRes.data || {};
    S.situations = sitRes.data || [];
    S.archive = arcRes.data || [];

    // Update ambient void with user's lifetime catatons for stage awareness
    if (typeof VoidAmbient !== 'undefined') {
      VoidAmbient.setCatatons(S.profile.total_catatons || 0);
    }

    render();
    checkSessionReturn().catch(function(err) {
      console.error('session return failed', err);
      toast('Your last session is saved and will be counted next visit.');
    });
  }

  function dataLoadFailed() {
    const list = document.getElementById('sitList');
    if (list) {
      list.innerHTML = `<div class="empty">
        <p class="empty-title">The void did not answer.</p>
        <p class="empty-sub">Your catatons are safe — this is only a connection problem.</p>
        <button class="s-btn" id="retryLoadBtn" style="margin-top:1.2rem">Try again</button>
      </div>`;
      const btn = document.getElementById('retryLoadBtn');
      if (btn) btn.addEventListener('click', function() { loadData(); });
    }
    toast('Could not load your practice. Check your connection.');
  }

  // ─── RENDER ───
  function render() {
    renderSituations();
    updateNav();
  }

  function updateNav() {
    document.getElementById('totalCatons').textContent =
      (S.profile.total_catatons || 0).toLocaleString();
  }

  function renderSituations() {
    const list = document.getElementById('sitList');
    const lbl = document.getElementById('activeLabel');
    list.innerHTML = '';

    // Tier bar
    document.getElementById('tierText').textContent =
      S.profile.is_premium
        ? `${S.profile.tier === 'order' ? 'The Order' : 'Deep'} — unlimited everything`
        : `Free — unlimited situations · sessions up to 10 min`;

    if (S.situations.length === 0) {
      lbl.style.display = 'none';
      list.innerHTML = `<div class="empty">
        <p class="empty-title">The void is clear.</p>
        <p class="empty-sub">Name what you're carrying to begin.</p>
      </div>`;
      return;
    }

    lbl.style.display = 'block';
    S.situations.forEach((sit, i) => {
      const progress = Math.min((sit.sessions / THRESHOLD) * 100, 100);
      const atThreshold = sit.sessions >= THRESHOLD;

      const card = document.createElement('div');
      card.className = 'sit-card fade-up';
      card.style.animationDelay = (i * 60) + 'ms';
      card.dataset.id = sit.id;

      card.innerHTML = `
        <div class="progress-bar ${atThreshold ? 'threshold' : ''}"
          style="width:${progress}%"></div>
        <div class="sit-main">
          <div>
            <div class="sit-name">${esc(sit.name)}</div>
            <div class="sit-meta">
              <span class="sit-sessions">${sit.sessions} session${sit.sessions !== 1 ? 's' : ''}</span>
              <span class="threshold-badge ${atThreshold ? 'show' : ''}">Mastery threshold reached</span>
            </div>
          </div>
          <div class="sit-right">
            <div class="cataton-display">
              <span class="cat-num" id="cnum-${sit.id}">${sit.catatons}</span>
              <span class="cat-unit">Catatons</span>
            </div>
            <div class="sit-actions">
              <button class="s-btn primary" data-action="session" data-id="${sit.id}">Begin Session</button>
              <button class="s-btn" data-action="obs" data-id="${sit.id}">Write Intention</button>
              ${atThreshold
                ? `<button class="s-btn gold" data-action="mastery" data-id="${sit.id}">Declare Mastery</button>`
                : ''}
              <button class="s-btn danger" data-action="delete" data-id="${sit.id}">Remove</button>
            </div>
          </div>
        </div>`;

      list.appendChild(card);
    });

    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { action, id } = btn.dataset;
        if (action === 'session') openSessionModal(id);
        if (action === 'obs') openObsModal(id, 'manifesto');
        if (action === 'mastery') openMasteryModal(id);
        if (action === 'delete') deleteSituation(id);
      });
    });
  }

  // ─── ADD SITUATION ───
  const newInput = document.getElementById('newSitInput');
  const enterBtn = document.getElementById('addEnterBtn');

  newInput.addEventListener('input', () => {
    enterBtn.classList.toggle('show', newInput.value.trim().length > 0);
  });
  newInput.addEventListener('keydown', e => { if (e.key === 'Enter') addSituation(); });
  enterBtn.addEventListener('click', addSituation);

  // Debounce guard — prevents double-submit
  let _addingLock = false;

  async function addSituation() {
    if (_addingLock) return;
    const name = newInput.value.trim();
    if (!name) return;

    // Length validation
    if (name.length > 120) {
      toast('Keep it under 120 characters.');
      return;
    }

    // Sanitize: strip any HTML tags just in case
    const safeName = name.replace(/<[^>]*>/g, '').trim();
    if (!safeName) return;

    _addingLock = true;
    setTimeout(() => { _addingLock = false; }, 2000);

    // No situation limit — free users can name everything they carry

    const { data, error } = await sb.from('situations').insert({
      user_id: S.currentUser.id,
      name: safeName,
    }).select().single();

    if (error) { toast('Error adding situation.'); return; }

    S.situations.push(data);
    newInput.value = '';
    enterBtn.classList.remove('show');
    renderSituations();
    toast('Situation added.');
  }

  // ─── DELETE SITUATION ───
  async function deleteSituation(id) {
    if (!confirm('Remove this situation? This cannot be undone.')) return;
    const { error } = await sb.from('situations').delete().eq('id', id);
    if (error) {
      console.error('delete failed', error);
      toast('Could not remove it — the void did not answer. Try again.');
      return;
    }
    S.situations = S.situations.filter(s => s.id !== id);
    renderSituations();
    toast('Situation removed.');
  }

  // ─── SESSION MODAL ───
  function openSessionModal(id) {
    S.activeSitId = id;
    const sit = S.situations.find(s => s.id === id);
    document.getElementById('sessSitName').textContent = `"${sit.name}"`;
    openOverlay('sessionOverlay');
  }

  document.getElementById('sessionOverlay').querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('sessionOverlay').querySelectorAll('.mode-btn')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.sessMode = btn.dataset.mode;
    });
  });

  document.getElementById('sessionOverlay').querySelectorAll('.dur-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const min = parseInt(btn.dataset.min);
      // Gate longer sessions for free users
      if (!S.profile.is_premium && min > FREE_SESSION_MAX) {
        closeOverlay('sessionOverlay');
        openUpgradeModal('session');
        return;
      }
      document.getElementById('sessionOverlay').querySelectorAll('.dur-btn')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.sessDuration = min;
    });
  });

  document.getElementById('startSessBtn').addEventListener('click', () => {
    closeOverlay('sessionOverlay');
    const params = new URLSearchParams({
      sitId: S.activeSitId || '',
      mode: S.sessMode,
      duration: S.sessDuration,
      userId: S.currentUser.id,
    });
    window.location.href = 'session.html?' + params.toString();
  });

  // ─── OBS MODAL ───
  function openObsModal(id, mode) {
    S.activeSitId = id;
    S.obsMode = mode;
    const sit = S.situations.find(s => s.id === id);
    document.getElementById('obsSitName').textContent = `"${sit.name}"`;
    document.getElementById('obsText').value = sit.manifesto || '';
    document.getElementById('obsText').classList.remove('dissolving');
    document.getElementById('obsRelease').classList.remove('show');
    document.getElementById('obsActions').style.opacity = '1';
    document.getElementById('obsActions').style.pointerEvents = '';

    if (mode === 'manifesto') {
      document.getElementById('obsEyebrow').textContent = 'Planned Obsolescence — Intention';
      document.getElementById('obsTitle').innerHTML = 'Before <em>the void.</em>';
      document.getElementById('obsText').placeholder = 'What are you bringing into this silence? What are you ready to release?…';
      document.getElementById('obsActionBtn').textContent = 'Save Intention';
      document.getElementById('obsSessionBtn').style.display = '';
    } else {
      document.getElementById('obsEyebrow').textContent = 'Planned Obsolescence — Completion';
      document.getElementById('obsTitle').innerHTML = 'The <em>release.</em>';
      document.getElementById('obsText').placeholder = 'Name it one final time before it dissolves…';
      document.getElementById('obsActionBtn').textContent = 'Release It';
      document.getElementById('obsSessionBtn').style.display = 'none';
    }

    openOverlay('obsOverlay');
  }

  document.getElementById('obsSessionBtn').addEventListener('click', async () => {
    await saveManifesto();
    closeOverlay('obsOverlay');
    openSessionModal(S.activeSitId);
  });

  document.getElementById('obsActionBtn').addEventListener('click', async () => {
    if (S.obsMode === 'manifesto') {
      await saveManifesto();
      document.getElementById('obsActionBtn').textContent = 'Saved.';
      setTimeout(() => closeOverlay('obsOverlay'), 800);
    } else {
      // Dissolution ritual
      const ta = document.getElementById('obsText');
      ta.classList.add('dissolving');
      document.getElementById('obsActions').style.opacity = '0';
      document.getElementById('obsActions').style.pointerEvents = 'none';
      const msgs = ['Released.', 'Let go.', 'Gone.', 'It no longer defines you.', 'The slate is clean.'];
      setTimeout(() => {
        document.getElementById('obsRelease').textContent = msgs[Math.floor(Math.random()*msgs.length)];
        document.getElementById('obsRelease').classList.add('show');
        // Clear manifesto in DB — checked, not fire-and-forget.
        sb.from('situations').update({ manifesto: '' }).eq('id', S.activeSitId).then(function(res) {
          if (res.error) {
            console.error('release write failed', res.error);
            toast('The release could not be recorded — check your connection.');
          }
        });
        const sit = S.situations.find(s => s.id === S.activeSitId);
        if (sit) sit.manifesto = '';
      }, 1400);
      setTimeout(() => closeOverlay('obsOverlay'), 3200);
    }
  });

  async function saveManifesto() {
    const text = document.getElementById('obsText').value.slice(0, 4000);
    const { error } = await sb.from('situations').update({ manifesto: text }).eq('id', S.activeSitId);
    if (error) {
      console.error('manifesto save failed', error);
      toast('Could not save — the void did not answer. Your words are still here.');
      return;
    }
    const sit = S.situations.find(s => s.id === S.activeSitId);
    if (sit) sit.manifesto = text;
  }

  // ─── MASTERY MODAL ───
  function openMasteryModal(id) {
    S.activeSitId = id;
    const sit = S.situations.find(s => s.id === id);
    document.getElementById('masteryNum').textContent = sit.catatons;
    document.getElementById('masteryText').value = '';
    document.getElementById('masteryRelease').classList.remove('show');
    document.getElementById('masteryActions').style.opacity = '1';
    document.getElementById('masteryActions').style.pointerEvents = '';

    const nudge = sit.sessions >= THRESHOLD
      ? `You've completed <em>${sit.sessions} sessions</em> in this silence. You are ready — when you feel it.`
      : `You've completed ${sit.sessions} sessions. Suggested threshold is ${THRESHOLD}. You may declare now, or continue accumulating.`;
    document.getElementById('masteryNudge').innerHTML = nudge;

    openOverlay('masteryOverlay');
  }

  document.getElementById('notYetBtn').addEventListener('click', () => closeOverlay('masteryOverlay'));

  document.getElementById('declareBtn').addEventListener('click', async () => {
    const sit = S.situations.find(s => s.id === S.activeSitId);
    if (!sit) return;

    const genesisRaw = document.getElementById('masteryText').value.trim();
    // Cap genesis text at 1000 chars
    const genesis = genesisRaw.slice(0, 1000).replace(/<[^>]*>/g, '').trim();

    // Move to archive
    const { error } = await sb.from('archive').insert({
      user_id: S.currentUser.id,
      name: sit.name,
      sessions: sit.sessions,
      catatons: sit.catatons,
      manifesto: sit.manifesto || '',
      genesis,
      completed_at: new Date().toISOString(),
    });

    if (error) { toast('Error archiving situation.'); return; }

    // Delete from active — archived copy already exists; if this fails the
    // situation reappears next load alongside its archive entry, so say so.
    const delRes = await sb.from('situations').delete().eq('id', S.activeSitId);
    if (delRes.error) {
      console.error('post-archive delete failed', delRes.error);
      toast('Archived — but the active copy could not be cleared. Refresh to reconcile.');
    }
    S.situations = S.situations.filter(s => s.id !== S.activeSitId);

    // Update archive list
    S.archive.unshift({ ...sit, genesis, completed_at: new Date().toISOString() });

    // Release animation
    document.getElementById('masteryActions').style.opacity = '0';
    document.getElementById('masteryActions').style.pointerEvents = 'none';
    const msgs = ['Released.', 'Genesis.', 'It is finished.', 'The new world begins.', 'Amen.'];
    document.getElementById('masteryRelease').textContent = msgs[Math.floor(Math.random()*msgs.length)];
    document.getElementById('masteryRelease').classList.add('show');

    setTimeout(() => {
      closeOverlay('masteryOverlay');
      render();
    }, 2400);
  });

  // ─── SESSION RETURN — receive catatons from session.html ───
  async function checkSessionReturn() {
    // NO-LOSS PROTOCOL: the result stays in sessionStorage until the database
    // writes SUCCEED. Earned catatons are never discarded on a network
    // failure or rate-limit — they are retried on the next load.
    const result = sessionStorage.getItem('cat_session_result');
    if (!result) return;

    let parsed;
    try { parsed = JSON.parse(result); }
    catch { sessionStorage.removeItem('cat_session_result'); return; } // unparseable: drop
    const { sitId, catatonsEarned } = parsed;

    // Sanity check — prevent tampered values
    if (!sitId || typeof catatonsEarned !== 'number') {
      sessionStorage.removeItem('cat_session_result');
      return;
    }
    const safeCatatons = Math.min(Math.max(0, Math.round(catatonsEarned)), 60); // max 60 per session

    const sit = S.situations.find(s => s.id === sitId);
    if (!sit) { sessionStorage.removeItem('cat_session_result'); return; }

    // Rate limit: hold the result, don't destroy it.
    const lastSession = parseInt(localStorage.getItem('cat_last_session') || '0');
    const now = Date.now();
    if (now - lastSession < 60000) {
      toast('Let the silence settle — your catatons will be counted shortly.');
      return;
    }

    // Update in Supabase — every write checked.
    const newCatatons = sit.catatons + safeCatatons;
    const newSessions = sit.sessions + 1;
    const newTotal = (S.profile.total_catatons || 0) + safeCatatons;

    const [upSit, upProf, insLog] = await Promise.all([
      sb.from('situations').update({ catatons: newCatatons, sessions: newSessions }).eq('id', sitId),
      sb.from('profiles').update({ total_catatons: newTotal }).eq('id', S.currentUser.id),
      sb.from('sessions_log').insert({
        user_id: S.currentUser.id,
        situation_id: sitId,
        situation_name: sit.name,
        mode: parsed.mode || S.sessMode || 'silence',
        duration_minutes: parsed.duration || S.sessDuration || null,
        catatons_earned: safeCatatons,
        completed: true,
      }),
    ]);
    if (upSit.error || upProf.error || insLog.error) {
      console.error('session write failed', upSit.error || upProf.error || insLog.error);
      toast('The void did not answer — your session is safe and will be counted next visit.');
      return; // result stays in sessionStorage; retried on next load
    }

    // Success: only now is the result consumed.
    sessionStorage.removeItem('cat_session_result');
    localStorage.setItem('cat_last_session', String(now));

    sit.catatons = newCatatons;
    sit.sessions = newSessions;
    S.profile.total_catatons = newTotal;

    // Update ambient void stage awareness
    if (typeof VoidAmbient !== 'undefined') {
      VoidAmbient.setCatatons(newTotal);
    }

    render();

    // Animate
    setTimeout(() => {
      const el = document.getElementById(`cnum-${sitId}`);
      if (el) { el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 600); }
    }, 300);

    toast(`+${safeCatatons} Catatons accumulated.`);
  }

  // ─── OVERLAY HELPERS ───
  function openOverlay(id) { document.getElementById(id).classList.add('open'); }
  function closeOverlay(id) { document.getElementById(id).classList.remove('open'); }

  document.querySelectorAll('.modal-close[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeOverlay(btn.dataset.close));
  });

  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', e => {
      if (e.target === ov) closeOverlay(ov.id);
    });
  });

  // ─── UPGRADE MODAL ───
  function openUpgradeModal(context) {
    // Set Stripe links
    document.getElementById('stripeDeepBtn').href = STRIPE.deep;
    document.getElementById('stripeOrderBtn').href = STRIPE.order;

    // Context-aware headline
    const ctx = {
      session: 'Longer sessions are a Deep feature.',
      general: 'Go Deeper',
    };
    document.getElementById('upgradeContext').textContent = ctx[context] || 'Go Deeper';
    openOverlay('upgradeOverlay');
  }

  // ─── UPGRADE ───
  document.getElementById('upgradeBtn').addEventListener('click', () => openUpgradeModal('general'));

  // ─── HELPERS ───
  function esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }

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
