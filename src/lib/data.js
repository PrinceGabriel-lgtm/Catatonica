  import { VoidAmbient } from '../engines/void-ambient.js';
import { sb } from './supabase.js';
import { S } from './state.js';
import { toast } from './ui.js';
import { render } from '../views/dashboard.js';

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

  export { loadData };
