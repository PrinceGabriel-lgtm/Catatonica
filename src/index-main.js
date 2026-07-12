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

    // Pass 2.8 "The Fall" — warm the app while the galaxy turns. The Collapse
    // navigates to app.html; if its documents aren't cached, a slow network
    // freezes the fall on black (the seam the founder saw at ~9 KB/s). Idle-
    // prefetch the app's critical documents so the crossing is continuous.
    // Honour Save-Data; unhashed asset names (vite.config) make these stable.
    (function warmApp() {
      try {
        var c = navigator.connection;
        if (c && c.saveData) return;
      } catch (e) {}
      // Dist paths (what the browser actually requests): Vite bundles
      // tokens.css into app.css. In dev these 404 silently — harmless.
      var assets = ['/app.html', '/app.css', '/assets/app.js'];
      function prefetch() {
        assets.forEach(function (href) {
          var l = document.createElement('link');
          l.rel = 'prefetch';
          l.href = href;
          document.head.appendChild(l);
        });
      }
      if ('requestIdleCallback' in window) requestIdleCallback(prefetch, { timeout: 3000 });
      else setTimeout(prefetch, 1800);
    })();
