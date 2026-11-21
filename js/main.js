/* ==========================================================================
   Jadis & Fleurs — mise en scène (GSAP + ScrollTrigger + Lenis)
   Règles : on n'anime que transform / opacity (+ clip-path pour les masques),
   courbes douces, et version allégée si prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const useMotion = hasGSAP && !reduce;

  let lenis = null;
  let menuOpen = false;

  /* ---------------------------------------------------------------
     Fin du chargement
     --------------------------------------------------------------- */
  function finishLoading() {
    root.classList.remove('is-loading');
    const l = $('#loader');
    if (l) l.remove();
  }
  // Sécurité : si quelque chose bloque, on libère la page au bout de 9 s.
  setTimeout(() => { if (root.classList.contains('is-loading')) { finishLoading(); if (lenis) lenis.start(); } }, 9000);

  /* ---------------------------------------------------------------
     Éléments communs (avec ou sans animation)
     --------------------------------------------------------------- */
  function initBasics() {
    const nav = $('#nav');
    const bar = $('.progress i');
    const burger = $('#burger');
    const menu = $('#menu');

    // Barre de progression de lecture (transform seulement)
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - innerHeight;
        if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
        if (nav) nav.classList.toggle('is-scrolled', y > 40);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Menu mobile plein écran
    function setMenu(open) {
      menuOpen = open;
      if (!burger || !menu) return;
      const r = burger.getBoundingClientRect();
      menu.style.setProperty('--bx', `${r.left + r.width / 2}px`);
      menu.style.setProperty('--by', `${r.top + r.height / 2}px`);
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.setAttribute('aria-hidden', String(!open));
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
      if (open) nav.classList.remove('is-hidden');
    }
    if (burger) burger.addEventListener('click', () => setMenu(!menuOpen));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
    if (menu) menu.setAttribute('data-lenis-prevent', '');

    // Ancres internes
    $$('[data-scroll]').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (!href || href[0] !== '#') return;
        const target = href === '#top' ? 0 : $(href);
        if (target === null) return;
        e.preventDefault();
        const wasOpen = menuOpen;
        if (wasOpen) setMenu(false);
        setTimeout(() => window.JFScroll(target), wasOpen ? 380 : 0);
        if (history.replaceState && href !== '#top') history.replaceState(null, '', href);
      });
    });

    $$('dialog').forEach(d => d.setAttribute('data-lenis-prevent', ''));
    window.addEventListener('jf:lock', () => { if (lenis) lenis.stop(); });
    window.addEventListener('jf:unlock', () => { if (lenis && !menuOpen) lenis.start(); });
  }

  /* Sans animation : tout est visible tel quel */
  if (!useMotion) {
    root.classList.add('no-motion');
    finishLoading();
    initBasics();
    return;
  }

  /* ===============================================================
     À PARTIR D'ICI : version animée
     =============================================================== */
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('gsap-ready');
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Défilement fluide (inertie douce) — uniquement à la molette / au pavé tactile
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  window.JFScroll = target => {
    const el = typeof target === 'string' ? $(target) : target;
    if (el === null || el === undefined) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
    else if (el === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  initBasics();

  /* ---------- Découpage du texte (lettres / mots avec masque) ---------- */
  function split(el, mode = 'words', label = true) {
    if (el.dataset.splitDone) return { targets: [] };
    el.dataset.splitDone = '1';
    if (label) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const targets = [];
    const mk = (cls, txt) => { const s = document.createElement('span'); s.className = cls; if (txt !== undefined) s.textContent = txt; s.setAttribute('aria-hidden', 'true'); return s; };
    const walk = (node, parent) => {
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
            const w = mk('w');
            if (mode === 'chars') {
              [...part].forEach(ch => { const c = mk('c', ch); w.appendChild(c); targets.push(c); });
            } else {
              const wi = mk('wi', part); w.appendChild(wi); targets.push(wi);
            }
            parent.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') { parent.appendChild(n.cloneNode()); return; }
          const c = n.cloneNode(false);
          parent.appendChild(c);
          walk(n, c);
        }
      });
    };
    const frag = document.createDocumentFragment();
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);
    return { targets };
  }

  /* ---------------------------------------------------------------
     Préchargeur : fleur dessinée, puis le rideau se lève
     --------------------------------------------------------------- */
  function runLoader() {
    const loader = $('#loader');
    if (!loader) return Promise.resolve();
    const num = $('#loaderNum');
    const paths = $$('[data-draw]', loader);
    gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set('.loader__core', { scale: 0, transformOrigin: '50% 50%' });
    gsap.set('.loader__name', { y: 24, opacity: 0 });
    gsap.set('.loader__flower', { transformOrigin: '50% 60%' });
    const draw = gsap.timeline({ paused: true }).to(paths, { strokeDashoffset: 0, duration: 1, stagger: 0.12, ease: 'none' });
    const st = { p: 0 };
    const paint = () => { num.textContent = Math.round(st.p); draw.progress(st.p / 100); };
    gsap.to('.loader__name', { y: 0, opacity: 1, duration: 1, delay: 0.25, ease: 'power3.out' });

    // On attend l'essentiel (polices + image d'ouverture), pas la vidéo : au plus 4 s.
    const loaded = new Promise(r => {
      const poster = new Promise(ok => { const im = new Image(); im.onload = im.onerror = ok; im.src = 'video/hero-poster.jpg'; });
      const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.all([poster, fonts]).then(r);
      setTimeout(r, 4000);
    });

    return new Promise(resolve => {
      const exit = () => {
        const tl = gsap.timeline({ onComplete: finishLoading });
        tl.to('.loader__core', { scale: 1, duration: 0.5, ease: 'back.out(2.4)' })
          .to('.loader__flower', { scale: 1.12, rotation: 14, duration: 0.9, ease: 'power2.inOut' }, '<')
          .to('.loader__count', { opacity: 0, duration: 0.3 }, '<')
          .to('.loader__inner', { y: -40, opacity: 0, duration: 0.6, ease: 'power2.in' }, '+=0.05')
          .to(loader, { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, '<0.1')
          .add(resolve, '<0.5');
      };
      gsap.to(st, {
        p: 88, duration: 1.4, ease: 'power2.out', onUpdate: paint,
        onComplete: () => loaded.then(() => gsap.to(st, { p: 100, duration: 0.45, ease: 'power1.inOut', onUpdate: paint, onComplete: exit }))
      });
    });
  }

  /* ---------------------------------------------------------------
     Hero : titre lettre par lettre (monté en pause sous le préchargeur)
     --------------------------------------------------------------- */
  function buildHero() {
    const chars = $$('[data-hero-line]').flatMap(l => split(l, 'chars', false).targets);
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
    tl.from('.hero__video', { scale: 1.4, duration: 3.2, ease: 'power3.out' }, 0)
      .from('.hero__shade', { opacity: 0, duration: 1.8 }, 0)
      .from('.hero__kicker', { y: 24, opacity: 0, duration: 1.1 }, 0.5)
      .from(chars, { yPercent: 125, rotation: 7, duration: 1.7, stagger: 0.055 }, 0.4)
      .from('.hero__tag', { y: 30, opacity: 0, duration: 1.2 }, 1.15)
      .from('.hero__cta > *', { y: 34, opacity: 0, duration: 1, stagger: 0.12 }, 1.3)
      .from('.hero__badge', { scale: 0, rotation: -120, duration: 1.5, ease: 'back.out(1.5)' }, 1.4)
      .from('.hero__foot > *', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 1.6)
      .from('.hero__leaves--l', { xPercent: -35, opacity: 0, duration: 2.2 }, 0.2)
      .from('.hero__leaves--r', { xPercent: 35, opacity: 0, duration: 2.2 }, 0.2);
    return tl;
  }
  const heroIntro = buildHero();

  runLoader().then(() => {
    heroIntro.play();
    if (lenis && !menuOpen) lenis.start();
  });

  /* ---------------------------------------------------------------
     Hero : parallax multicouche + souris
     --------------------------------------------------------------- */
  const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__media', { yPercent: 18, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hero__leaves--l', { yPercent: -32, xPercent: -10, rotation: -5, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hero__leaves--r', { yPercent: -48, xPercent: 12, rotation: 6, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hero__content', { yPercent: -16, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true } });
  gsap.to('.hero__badge > svg:first-child', { rotation: 360, ease: 'none', scrollTrigger: { trigger: document.body, start: 0, end: 'max', scrub: true } });

  if (fine) {
    const lx = gsap.quickTo('.hero__leaves--l', 'x', { duration: 1.4, ease: 'power3' });
    const rx = gsap.quickTo('.hero__leaves--r', 'x', { duration: 1.4, ease: 'power3' });
    const tx = gsap.quickTo('.hero__content', 'x', { duration: 1.2, ease: 'power3' });
    $('.hero').addEventListener('pointermove', e => {
      const px = e.clientX / innerWidth - 0.5;
      lx(px * -46); rx(px * 38); tx(px * -14);
    });
  }

  /* ---------------------------------------------------------------
     Navigation : se cache en descendant, revient en remontant
     --------------------------------------------------------------- */
  const nav = $('#nav');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-hidden', self.direction === 1 && y > 520 && !menuOpen);
      if (self.direction === -1) nav.classList.remove('is-hidden');
    }
  });

  /* ---------------------------------------------------------------
     Bandeaux défilants : vitesse et sens réagissent au scroll
     --------------------------------------------------------------- */
  (() => {
    let vel = 0, tdir = 1, sdir = 1;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => { vel = Math.abs(self.getVelocity()) / 60; if (self.direction) tdir = self.direction; } });
    $$('[data-marquee]').forEach(m => {
      const track = $('.marquee__track', m);
      const set = $('.marquee__set', track);
      for (let i = 0; i < 3; i++) { const c = set.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); }
      const base = parseFloat(m.dataset.speed) || 1;
      const dir = parseFloat(m.dataset.dir) || 1;
      let w = 0, x = 0, visible = true;
      const measure = () => { w = set.getBoundingClientRect().width; };
      measure();
      window.addEventListener('resize', measure);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
      new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; })).observe(m);
      gsap.ticker.add(() => {
        if (!visible || !w) return;
        sdir += (tdir - sdir) * 0.06;
        const boost = Math.min(vel, 70) * 0.09;
        x -= (base + boost) * dir * sdir;
        x = gsap.utils.wrap(-w, 0, x);
        track.style.transform = `translate3d(${x}px,0,0)`;
      });
    });
  })();

  /* ---------------------------------------------------------------
     Titres, textes, images : apparitions
     --------------------------------------------------------------- */
  $$('[data-split]').forEach(el => {
    const { targets } = split(el, 'words');
    gsap.from(targets, { yPercent: 118, duration: 1.3, ease: 'power4.out', stagger: 0.07, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  $$('[data-split-chars]').forEach(el => {
    const { targets } = split(el, 'chars');
    gsap.from(targets, { yPercent: 120, rotation: 6, duration: 1.4, ease: 'power4.out', stagger: 0.05, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  const fadeSel = '.eyebrow, .lead, .story__note, .hs__hint, .noel__facts > div, .countdown, .noel__source, .noel__filters, .rating, .reviews__left > .link, .rv__ctrl, .book__how li, .venir__addr a, .hours, .venir__btns, .social li, .carnet__head .hand, .footer__top > div, .footer__bottom, .cta__btns > *';
  const fadeEls = $$(fadeSel).filter(el => !el.closest('.story__steps'));
  gsap.set(fadeEls, { y: 34, opacity: 0 });
  ScrollTrigger.batch(fadeEls, {
    start: 'top 92%', once: true,
    onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', stagger: 0.09, overwrite: true })
  });

  $$('[data-reveal="mask"]').forEach(el => {
    gsap.fromTo(el, { clipPath: 'inset(0% 0% 100% 0% round 40px)' }, { clipPath: 'inset(0% 0% 0% 0% round 40px)', duration: 1.7, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });

  // Chiffres clés : compteurs + cercles dessinés à la main
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const dec = +el.dataset.decimals || 0;
    const o = { v: 0 };
    const fmt = v => v.toFixed(dec).replace('.', ',');
    el.textContent = fmt(0);
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } })
    });
  });
  $$('.stat').forEach((s, i) => {
    const ring = $('[data-draw]', s);
    gsap.set(ring, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.from(s, { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', delay: i * 0.08, scrollTrigger: { trigger: s, start: 'top 90%', once: true } });
    gsap.to(ring, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', delay: 0.5 + i * 0.08, scrollTrigger: { trigger: s, start: 'top 90%', once: true } });
  });
  gsap.to('.stats__petal--a', { y: -140, rotation: 70, ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.stats__petal--b', { y: -90, rotation: -50, ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'bottom top', scrub: true } });

  // Étoiles des avis
  gsap.from('.rating__stars svg', { scale: 0, rotation: -60, duration: 0.8, ease: 'back.out(2)', stagger: 0.1, scrollTrigger: { trigger: '.rating', start: 'top 88%', once: true } });

  // Carnet : numéros + traits de crayon
  $$('[data-tip]').forEach(li => {
    const path = $('[data-draw]', li);
    gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 88%', once: true } })
      .from($('.tip__n', li), { scale: 0, rotation: -50, duration: 0.9, ease: 'back.out(2.2)' })
      .from($$('h3, p', li), { y: 30, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' }, '<0.1')
      .to(path, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, '<0.25');
  });

  // Bouton d'appel final : l'arche s'ouvre
  gsap.fromTo('.cta__arch', { clipPath: 'inset(8% 26% 6% 26% round 900px 900px 0px 0px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none',
    scrollTrigger: { trigger: '.cta', start: 'top 85%', end: 'top 10%', scrub: true }
  });
  gsap.fromTo('.cta__video', { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top 85%', end: 'bottom top', scrub: true } });

  // Footer : la signature géante se lève
  (() => {
    const w = $('.footer__word');
    if (!w) return;
    const { targets } = split(w, 'chars', false);
    gsap.from(targets, { yPercent: 115, duration: 1.6, ease: 'power4.out', stagger: 0.04, scrollTrigger: { trigger: w, start: 'top 95%', once: true } });
  })();

  /* ---------------------------------------------------------------
     Sections qui changent selon la taille d'écran
     --------------------------------------------------------------- */
  const mm = gsap.matchMedia();

  /* ===== Bureau : histoire pinnée, défilement horizontal, colonnes parallax ===== */
  mm.add('(min-width: 900px)', () => {
    // — L'Atelier : storytelling étape par étape, pinné
    const sec = $('.story');
    const imgs = $$('.story__img');
    const steps = $$('.story__step');
    const dots = $$('.story__dots li');
    gsap.set(imgs.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(imgs[0], { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(steps.slice(1), { autoAlpha: 0, y: 50 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });
    gsap.set($$('img', sec).filter(i => i.closest('.story__img')), { scale: 1.2 });
    dots[0].classList.add('is-on');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: sec, start: 'top top', end: '+=330%', pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => {
          const i = Math.min(steps.length - 1, Math.round(self.progress * (steps.length - 1)));
          dots.forEach((d, k) => d.classList.toggle('is-on', k <= i));
        }
      }
    });
    tl.to($('img', imgs[0]), { scale: 1, duration: 1 }, 0);
    steps.forEach((_, i) => {
      if (!i) return;
      tl.to(steps[i - 1], { autoAlpha: 0, y: -50, duration: 0.3 }, i - 0.4)
        .fromTo(imgs[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6 }, i - 0.4)
        .to($('img', imgs[i]), { scale: 1, duration: 1.2 }, i - 0.4)
        .fromTo(steps[i], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.35 }, i - 0.1);
    });
    tl.to({}, { duration: 0.001 }, steps.length);

    // — Créations : défilement horizontal piloté par le scroll vertical
    const hs = $('.hs');
    const track = $('.hs__track');
    const prog = document.createElement('div');
    prog.className = 'hs__progress'; prog.setAttribute('aria-hidden', 'true'); prog.innerHTML = '<i></i>';
    $('.hs__pin').appendChild(prog);
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const hTween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: hs, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => { $('i', prog).style.transform = `scaleX(${self.progress})`; }
      }
    });
    $$('.card__media img', track).forEach(img => {
      gsap.fromTo(img, { xPercent: -9 }, {
        xPercent: 9, ease: 'none',
        scrollTrigger: { trigger: img.closest('.card'), containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true }
      });
    });
    $$('.card', track).forEach(c => {
      gsap.from(c, { y: 80, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: hs, start: 'top 60%', once: true } });
    });

    // — Galerie : trois colonnes qui n'avancent pas à la même vitesse
    $$('.gal__col').forEach(col => {
      const sp = parseFloat(col.dataset.speed) || 0;
      gsap.fromTo(col, { y: sp * 60 }, { y: sp * -60, ease: 'none', scrollTrigger: { trigger: '.gal__cols', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // — Images qui bougent dans leur cadre
    $$('.gal__item img').forEach(img => {
      gsap.fromTo(img, { yPercent: -7, scale: 1.16 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.closest('.gal__item'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    return () => { prog.remove(); };
  });

  /* ===== Mobile : mise en scène simplifiée ===== */
  mm.add('(max-width: 899px)', () => {
    $$('.story__step').forEach(s => {
      gsap.from(s, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 88%', once: true } });
      const im = $('.story__mimg', s);
      if (im) gsap.from(im, { clipPath: 'inset(0% 0% 100% 0% round 30px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: im, start: 'top 90%', once: true } });
    });
    $$('.gal__item').forEach(it => {
      gsap.from(it, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: it, start: 'top 92%', once: true } });
    });
    $$('.card').forEach((c, i) => {
      gsap.from(c, { x: 60, opacity: 0, duration: 1, ease: 'power3.out', delay: i * 0.04, scrollTrigger: { trigger: '.hs__track', start: 'top 85%', once: true } });
    });
  });

  /* ---------- Précommande : étiquettes qui arrivent ---------- */
  gsap.from('.tag', {
    y: 70, opacity: 0, rotation: () => gsap.utils.random(-5, 5), duration: 1, ease: 'power3.out', stagger: 0.05,
    scrollTrigger: { trigger: '#noelGrid', start: 'top 88%', once: true }
  });
  const cartbar = $('#cartbar');
  if (cartbar) {
    new MutationObserver(() => { if (!cartbar.hidden) gsap.fromTo(cartbar, { yPercent: 130 }, { yPercent: 0, duration: 0.7, ease: 'power3.out', overwrite: true }); })
      .observe(cartbar, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ---------- Réservation : changement d'étape ---------- */
  $$('.step').forEach(s => {
    new MutationObserver(() => { if (!s.hidden) gsap.fromTo(s, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', overwrite: true }); })
      .observe(s, { attributes: true, attributeFilter: ['hidden'] });
  });
  gsap.from('.ticket', { y: 80, rotation: 2, opacity: 0, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: '.ticket', start: 'top 88%', once: true } });

  /* ---------------------------------------------------------------
     Micro-interactions
     --------------------------------------------------------------- */
  if (fine) {
    // Inclinaison 3D + reflet qui suit la souris
    $$('[data-tilt]').forEach(el => {
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * 9); rx(-py * 9);
        el.style.setProperty('--mx', (px + 0.5) * 100 + '%');
        el.style.setProperty('--my', (py + 0.5) * 100 + '%');
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });

    // Boutons magnétiques
    $$('.btn--mag').forEach(b => {
      const xt = gsap.quickTo(b, 'x', { duration: 0.7, ease: 'power3' });
      const yt = gsap.quickTo(b, 'y', { duration: 0.7, ease: 'power3' });
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        xt((e.clientX - (r.left + r.width / 2)) * 0.32);
        yt((e.clientY - (r.top + r.height / 2)) * 0.45);
      });
      b.addEventListener('pointerleave', () => { xt(0); yt(0); });
    });

    // Curseur discret (anneau) avec étiquette contextuelle
    const cur = $('.cursor');
    if (cur) {
      const ring = $('.cursor__ring', cur);
      const lab = $('.cursor__label', cur);
      const cx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
      const cy = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
      window.addEventListener('pointermove', e => { cur.classList.add('is-on'); cx(e.clientX); cy(e.clientY); }, { passive: true });
      document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
      document.addEventListener('pointerover', e => {
        const t = e.target.closest('[data-cursor]');
        if (t) { lab.textContent = t.dataset.cursor; cur.classList.add('is-label'); cur.classList.remove('is-link'); return; }
        cur.classList.remove('is-label');
        cur.classList.toggle('is-link', !!e.target.closest('a, button, label, select, input, textarea'));
      });
    }
  }

  /* ---------------------------------------------------------------
     Recalcul des positions quand le contenu change
     --------------------------------------------------------------- */
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  document.addEventListener('jf:layout', refresh);
})();
