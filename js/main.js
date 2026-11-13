/* ==========================================================================
   SECOND PULSE · One Donor, Eight Lives
   Vanilla JS, no dependencies.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Utilities ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const pad = (n) => String(n).padStart(2, '0');
  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtIN = new Intl.NumberFormat('en-IN');

  // Small seeded PRNG so the generated tree and QR codes look the same on every load.
  function mulberry32(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function formatHMS(sec) {
    sec = Math.max(0, Math.floor(sec));
    return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
  }

  /* ---------- 1. Floating light particles ---------- */
  function initParticles() {
    const canvas = $('#particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const tints = ['255,77,106', '255,191,95', '255,238,225'];
    const sprites = tints.map((c) => {
      const s = document.createElement('canvas');
      s.width = s.height = 32;
      const g = s.getContext('2d');
      const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grd.addColorStop(0, `rgba(${c},1)`);
      grd.addColorStop(0.22, `rgba(${c},.55)`);
      grd.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, 32, 32);
      return s;
    });

    let w = 0, h = 0, parts = [], raf = 0;

    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 20,
      r: 3 + Math.random() * 9,
      vy: 0.1 + Math.random() * 0.32,
      vx: (Math.random() - 0.5) * 0.12,
      a: 0.12 + Math.random() * 0.42,
      ph: Math.random() * Math.PI * 2,
      s: sprites[Math.random() < 0.5 ? 0 : Math.random() < 0.65 ? 1 : 2],
    });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const widthChanged = window.innerWidth !== w;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (widthChanged) {
        const count = Math.round(clamp((w * h) / 22000, 22, 80));
        parts = Array.from({ length: count }, () => spawn(true));
      }
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.vy;
        p.x += p.vx + Math.sin(t / 2200 + p.ph) * 0.12;
        if (p.y < -20) Object.assign(p, spawn(false));
        ctx.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(t / 900 + p.ph));
        ctx.drawImage(p.s, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', debounce(resize, 200));

    if (reduceMotion) {
      frame(0);
      cancelAnimationFrame(raf);
      return;
    }
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    });
  }

  /* ---------- 2. Tree of Life (generated SVG) ---------- */
  function buildTree() {
    const branchesG = $('#treeBranches');
    const rootsG = $('#treeRoots');
    const leavesG = $('#treeLeaves');
    const heartsG = $('#treeHearts');
    if (!branchesG) return;

    const rand = mulberry32(8); // 8 lives
    const BASE = { x: 300, y: 500 };
    const T0 = 0.95;   // trunk starts right after the ECG spike is drawn
    const STEP = 0.2;  // delay per branch level
    const MAX_DEPTH = 7;
    const tips = [];

    function segment(parent, x, y, angle, len, width, delay, dur) {
      const rad = (angle * Math.PI) / 180;
      const x2 = x + Math.cos(rad) * len;
      const y2 = y + Math.sin(rad) * len;
      const bend = (rand() - 0.5) * len * 0.3;
      const cx = (x + x2) / 2 - Math.sin(rad) * bend;
      const cy = (y + y2) / 2 + Math.cos(rad) * bend;
      const p = svgEl('path', {
        d: `M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        'stroke-width': Math.max(width, 0.7).toFixed(2),
        pathLength: '1',
        class: 'branch',
      });
      p.style.setProperty('--delay', `${delay.toFixed(2)}s`);
      p.style.setProperty('--dur', `${dur.toFixed(2)}s`);
      parent.appendChild(p);
      return { x2, y2 };
    }

    const fragB = document.createDocumentFragment();
    (function grow(x, y, angle, len, width, depth) {
      const { x2, y2 } = segment(fragB, x, y, angle, len, width, T0 + depth * STEP + rand() * 0.06, depth === 0 ? 0.55 : 0.42);
      if (depth >= MAX_DEPTH) {
        tips.push({ x: x2, y: y2, depth });
        return;
      }
      if (depth >= 4 && rand() < 0.3) tips.push({ x: x2, y: y2, depth });
      const n = depth < 1 ? 2 : rand() < 0.28 ? 3 : 2;
      const spread = 19 + rand() * 14;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1) - 0.5;
        const a = clamp(angle + k * 2 * spread + (rand() - 0.5) * 12, -172, -8);
        grow(x2, y2, a, len * (0.7 + rand() * 0.12), width * 0.7, depth + 1);
      }
    })(BASE.x, BASE.y, -90, 112, 15, 0);
    branchesG.appendChild(fragB);

    // Roots spread below the heartbeat line
    const fragR = document.createDocumentFragment();
    function root(x, y, angle, len, width, depth) {
      const { x2, y2 } = segment(fragR, x, y, angle, len, width, 0.9 + depth * 0.18, 0.4);
      if (depth >= 3) return;
      for (const dir of [-1, 1]) {
        const a = clamp(angle + dir * (14 + rand() * 18), 10, 170);
        root(x2, y2, a, len * (0.62 + rand() * 0.15), width * 0.62, depth + 1);
      }
    }
    [28, 60, 90, 120, 152].forEach((a) => root(BASE.x, BASE.y, a + (rand() - 0.5) * 10, 30 + rand() * 18, 5, 0));
    rootsG.appendChild(fragR);

    // Glowing leaves at the branch tips
    const fragL = document.createDocumentFragment();
    const leafColors = ['#ffd27a', '#ffd27a', '#ff8a6b', '#fff1dc'];
    tips.forEach((tp) => {
      const c = svgEl('circle', {
        cx: tp.x.toFixed(1),
        cy: tp.y.toFixed(1),
        r: (1.6 + rand() * 2.6).toFixed(1),
        fill: leafColors[Math.floor(rand() * leafColors.length)],
        class: 'leaf',
      });
      c.style.setProperty('--delay', `${(T0 + tp.depth * STEP + 0.35 + rand() * 0.3).toFixed(2)}s`);
      c.style.setProperty('--o', (0.45 + rand() * 0.5).toFixed(2));
      c.style.setProperty('--tw', `${(2.5 + rand() * 4).toFixed(2)}s`);
      fragL.appendChild(c);
    });
    leavesG.appendChild(fragL);

    // Eight hearts, spread across the crown
    const pool = shuffle(tips.filter((t) => t.y < 400), rand);
    const picked = [];
    for (let minD = 100; picked.length < 8 && minD > 20; minD -= 10) {
      for (const t of pool) {
        if (picked.length >= 8) break;
        if (!picked.includes(t) && picked.every((p) => Math.hypot(p.x - t.x, p.y - t.y) >= minD)) picked.push(t);
      }
    }
    const distFromBase = (t) => Math.hypot(t.x - BASE.x, t.y - BASE.y);
    picked.sort((a, b) => distFromBase(a) - distFromBase(b));
    picked.forEach((t, i) => {
      const g = svgEl('g', { transform: `translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) scale(1.2)` });
      const pop = svgEl('g', { class: 't-heart' });
      pop.style.setProperty('--delay', `${(2.55 + i * 0.16).toFixed(2)}s`);
      const beat = svgEl('g', { class: 't-heart__beat' });
      // The white blip on the ECG line passes the spike at ~3.7s, then every 3.2s.
      // Each heart beats a little later the further it is from the trunk, so the pulse "climbs" the tree.
      beat.style.setProperty('--beat', `${(3.65 + distFromBase(t) / 1000).toFixed(2)}s`);
      beat.appendChild(svgEl('circle', { r: '22', fill: 'url(#gHeartHalo)' }));
      beat.appendChild(svgEl('use', { href: '#heartShape', fill: 'url(#gHeart)' }));
      pop.appendChild(beat);
      g.appendChild(pop);
      heartsG.appendChild(g);
    });
  }

  /* ---------- 3. Slides: reveal, active state, dots, progress ---------- */
  const slides = $$('.slide');
  const header = $('#siteHeader');
  const progressBar = $('#progressBar');
  const notes = $('#notes');
  const notesBody = $('#notesBody');
  const notesSlide = $('#notesSlide');
  const notesToggle = $('#notesToggle');
  let current = -1;
  let slideTops = [];
  let dotLinks = [];
  const navLinks = $$('.site-nav a');

  function measure() {
    slideTops = slides.map((s) => s.getBoundingClientRect().top + window.scrollY);
  }

  function buildDots() {
    const nav = $('#dots');
    if (!nav) return;
    const ol = document.createElement('ol');
    slides.forEach((s, i) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      const label = document.createElement('span');
      a.href = `#${s.id}`;
      a.setAttribute('aria-label', `Slide ${i + 1}: ${s.dataset.title}`);
      label.textContent = `${pad(i + 1)} · ${s.dataset.title}`;
      a.appendChild(label);
      li.appendChild(a);
      ol.appendChild(li);
    });
    nav.appendChild(ol);
    dotLinks = $$('a', ol);
  }

  function updateNotes() {
    const s = slides[current];
    if (!s) return;
    const n = $('.speaker-notes', s);
    notesBody.textContent = n ? n.textContent.trim() : '';
    notesSlide.textContent = `Slide ${pad(current + 1)} / ${slides.length} · ${s.dataset.title}`;
  }

  function setActive(i) {
    if (i === current) return;
    const prev = slides[current];
    current = i;
    const s = slides[i];
    dotLinks.forEach((a, k) => {
      a.classList.toggle('is-active', k === i);
      if (k === i) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${s.id}`));
    updateNotes();
    if (prev) prev.dispatchEvent(new CustomEvent('slide:leave'));
    s.dispatchEvent(new CustomEvent('slide:active'));
  }

  function onScroll() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const probe = y + vh * 0.45;
    let idx = 0;
    for (let i = 0; i < slideTops.length; i++) if (slideTops[i] <= probe) idx = i;
    setActive(idx);
    const max = document.documentElement.scrollHeight - vh;
    progressBar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    header.classList.toggle('is-scrolled', y > 10);
  }

  function initSlides() {
    buildDots();

    // .is-in fires once (entrance animations); .in-view toggles (pauses looping animations off screen)
    const ioIn = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        e.target.dispatchEvent(new CustomEvent('slide:in'));
        ioIn.unobserve(e.target);
      }),
      { rootMargin: '0px 0px -22% 0px', threshold: 0 }
    );
    const ioView = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle('in-view', e.isIntersecting)),
      { threshold: 0 }
    );
    slides.forEach((s) => { ioIn.observe(s); ioView.observe(s); });

    measure();
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { onScroll(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', debounce(() => { measure(); onScroll(); }, 150));
    window.addEventListener('load', () => { measure(); onScroll(); });
    onScroll();
  }

  /* ---------- 4. Presenter controls: keyboard, menu, notes, fullscreen ---------- */
  let navTarget = null;
  let navTimer = 0;

  function go(i) {
    if (i > slides.length - 1) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    i = clamp(i, 0, slides.length - 1);
    navTarget = i;
    clearTimeout(navTimer);
    navTimer = setTimeout(() => { navTarget = null; }, 900);
    window.scrollTo({ top: slideTops[i], behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function next() {
    if (navTarget !== null) return go(navTarget + 1);
    const r = slides[current].getBoundingClientRect();
    const vh = window.innerHeight;
    // Tall slide (small screens): scroll through it before jumping to the next one
    if (r.bottom > vh + 8) {
      window.scrollBy({ top: Math.min(r.bottom - vh, vh * 0.85), behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    go(current + 1);
  }

  function prev() {
    if (navTarget !== null) return go(navTarget - 1);
    const r = slides[current].getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.top < -8) {
      window.scrollBy({ top: Math.max(r.top, -vh * 0.85), behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    go(current - 1);
  }

  function toggleNotes(force) {
    const show = typeof force === 'boolean' ? force : notes.hidden;
    notes.hidden = !show;
    notesToggle.setAttribute('aria-pressed', String(show));
    if (show) updateNotes();
  }

  function toggleFullscreen() {
    const d = document;
    const el = d.documentElement;
    const isFs = d.fullscreenElement || d.webkitFullscreenElement;
    const fn = isFs ? d.exitFullscreen || d.webkitExitFullscreen : el.requestFullscreen || el.webkitRequestFullscreen;
    if (!fn) return;
    const p = fn.call(isFs ? d : el);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  const menu = $('#menu');
  const menuBtn = $('#menuToggle');

  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    $('use', menuBtn).setAttribute('href', open ? '#i-x' : '#i-menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('a', menu).focus();
  }

  const hint = $('#hint');
  let hintTimer = 0;
  function hideHint() {
    clearTimeout(hintTimer);
    hint && hint.classList.remove('is-visible');
  }

  function initControls() {
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      const onControl = t.closest && t.closest('button, a');
      const k = e.key;

      if (!menu.hidden) {
        if (k === 'Escape') { setMenu(false); menuBtn.focus(); }
        return;
      }

      if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.shiftKey && !onControl)) {
        e.preventDefault();
        next();
      } else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey && !onControl)) {
        e.preventDefault();
        prev();
      } else if (k === 'Home') {
        e.preventDefault();
        go(0);
      } else if (k === 'End') {
        e.preventDefault();
        go(slides.length - 1);
      } else if (k === 'n' || k === 'N') {
        toggleNotes();
      } else if (k === 'f' || k === 'F') {
        toggleFullscreen();
      } else if (k === 'Escape') {
        if (!notes.hidden) toggleNotes(false);
      } else if (/^[0-9]$/.test(k)) {
        go(k === '0' ? 9 : Number(k) - 1);
      }
      hideHint();
    });

    notesToggle.addEventListener('click', () => toggleNotes());
    $('#notesClose').addEventListener('click', () => toggleNotes(false));
    $('#fsToggle').addEventListener('click', toggleFullscreen);
    menuBtn.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target === menu) setMenu(false);
    });

    // One-time keyboard hint for presenters on desktop
    if (hint && window.matchMedia('(pointer: fine) and (min-width: 961px)').matches) {
      setTimeout(() => {
        hint.classList.add('is-visible');
        hintTimer = setTimeout(hideHint, 7000);
      }, 2500);
    }
  }

  /* ---------- 5. Slide 02: counters + 100-person grid ---------- */
  function initProblem() {
    const section = $('#problem');
    if (!section) return;
    const nums = $$('[data-count]', section);
    const grid = $('#peopleGrid');

    if (grid) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 100; i++) {
        const dot = document.createElement('i');
        dot.style.setProperty('--i', i);
        if (i === 55) dot.className = 'is-one';
        frag.appendChild(dot);
      }
      grid.appendChild(frag);
    }

    if (reduceMotion) return;
    nums.forEach((el) => { el.textContent = '0'; });
    section.addEventListener('slide:in', () => {
      nums.forEach((el, k) => {
        const to = Number(el.dataset.count);
        const dur = 2200;
        const start = performance.now() + k * 180;
        const tick = (now) => {
          const p = clamp((now - start) / dur, 0, 1);
          el.textContent = fmtIN.format(Math.round(to * (1 - Math.pow(1 - p, 4))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { once: true });
  }

  /* ---------- 6. Slide 03: organ viability simulator ---------- */
  function initViability() {
    const section = $('#science');
    const box = $('#viability');
    if (!box) return;

    const MAX_T = 20160; // 14 days, in minutes
    const L = Math.log10(MAX_T + 1);
    const xOf = (t) => Math.log10(t + 1) / L; // log scale: minutes and days fit on one track
    const DURATION = 14000;

    const organs = $$('.organ', box).map((li) => {
      const min = Number(li.dataset.min);
      const max = Number(li.dataset.max);
      li.style.setProperty('--xmin', xOf(min).toFixed(4));
      li.style.setProperty('--xmax', xOf(max).toFixed(4));
      return { li, min, max, status: $('.organ__status', li), state: 'viable' };
    });
    $$('#axis i').forEach((i) => i.style.setProperty('--x', xOf(Number(i.dataset.t)).toFixed(4)));

    const btn = $('#simBtn');
    const btnIcon = $('svg', btn);
    const btnUse = $('use', btn);
    const btnLabel = $('span', btn);
    const clk = { d: $('#clkD'), h: $('#clkH'), m: $('#clkM'), s: $('#clkS') };

    let raf = 0, startAt = 0, elapsed = 0, running = false, done = false, started = false, restoreTimer = 0;

    function setBtn(mode) {
      const map = {
        start: ['#i-play', 'Start the clock', true],
        pause: ['#i-pause', 'Pause', true],
        resume: ['#i-play', 'Resume', true],
        replay: ['#i-replay', 'Replay', false],
      };
      const [icon, label, filled] = map[mode];
      btnUse.setAttribute('href', icon);
      btnIcon.classList.toggle('i--fill', filled);
      btnLabel.textContent = label;
    }

    function render(p) {
      const t = Math.pow(10, p * L) - 1; // minutes since death
      box.style.setProperty('--t', p.toFixed(4));
      const sec = Math.floor(t * 60);
      clk.d.textContent = pad(Math.floor(sec / 86400));
      clk.h.textContent = pad(Math.floor((sec % 86400) / 3600));
      clk.m.textContent = pad(Math.floor((sec % 3600) / 60));
      clk.s.textContent = pad(sec % 60);
      organs.forEach((o) => {
        const state = t > o.max + 0.01 ? 'lost' : t >= o.min - 0.01 ? 'critical' : 'viable';
        if (state === o.state) return;
        o.state = state;
        o.li.classList.toggle('is-critical', state === 'critical');
        o.li.classList.toggle('is-lost', state === 'lost');
        o.status.textContent = state === 'lost' ? 'Lost' : state === 'critical' ? 'Critical' : 'Viable';
      });
    }

    function loop(now) {
      const p = clamp((elapsed + now - startAt) / DURATION, 0, 1);
      render(p);
      if (p < 1) raf = requestAnimationFrame(loop);
      else finish();
    }

    function start() {
      clearTimeout(restoreTimer);
      if (done) { elapsed = 0; done = false; render(0); }
      started = true;
      running = true;
      section.classList.add('is-running');
      section.classList.remove('is-done');
      startAt = performance.now();
      raf = requestAnimationFrame(loop);
      setBtn('pause');
    }

    function pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      elapsed += performance.now() - startAt;
      setBtn('resume');
    }

    function finish() {
      running = false;
      done = true;
      elapsed = 0;
      section.classList.remove('is-running');
      section.classList.add('is-done');
      setBtn('replay');
      // Hold the final state, then restore a clean chart for discussion
      restoreTimer = setTimeout(() => {
        if (running) return;
        render(0);
        section.classList.remove('is-done');
      }, 4500);
    }

    btn.addEventListener('click', () => {
      if (running) pause();
      else start();
    });

    let autoTimer = 0;
    section.addEventListener('slide:active', () => {
      if (started || reduceMotion) return;
      autoTimer = setTimeout(() => { if (!started) start(); }, 900);
    });
    section.addEventListener('slide:leave', () => {
      clearTimeout(autoTimer);
      pause();
    });

    render(0);
  }

  /* ---------- 7. Slide 04: feature cards ---------- */
  function initFeatures() {
    $$('.feature').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });

    // Live viability countdown inside the "Organ Viability Timer" card
    const ringBar = $('#ringBar');
    const ringTime = $('#ringTime');
    const golden = $('#goldenTime');
    const WINDOW = 6 * 3600; // heart: up to 6 hours
    let ringLeft = 4 * 3600 + 52 * 60 + 11;
    let goldenLeft = 3 * 3600 + 42 * 60 + 18;

    const tick = () => {
      ringLeft = ringLeft <= 0 ? WINDOW * 0.82 : ringLeft - 1;
      goldenLeft = goldenLeft <= 0 ? 3 * 3600 + 42 * 60 + 18 : goldenLeft - 1;
      if (ringTime) ringTime.textContent = formatHMS(ringLeft);
      if (ringBar) ringBar.style.strokeDashoffset = (100 - (ringLeft / WINDOW) * 100).toFixed(2);
      if (golden) golden.textContent = formatHMS(goldenLeft);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 8. QR-style codes for the donor card mockups ---------- */
  function qrSVG(seed, size = 25) {
    const rand = mulberry32(seed);
    const m = Array.from({ length: size }, () => new Array(size).fill(0));
    const used = Array.from({ length: size }, () => new Array(size).fill(false));

    const finder = (r0, c0) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = r0 + r, cc = c0 + c;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          used[rr][cc] = true;
          const ring = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          m[rr][cc] = ring || core ? 1 : 0;
        }
      }
    };
    finder(0, 0);
    finder(0, size - 7);
    finder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
      m[6][i] = m[i][6] = i % 2 === 0 ? 1 : 0;
      used[6][i] = used[i][6] = true;
    }

    const a = size - 9; // alignment pattern
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        m[a + r][a + c] = r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2) ? 1 : 0;
        used[a + r][a + c] = true;
      }
    }

    let d = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!used[r][c]) m[r][c] = rand() < 0.5 ? 1 : 0;
        if (m[r][c]) d += `M${c} ${r}h1v1h-1z`;
      }
    }
    return `<svg viewBox="-1 -1 ${size + 2} ${size + 2}" shape-rendering="crispEdges" aria-hidden="true"><path d="${d}" fill="#0a0b12"/></svg>`;
  }

  function initQR() {
    $$('.qr[data-qr]').forEach((el) => { el.innerHTML = qrSVG(Number(el.dataset.qr)); });
  }

  /* ---------- 9. Slide 05: steps drive the phone mockup ---------- */
  function initSteps() {
    const section = $('#how');
    const list = $('#steps');
    if (!list) return;
    const btns = $$('.step__btn', list);
    const screens = $$('.screen', section);
    const STEP_MS = 4500;
    list.style.setProperty('--step-ms', `${STEP_MS}ms`);
    let idx = 0, timer = 0, visible = false, hovering = false;

    function show(i) {
      idx = (i + btns.length) % btns.length;
      btns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      void list.offsetWidth; // restart the progress bar animation
      btns[idx].setAttribute('aria-pressed', 'true');
      screens.forEach((s, k) => s.classList.toggle('is-active', k === idx));
      schedule();
    }

    function schedule() {
      clearTimeout(timer);
      list.classList.toggle('is-paused', hovering || reduceMotion);
      if (visible && !hovering && !reduceMotion) timer = setTimeout(() => show(idx + 1), STEP_MS);
    }

    btns.forEach((b, k) => b.addEventListener('click', () => show(k)));

    const phone = $('.phone-wrap', section);
    [list, phone].forEach((el) => {
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovering = true; schedule(); } });
      el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovering = false; show(idx); } });
    });

    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const wasVisible = visible;
        visible = e.isIntersecting;
        if (visible && !wasVisible) show(0);
        if (!visible) clearTimeout(timer);
      });
    }, { threshold: 0.35 }).observe(section);
  }

  /* ---------- 10. Slide 06: the eye opens ---------- */
  function initEye() {
    const section = $('#sight');
    if (!section) return;
    const anim = $('#eyeOpen');
    const OPEN = 'M30 130C95 55 305 55 370 130C305 205 95 205 30 130Z';

    section.addEventListener('slide:in', () => {
      setTimeout(() => {
        section.classList.add('is-open');
        if (!reduceMotion && anim && typeof anim.beginElement === 'function') {
          anim.beginElement();
        } else {
          $$('#eye animate').forEach((a) => a.remove());
          $$('#eyeClip path, .eye__outline').forEach((p) => p.setAttribute('d', OPEN));
        }
      }, 450);
    }, { once: true });
  }

  /* ---------- 11. Slide 10: pledge + live ticker ---------- */
  function heartBurst(origin) {
    if (reduceMotion) return;
    const r = origin.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const colors = ['#ff2d55', '#ff6b5b', '#ffbf5f', '#ff8aa0'];
    for (let i = 0; i < 28; i++) {
      const h = document.createElement('span');
      h.className = 'burst-heart';
      h.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-heart"/></svg>';
      h.style.left = `${cx}px`;
      h.style.top = `${cy}px`;
      h.style.color = colors[i % colors.length];
      document.body.appendChild(h);
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const dist = 90 + Math.random() * 240;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const s = 0.6 + Math.random() * 1.1;
      const anim = h.animate([
        { transform: 'translate(0,0) scale(0)', opacity: 1 },
        { transform: `translate(${dx * 0.75}px, ${dy * 0.75}px) scale(${s})`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy - 70}px) scale(${s * 0.7})`, opacity: 0 },
      ], { duration: 1300 + Math.random() * 800, easing: 'cubic-bezier(.16,1,.3,1)' });
      anim.onfinish = () => h.remove();
    }
  }

  function initClosing() {
    const section = $('#pledge');
    const btn = $('#pledgeBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      section.classList.add('is-pledged');
      $('span', btn).textContent = 'Thank you! You could save 8 lives';
      heartBurst(btn);
    });

    // 5 lakh deaths a year, roughly one every 63 seconds
    const ticker = $('#lossTicker');
    const PER_SEC = 500000 / (365 * 24 * 3600);
    setInterval(() => {
      const n = Math.floor((performance.now() / 1000) * PER_SEC);
      if (n >= 1) {
        ticker.innerHTML = `Since this page was opened, about <b>${fmtIN.format(n)}</b> ${n === 1 ? 'person' : 'people'} in India died waiting for an organ.`;
      }
    }, 1000);
  }

  /* ---------- Boot ---------- */
  initParticles();
  buildTree();
  initQR();
  initSlides();
  initControls();
  initProblem();
  initViability();
  initFeatures();
  initSteps();
  initEye();
  initClosing();
})();
