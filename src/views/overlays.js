import { sb, FREE_SESSION_MAX, THRESHOLD, STRIPE } from '../lib/supabase.js';
import { S } from '../lib/state.js';
import { toast } from '../lib/ui.js';
import { render } from './dashboard.js';

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

  export { openSessionModal, openObsModal, openMasteryModal };
