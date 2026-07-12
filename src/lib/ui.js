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

  // ─── HELPERS ───
  function esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  export { toast, esc };
