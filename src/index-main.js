    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hasHover) {
      let mx=0,my=0,rx=0,ry=0;
      document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; cursor.style.left=mx+'px'; cursor.style.top=my+'px'; });
      (function animRing(){ rx+=(mx-rx)*0.1; ry+=(my-ry)*0.1; ring.style.left=rx+'px'; ring.style.top=ry+'px'; requestAnimationFrame(animRing); })();
      document.addEventListener('mouseover', e => { if(e.target.matches('button,a,input,textarea')) { cursor.style.transform='translate(-50%,-50%) scale(2.5)'; ring.style.width='42px'; ring.style.height='42px'; } });
      document.addEventListener('mouseout', e => { if(e.target.matches('button,a,input,textarea')) { cursor.style.transform='translate(-50%,-50%) scale(1)'; ring.style.width='26px'; ring.style.height='26px'; } });
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
