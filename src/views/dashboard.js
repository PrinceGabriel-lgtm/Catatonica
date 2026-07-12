import { sb, THRESHOLD } from '../lib/supabase.js';
import { S } from '../lib/state.js';
import { toast, esc } from '../lib/ui.js';
import { openSessionModal, openObsModal, openMasteryModal } from './overlays.js';

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

  export { render };
