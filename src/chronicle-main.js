    // CURSOR
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hasHover) {
      let mx=0,my=0,rx=0,ry=0;
      document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; cursor.style.left=mx+'px'; cursor.style.top=my+'px'; });
      (function animRing(){ rx+=(mx-rx)*0.1; ry+=(my-ry)*0.1; if(ring){ring.style.left=rx+'px'; ring.style.top=ry+'px';} requestAnimationFrame(animRing); })();
    }

    // STAGE SYSTEM
    const STAGES = [
      { name: 'Acknowledgement', label: 'Stage 1', min: 0,  max: 9,        next: 'Acceptance at 10 catatons' },
      { name: 'Acceptance',      label: 'Stage 2', min: 10, max: 29,       next: 'Receiving at 30 catatons' },
      { name: 'Receiving',       label: 'Stage 3', min: 30, max: 69,       next: 'The Threshold at 70 catatons' },
      { name: 'The Threshold',   label: 'Stage 4', min: 70, max: Infinity, next: 'You have reached The Threshold.' },
    ];
    function getStage(n) { return STAGES.find(s => n >= s.min && n <= s.max) || STAGES[0]; }

    // DATA
    const chronicle = JSON.parse(localStorage.getItem('cat_chronicle') || '[]');
    const totalCatatons = parseInt(localStorage.getItem('cat_total') || '0');
    const totalSessions = parseInt(localStorage.getItem('cat_session_count') || '0');

    document.getElementById('navTotal').textContent = totalCatatons;

    // Stats
    const totalMinutes = Math.round(chronicle.reduce((a, r) => a + (r.elapsed || 0), 0) / 60);
    const totalCompleted = chronicle.filter(r => r.completed).length;

    document.getElementById('statTotal').textContent    = totalCatatons.toLocaleString();
    document.getElementById('statSessions').textContent = totalSessions.toLocaleString();
    document.getElementById('statMinutes').textContent  = totalMinutes.toLocaleString();
    document.getElementById('statCompleted').textContent= totalCompleted.toLocaleString();

    // Stage progress
    const stage = getStage(totalCatatons);
    document.getElementById('stageNameLarge').textContent = stage.name;
    document.getElementById('stageNext').innerHTML = stage.max === Infinity
      ? 'You have arrived.'
      : `Next — <em>${stage.next}</em>`;

    const pct = stage.max === Infinity ? 100
      : Math.round(((totalCatatons - stage.min) / (stage.max - stage.min + 1)) * 100);
    document.getElementById('stageBar').style.width = pct + '%';

    // Filter
    let activeFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderList();
      });
    });

    function formatDate(ts) {
      const d = new Date(ts);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function formatElapsed(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
    function modeTagClass(mode) {
      if (mode === 'silence') return 'void-tag';
      if (mode === 'sound')   return 'threshold-tag';
      return 'ignition-tag';
    }

    function renderList() {
      const list = document.getElementById('chronicleList');
      list.innerHTML = '';

      const filtered = activeFilter === 'all'
        ? chronicle
        : chronicle.filter(r => r.mode === activeFilter);

      if (filtered.length === 0) {
        list.innerHTML = chronicle.length === 0
          ? `<div class="empty-state">
               <p class="empty-title">The chronicle is empty.</p>
               <p class="empty-sub">Complete your first session to begin the record.</p>
               <a href="session.html" class="empty-cta">Enter the void →</a>
             </div>`
          : `<div class="empty-state">
               <p class="empty-title">No sessions in this mode yet.</p>
               <p class="empty-sub">Try a different filter.</p>
             </div>`;
        return;
      }

      filtered.forEach((record, i) => {
        const card = document.createElement('div');
        card.className = 'entry-card';
        card.dataset.mode = record.mode;
        card.style.animationDelay = (i * 40) + 'ms';

        const hasEntry = record.entryText && record.entryText.trim();
        const hasExit  = record.exitText  && record.exitText.trim();

        card.innerHTML = `
          <div class="entry-main">
            <div class="entry-left">
              <div class="entry-top">
                <span class="entry-date">${formatDate(record.date)}</span>
                <span class="entry-mode-tag ${modeTagClass(record.mode)}">${record.modeLabel || 'The Void'}</span>
                <span class="entry-stage-tag">${record.stage || 'Acknowledgement'}</span>
              </div>
              <div class="entry-texts">
                ${hasEntry ? `
                  <div class="entry-echo">
                    <span class="echo-key">Carried in</span>
                    <span class="echo-val">${escHtml(record.entryText)}</span>
                  </div>` : ''}
                ${hasExit ? `
                  <div class="entry-echo">
                    <span class="echo-key">What shifted</span>
                    <span class="echo-val">${escHtml(record.exitText)}</span>
                  </div>` : ''}
                ${(!hasEntry && !hasExit) ? `
                  <div class="entry-echo">
                    <span class="echo-key">—</span>
                    <span class="echo-val" style="color:var(--text-dim)">Silent entry. No words.</span>
                  </div>` : ''}
              </div>
            </div>
            <div class="entry-right">
              <span class="entry-catatons-label">Catatons</span>
              <span class="entry-catatons">+${record.catatons}</span>
              <span class="entry-duration">${formatElapsed(record.elapsed || 0)}</span>
              ${!record.completed ? '<span class="entry-incomplete">surfaced early</span>' : ''}
            </div>
          </div>
        `;
        list.appendChild(card);
      });
    }

    function escHtml(str) {
      return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
    }

    renderList();
