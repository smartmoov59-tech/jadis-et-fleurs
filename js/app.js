/* ==========================================================================
   Jadis & Fleurs — logique du site (sans animation) :
   horaires en direct, précommande de Noël, demande de retrait (e-mail / téléphone /
   agenda .ics), carrousel d'avis, visionneuse photo, mentions légales.
   Aucun serveur : tout se passe dans le navigateur du visiteur.
   ========================================================================== */
(() => {
  'use strict';
  const S = window.JF;
  if (!S) return;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const pad = n => String(n).padStart(2, '0');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toMin = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const fmtHM = hm => { const [h, m] = hm.split(':'); return `${+h}h${m}`; };
  const fmtT = t => `${Math.floor(t / 60)}h${pad(t % 60)}`;
  const eur = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00a0€';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const DAYS_S = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MONTHS_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layoutChanged = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => document.dispatchEvent(new Event('jf:layout')), 120); }; })();

  /* Défilement : remplacé par Lenis dans main.js quand il est actif */
  window.JFScroll = window.JFScroll || (target => {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- Date / heure à Paris ---------- */
  const dtf = new Intl.DateTimeFormat('en-GB', { timeZone: S.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function parisNow(date = new Date()) {
    const p = {};
    dtf.formatToParts(date).forEach(x => { p[x.type] = x.value; });
    const y = +p.year, m = +p.month, d = +p.day, h = (+p.hour) % 24, mi = +p.minute;
    return { y, m, d, h, mi, min: h * 60 + mi, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), ymd: `${y}-${pad(m)}-${pad(d)}` };
  }
  const addDays = (ymd, n) => {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  };
  const dowOf = ymd => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
  const longDate = ymd => { const [, m, d] = ymd.split('-').map(Number); return `${DAYS[dowOf(ymd)]} ${d} ${MONTHS[m - 1]}`; };

  /* ---------- Horaires en direct ---------- */
  function openStatus() {
    const n = parisNow();
    const todays = S.hours[n.dow] || [];
    if (!S.closedDates.includes(n.ymd)) {
      for (const [a, b] of todays) {
        if (n.min >= toMin(a) && n.min < toMin(b)) {
          const soon = toMin(b) - n.min <= 30;
          return { open: true, text: `Ouvert · ${soon ? 'ferme bientôt, ' : ''}jusqu’à ${fmtHM(b)}` };
        }
      }
      for (const [a] of todays) {
        if (toMin(a) > n.min) return { open: false, text: `Fermé · rouvre à ${fmtHM(a)}` };
      }
    }
    for (let i = 1; i <= 7; i++) {
      const ymd = addDays(n.ymd, i);
      if (S.closedDates.includes(ymd)) continue;
      const sl = S.hours[dowOf(ymd)];
      if (sl && sl.length) return { open: false, text: `Fermé · rouvre ${i === 1 ? 'demain' : DAYS[dowOf(ymd)]} à ${fmtHM(sl[0][0])}` };
    }
    return { open: false, text: 'Fermé' };
  }

  function renderHours() {
    const list = $('#hoursList');
    if (list && !list.children.length) {
      list.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d =>
        `<li data-dow="${d}"><span>${cap(DAYS[d])}</span><span>${S.hours[d].map(([a, b]) => `${fmtHM(a)} – ${fmtHM(b)}`).join('<i> · </i>')}</span></li>`
      ).join('');
    }
    const n = parisNow();
    $$('#hoursList li').forEach(li => li.classList.toggle('is-today', +li.dataset.dow === n.dow));
    const st = openStatus();
    ['#openStatus', '#hoursStatus'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      el.classList.toggle('is-open', st.open);
      const sp = $('span', el);
      if (sp) sp.textContent = st.text;
    });
  }
  renderHours();
  setInterval(renderHours, 60000);

  /* ---------- Précommande de Noël ---------- */
  const N = S.noel;
  const items = N.items;
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const cart = {};
  const deadline = new Date(N.deadlineISO).getTime();
  const noelClosed = () => Date.now() > deadline;
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartSum = () => Object.entries(cart).reduce((a, [id, q]) => a + byId[id].price * q, 0);

  const grid = $('#noelGrid');
  const filters = $('#noelFilters');
  if (grid) {
    grid.innerHTML = items.map(it => `
      <li class="tag" data-id="${it.id}" data-cat="${it.cat}" data-tilt>
        <span class="tag__hole" aria-hidden="true"></span>
        <div class="tag__body">
          <figure class="tag__photo"><img src="${esc(it.img || 'img/plantes/' + it.id + '.jpg')}" alt="${esc(it.name)} (photo d’illustration)" width="640" height="720" loading="lazy" decoding="async"></figure>
          <span class="tag__cat">${esc(N.categories[it.cat])}</span>
          <h3>${esc(it.name)}</h3>
          <p class="tag__spec">${esc(it.spec)}</p>
          <div class="tag__foot">
            <b class="tag__price">${eur(it.price)}</b>
            <div class="qty" role="group" aria-label="Quantité : ${esc(it.name)} (${esc(it.spec)})">
              <button type="button" data-q="-1" aria-label="Retirer un(e) ${esc(it.name)}" disabled>−</button>
              <output aria-live="polite">0</output>
              <button type="button" data-q="1" aria-label="Ajouter un(e) ${esc(it.name)} à la précommande">+</button>
            </div>
          </div>
        </div>
      </li>`).join('');

    filters.innerHTML = `<button type="button" class="is-on" data-cat="all">Tout <small>${items.length}</small></button>` +
      Object.entries(N.categories).map(([k, v]) => `<button type="button" data-cat="${k}">${esc(v)} <small>${items.filter(i => i.cat === k).length}</small></button>`).join('');

    const setPhoto = cat => $$('.noel__ph').forEach(f => f.classList.toggle('is-on', f.dataset.for === cat));
    filters.addEventListener('click', e => {
      const b = e.target.closest('button[data-cat]');
      if (!b) return;
      $$('button', filters).forEach(x => x.classList.toggle('is-on', x === b));
      const cat = b.dataset.cat;
      $$('.tag', grid).forEach(t => { t.hidden = !(cat === 'all' || t.dataset.cat === cat); });
      if (cat !== 'all') setPhoto(cat);
      layoutChanged();
    });
    grid.addEventListener('pointerover', e => { const t = e.target.closest('.tag'); if (t) setPhoto(t.dataset.cat); });
    grid.addEventListener('focusin', e => { const t = e.target.closest('.tag'); if (t) setPhoto(t.dataset.cat); });
    grid.addEventListener('click', e => {
      const b = e.target.closest('button[data-q]');
      if (!b || noelClosed()) return;
      const tag = b.closest('.tag');
      const id = tag.dataset.id;
      const q = Math.max(0, Math.min(20, (cart[id] || 0) + Number(b.dataset.q)));
      if (q) cart[id] = q; else delete cart[id];
      $('output', tag).textContent = q;
      tag.classList.toggle('is-in', q > 0);
      $('[data-q="-1"]', tag).disabled = q === 0;
      cartChanged();
    });
  }

  function updateCountdown() {
    const sec = $('#countdown');
    if (!sec) return;
    const ms = deadline - Date.now();
    const closed = ms <= 0;
    $('#noel')?.classList.toggle('is-closed', closed);
    sec.hidden = closed;
    const cl = $('#noelClosed');
    if (cl) cl.hidden = !closed;
    if (closed) {
      $$('.qty button').forEach(b => { b.disabled = true; });
      return;
    }
    const s = Math.floor(ms / 1000);
    const v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
    Object.entries(v).forEach(([k, n]) => { const el = $(`[data-cd="${k}"]`, sec); if (el) el.textContent = pad(n); });
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);
  const dl = $('#noelDeadline');
  if (dl) dl.textContent = N.deadlineLabel;

  /* ---------- Demande de retrait ---------- */
  const B = { type: '', occasion: '', budget: '', date: '', time: '', name: '', phone: '', email: '', message: '' };
  const form = $('#bookForm');
  const typeChips = $('#typeChips');
  const budgetChips = $('#budgetChips');
  const dateStrip = $('#dateStrip');
  const slotGrid = $('#slotGrid');
  const typeLabel = () => (S.types.find(t => t.id === B.type) || {}).label || '';

  if (form) {
    typeChips.innerHTML = S.types.map(t =>
      `<label class="chip chip--img"><input type="radio" name="type" value="${t.id}"${t.id === 'precommande' && noelClosed() ? ' disabled' : ''}><span>${t.thumb ? `<img src="${esc(t.thumb)}" alt="" width="48" height="48" loading="lazy">` : ''}${esc(t.label)}</span></label>`).join('');
    budgetChips.innerHTML = S.budgets.map(b =>
      `<label class="chip chip--sm"><input type="radio" name="budget" value="${esc(b)}"><span>${esc(b)}</span></label>`).join('');
  }

  function minDate() {
    const n = parisNow();
    return cartCount() > 0 && N.readyFrom > n.ymd ? N.readyFrom : n.ymd;
  }
  function slotsFor(ymd) {
    if (S.closedDates.includes(ymd)) return [];
    const n = parisNow();
    const out = [];
    (S.hours[dowOf(ymd)] || []).forEach(([a, b]) => { for (let t = toMin(a); t + 30 <= toMin(b); t += 30) out.push(t); });
    return ymd === n.ymd ? out.filter(t => t >= n.min + S.leadMinutes) : out;
  }

  function renderDates() {
    if (!dateStrip) return;
    const start = minDate();
    if (B.date && (B.date < start || slotsFor(B.date).length === 0)) { B.date = ''; B.time = ''; }
    let html = '';
    for (let i = 0; i < 30; i++) {
      const ymd = addDays(start, i);
      const [, m, d] = ymd.split('-').map(Number);
      const dis = slotsFor(ymd).length === 0;
      html += `<label class="date${dis ? ' is-off' : ''}"><input type="radio" name="date" value="${ymd}"${dis ? ' disabled' : ''}${B.date === ymd ? ' checked' : ''}><span><small>${DAYS_S[dowOf(ymd)]}</small><b>${d}</b><em>${MONTHS_S[m - 1]}</em></span></label>`;
    }
    dateStrip.innerHTML = html;
    const hint = $('#dateHint');
    if (hint) {
      hint.textContent = cartCount() > 0
        ? `Votre précommande de Noël est disponible à partir du ${N.readyLabel} : les jours précédents ne sont pas proposés.`
        : `Choisissez un jour, puis une heure. La boutique est ouverte 7 jours sur 7 (voir les horaires plus bas).`;
    }
    renderSlots();
  }
  function renderSlots() {
    if (!slotGrid) return;
    if (!B.date) { slotGrid.innerHTML = `<p class="slots__empty">Choisissez d’abord un jour pour voir les heures de retrait.</p>`; return; }
    const sl = slotsFor(B.date);
    if (!sl.some(t => fmtT(t) === B.time)) B.time = '';
    slotGrid.innerHTML = sl.map(t => `<label class="slot"><input type="radio" name="slot" value="${fmtT(t)}"${fmtT(t) === B.time ? ' checked' : ''}><span>${fmtT(t)}</span></label>`).join('');
  }

  function cartLines() {
    return Object.entries(cart).map(([id, q]) => ({ it: byId[id], q }));
  }
  function validPhone(v) { return v.replace(/\D/g, '').length >= 10; }
  function validMail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }
  function missing() {
    const m = [];
    if (!B.type && cartCount() === 0) m.push({ step: 1, label: 'ce que vous souhaitez', focus: '#typeChips input' });
    if (!B.date || !B.time) m.push({ step: 2, label: 'le jour et l’heure de retrait', focus: '#dateStrip input:not(:disabled)' });
    if (!B.name.trim()) m.push({ step: 3, label: 'votre nom', focus: '#f-name' });
    if (!(validPhone(B.phone) || validMail(B.email))) m.push({ step: 3, label: 'un téléphone ou un e-mail', focus: '#f-phone' });
    return m;
  }

  function buildBody() {
    const L = [];
    L.push('Bonjour,', '', 'Je souhaite passer la commande suivante (demande faite depuis le site Jadis & Fleurs) :', '');
    const t = typeLabel() || (cartCount() ? 'Précommande plantes de Noël' : '');
    if (t) L.push(`• Envie : ${t}`);
    if (B.occasion) L.push(`• Occasion : ${B.occasion}`);
    if (B.budget && B.type !== 'precommande') L.push(`• Budget indicatif : ${B.budget}`);
    L.push(`• Retrait en boutique : ${longDate(B.date)} à ${B.time}`);
    if (cartCount()) {
      L.push('', 'Précommande de plantes de Noël :');
      cartLines().forEach(({ it, q }) => L.push(`  ${q} × ${it.name} (${it.spec}) — ${eur(it.price * q)}`));
      L.push(`  Total : ${eur(cartSum())}`);
    }
    if (B.message.trim()) L.push('', `Précisions : ${B.message.trim()}`);
    L.push('', `Mes coordonnées : ${[B.name.trim(), B.phone.trim(), B.email.trim()].filter(Boolean).join(' — ')}`, '', 'Merci de me confirmer la disponibilité et l’heure de retrait.', 'Cordialement');
    return L.join('\n').replace(/\u00a0/g, ' ');
  }
  function buildSubject() {
    const t = typeLabel() || (cartCount() ? 'Précommande plantes de Noël' : 'Commande');
    return `Demande de retrait — ${t} — ${longDate(B.date)} ${B.time}`;
  }

  function renderTicket() {
    const lines = $('#ticketLines');
    if (!lines) return;
    const row = (k, v, empty) => `<div class="${empty ? 'is-empty' : ''}"><dt>${k}</dt><dd>${v}</dd></div>`;
    let h = '';
    const t = typeLabel();
    h += row('Envie', t ? esc(t) : (cartCount() ? 'Précommande de Noël' : 'À choisir'), !t && !cartCount());
    if (B.occasion) h += row('Occasion', esc(B.occasion));
    if (B.budget && B.type !== 'precommande') h += row('Budget', esc(B.budget));
    h += row('Retrait', B.date ? `${esc(longDate(B.date))}${B.time ? ' · ' + B.time : ''}` : 'À choisir', !B.date);
    cartLines().forEach(({ it, q }) => { h += `<div class="ticket__item"><dt>${q} × ${esc(it.name)}<small>${esc(it.spec)}</small></dt><dd>${eur(it.price * q)}</dd></div>`; });
    const who = [B.name.trim(), B.phone.trim(), B.email.trim()].filter(Boolean).map(esc).join('<br>');
    h += row('Contact', who || 'À renseigner', !who);
    lines.innerHTML = h;
    const tot = $('#ticketTotal');
    if (tot) { tot.hidden = cartCount() === 0; $('#ticketSum').textContent = eur(cartSum()); }

    const miss = missing();
    const st = $('#ticketStatus');
    if (st) {
      st.classList.toggle('is-ready', miss.length === 0);
      st.textContent = miss.length ? `Il manque encore : ${miss.map(m => m.label).join(', ')}.` : 'Votre demande est prête : envoyez-la à la boutique.';
    }
    const mail = $('#btnMail');
    if (mail) {
      mail.href = miss.length ? `mailto:${S.email}` : `mailto:${S.email}?subject=${encodeURIComponent(buildSubject())}&body=${encodeURIComponent(buildBody()).replace(/%0A/g, '%0D%0A')}`;
      mail.classList.toggle('is-wait', miss.length > 0);
    }
    const sms = $('#btnSms');
    if (sms) {
      sms.hidden = !S.sms;
      if (S.sms) sms.href = `sms:${S.sms}?&body=${encodeURIComponent(buildBody())}`;
      sms.classList.toggle('is-wait', miss.length > 0);
    }
    $('#btnCopy')?.classList.toggle('is-wait', miss.length > 0);
    $('#btnIcs')?.classList.toggle('is-wait', !B.date || !B.time);
  }

  let noelInView = false;
  const noelSec = $('#noel');
  if (noelSec) new IntersectionObserver(es => { noelInView = es[0].isIntersecting; cartChanged(); }, { threshold: 0.05 }).observe(noelSec);

  function cartChanged() {
    const n = cartCount();
    const bar = $('#cartbar');
    if (bar) {
      bar.hidden = n === 0 || noelClosed() || !noelInView;
      $('#cartCount').textContent = `${n} plante${n > 1 ? 's' : ''}`;
      $('#cartTotal').textContent = eur(cartSum());
    }
    const note = $('#cartNote');
    if (note) {
      if (n > 0) {
        note.hidden = false;
        note.innerHTML = `Votre précommande de Noël : <b>${n} plante${n > 1 ? 's' : ''}, ${eur(cartSum())}</b> (retrait à partir du ${esc(N.readyLabel)}). <a href="#noel" data-scroll>Modifier</a>`;
      } else if (B.type === 'precommande') {
        note.hidden = false;
        note.innerHTML = `Aucune plante choisie pour l’instant : <a href="#noel" data-scroll>sélectionnez vos plantes de Noël</a>.`;
      } else note.hidden = true;
    }
    renderDates();
    renderTicket();
  }

  function setStep(n, focus) {
    $$('.step', form).forEach(s => { const on = +s.dataset.step === n; s.hidden = !on; s.classList.toggle('is-active', on); });
    $$('.steps__btn', form).forEach(b => { const on = +b.dataset.goto === n; b.classList.toggle('is-active', on); if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    if (focus) { const lg = $(`.step[data-step="${n}"] legend`, form); if (lg) { lg.setAttribute('tabindex', '-1'); lg.focus({ preventScroll: true }); } }
    layoutChanged();
  }

  function setType(id) {
    B.type = id;
    const input = $(`input[name="type"][value="${id}"]`, form);
    if (input && !input.disabled) input.checked = true;
    cartChanged();
  }

  if (form) {
    form.addEventListener('change', e => {
      const el = e.target;
      if (el.name === 'type') B.type = el.value;
      else if (el.name === 'budget') B.budget = el.value;
      else if (el.name === 'occasion') B.occasion = el.value;
      else if (el.name === 'date') { B.date = el.value; B.time = ''; renderSlots(); }
      else if (el.name === 'slot') B.time = el.value;
      cartChanged();
    });
    form.addEventListener('input', e => {
      const el = e.target;
      if (el.name === 'name') B.name = el.value;
      else if (el.name === 'phone') B.phone = el.value;
      else if (el.name === 'email') B.email = el.value;
      else if (el.name === 'message') B.message = el.value;
      else return;
      renderTicket();
    });
    form.addEventListener('submit', e => e.preventDefault());
    form.addEventListener('click', e => {
      const go = e.target.closest('[data-goto]');
      const nx = e.target.closest('[data-next]');
      const pv = e.target.closest('[data-prev]');
      const cur = +($('.step.is-active', form).dataset.step);
      if (go) setStep(+go.dataset.goto, true);
      else if (nx) setStep(Math.min(3, cur + 1), true);
      else if (pv) setStep(Math.max(1, cur - 1), true);
    });
  }

  /* Boutons « demander / réserver » dans le reste de la page */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-prefill]');
    if (!b || !form) return;
    setType(b.dataset.prefill);
    setStep(1);
    if (b.tagName === 'BUTTON') window.JFScroll('#reserver');
  });

  function gate(kind) {
    const miss = kind === 'ics' ? missing().filter(m => m.step === 2) : missing();
    if (!miss.length) return true;
    const st = $('#ticketStatus');
    if (st) { st.classList.remove('is-ready'); st.textContent = `Il manque encore : ${miss.map(m => m.label).join(', ')}.`; }
    setStep(miss[0].step, true);
    const f = $(miss[0].focus);
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
    window.JFScroll('#reserver');
    return false;
  }
  function flash(msg) {
    const st = $('#ticketStatus');
    if (!st) return;
    st.classList.add('is-ready');
    st.textContent = msg;
  }

  $('#btnMail')?.addEventListener('click', e => {
    if (!gate('mail')) { e.preventDefault(); return; }
    setTimeout(() => flash('Si votre messagerie ne s’est pas ouverte, utilisez « Copier la demande » puis collez-la dans un e-mail à ' + S.email + '.'), 900);
  });
  $('#btnSms')?.addEventListener('click', e => { if (!gate('sms')) e.preventDefault(); });
  $('#btnCopy')?.addEventListener('click', async () => {
    if (!gate('copy')) return;
    const text = `À : ${S.email}\nObjet : ${buildSubject()}\n\n${buildBody()}`;
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (__) { /* rien */ } ta.remove();
    }
    flash('Demande copiée. Collez-la dans un e-mail à ' + S.email + '.');
  });

  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) { const out = []; let l = line; while (l.length > 73) { out.push(l.slice(0, 73)); l = ' ' + l.slice(73); } out.push(l); return out.join('\r\n'); }
  function buildICS() {
    const [y, m, d] = B.date.split('-');
    const t0 = toMin(B.time.replace('h', ':'));
    const t1 = t0 + 30;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const desc = [typeLabel() || 'Commande', cartCount() ? `Précommande : ${cartLines().map(l => `${l.q} × ${l.it.name}`).join(', ')} (${eur(cartSum())})` : '', `Boutique : ${S.tel}`, 'Retrait à confirmer avec la boutique.'].filter(Boolean).join('\n');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jadis & Fleurs//Retrait//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE', 'TZID:Europe/Paris',
      'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
      'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      `UID:${Date.now()}-${Math.random().toString(36).slice(2, 8)}@jadisetfleurs`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Paris:${y}${m}${d}T${pad(Math.floor(t0 / 60))}${pad(t0 % 60)}00`,
      `DTEND;TZID=Europe/Paris:${y}${m}${d}T${pad(Math.floor(t1 / 60))}${pad(t1 % 60)}00`,
      `SUMMARY:${icsEscape('Retrait Jadis & Fleurs')}`,
      `LOCATION:${icsEscape('Jadis & Fleurs, ' + S.address)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Retrait Jadis & Fleurs', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  $('#btnIcs')?.addEventListener('click', () => {
    if (!gate('ics')) return;
    const blob = new Blob([buildICS()], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'retrait-jadis-et-fleurs.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    flash('Rendez-vous ajouté : ouvrez le fichier .ics téléchargé pour l’enregistrer dans votre agenda.');
  });

  /* ---------- Liste « occasion » aux couleurs du site (remplace la liste du navigateur) ---------- */
  (() => {
    const rootEl = $('#occasionSelect');
    if (!rootEl) return;
    const native = $('select', rootEl);
    const btn = $('.select__btn', rootEl);
    const list = $('.select__list', rootEl);
    const val = $('.select__val', rootEl);
    const opts = Array.from(native.options);
    let idx = 0, active = 0;
    list.innerHTML = opts.map((o, i) =>
      `<li role="option" id="occ-${i}" class="select__opt${o.value ? '' : ' is-empty'}" data-i="${i}" aria-selected="${i === 0}">${esc(o.text)}</li>`).join('');
    const items = $$('.select__opt', list);

    function setActive(i) {
      active = (i + opts.length) % opts.length;
      items.forEach((li, k) => li.classList.toggle('is-active', k === active));
      list.setAttribute('aria-activedescendant', 'occ-' + active);
      items[active].scrollIntoView({ block: 'nearest' });
    }
    function open() {
      rootEl.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      setActive(idx);
      list.focus({ preventScroll: true });
    }
    function close(back) {
      rootEl.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (back) btn.focus({ preventScroll: true });
    }
    function choose(i) {
      idx = i;
      native.value = opts[i].value;
      val.textContent = opts[i].text;
      val.classList.toggle('is-placeholder', !opts[i].value);
      items.forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
      native.dispatchEvent(new Event('change', { bubbles: true }));
      close(true);
    }
    btn.addEventListener('click', () => (rootEl.classList.contains('is-open') ? close() : open()));
    btn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } });
    list.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') close();
    });
    list.addEventListener('click', e => { const li = e.target.closest('.select__opt'); if (li) choose(+li.dataset.i); });
    list.addEventListener('pointermove', e => { const li = e.target.closest('.select__opt'); if (li && +li.dataset.i !== active) setActive(+li.dataset.i); });
    document.addEventListener('pointerdown', e => { if (!rootEl.contains(e.target)) close(); });
  })();

  renderDates();
  renderTicket();
  cartChanged();

  /* ---------- Carrousel d'avis ---------- */
  (() => {
    const track = $('#rvTrack');
    if (!track) return;
    const cards = $$('.rv__card', track);
    const bar = $('#rvBar');
    const root = $('#rv');
    let idx = 0, timer = null, hold = false;
    const DELAY = 7000;

    function progress() {
      if (!bar) return;
      bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)';
      void bar.offsetWidth;
      if (reduce) { bar.style.transform = `scaleX(${(idx + 1) / cards.length})`; return; }
      bar.style.transition = `transform ${DELAY}ms linear`; bar.style.transform = 'scaleX(1)';
    }
    function go(i) {
      idx = (i + cards.length) % cards.length;
      const x = cards[idx].offsetLeft - cards[0].offsetLeft;
      track.style.transform = `translate3d(${-x}px,0,0)`;
      cards.forEach((c, k) => c.classList.toggle('is-active', k === idx));
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      progress();
      if (reduce || hold) return;
      timer = setTimeout(() => go(idx + 1), DELAY);
    }
    $('#rvPrev')?.addEventListener('click', () => go(idx - 1));
    $('#rvNext')?.addEventListener('click', () => go(idx + 1));
    root.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(idx - 1); if (e.key === 'ArrowRight') go(idx + 1); });
    ['mouseenter', 'focusin'].forEach(ev => root.addEventListener(ev, () => { hold = true; clearTimeout(timer); if (bar) { bar.style.transition = 'none'; } }));
    ['mouseleave', 'focusout'].forEach(ev => root.addEventListener(ev, () => { hold = false; schedule(); }));
    let sx = 0, drag = false;
    const vp = $('.rv__viewport', root);
    vp.addEventListener('pointerdown', e => { sx = e.clientX; drag = true; });
    window.addEventListener('pointerup', e => { if (!drag) return; drag = false; const dx = e.clientX - sx; if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1)); });
    new IntersectionObserver(es => { es.forEach(en => { hold = !en.isIntersecting; if (en.isIntersecting) schedule(); else clearTimeout(timer); }); }, { threshold: .35 }).observe(root);
    window.addEventListener('resize', () => go(idx));
    go(0);
  })();

  /* ---------- Visionneuse photo ---------- */
  (() => {
    const lb = $('#lightbox');
    if (!lb) return;
    const btns = $$('[data-lightbox]');
    let cur = 0;
    const show = i => {
      cur = (i + btns.length) % btns.length;
      const img = $('img', btns[cur]);
      $('#lbImg').src = img.currentSrc || img.src;
      $('#lbImg').alt = img.alt;
      $('#lbCap').textContent = $('figcaption', btns[cur])?.textContent || '';
    };
    btns.forEach((b, i) => b.addEventListener('click', () => { show(i); lb.showModal(); window.dispatchEvent(new Event('jf:lock')); }));
    lb.addEventListener('close', () => window.dispatchEvent(new Event('jf:unlock')));
    $('[data-lb-close]', lb).addEventListener('click', () => lb.close());
    $('[data-lb-prev]', lb).addEventListener('click', () => show(cur - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => show(cur + 1));
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  })();

  /* ---------- Mentions légales ---------- */
  (() => {
    const d = $('#legal');
    if (!d) return;
    $('#legalBtn')?.addEventListener('click', () => { d.showModal(); window.dispatchEvent(new Event('jf:lock')); });
    $('[data-legal-close]', d).addEventListener('click', () => d.close());
    d.addEventListener('close', () => window.dispatchEvent(new Event('jf:unlock')));
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
  })();

  /* ---------- Vidéos ---------- */
  (() => {
    const saveData = navigator.connection && navigator.connection.saveData;
    const hv = $('#heroVideo');
    if (hv && !reduce && !saveData) {
      if (window.innerWidth >= 900) hv.src = 'video/hero-hd_1920_1080_25fps.mp4';
      hv.muted = true;
      const p = hv.play(); if (p && p.catch) p.catch(() => { /* lecture refusée : l'affiche reste visible */ });
    }
    const lv = $('[data-lazyvideo]');
    if (lv && !reduce && !saveData) {
      const src = $('source', lv);
      let loaded = false;
      new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting) {
          if (!loaded) { src.src = src.dataset.src; lv.load(); loaded = true; }
          const p = lv.play(); if (p && p.catch) p.catch(() => {});
        } else if (loaded) lv.pause();
      }), { rootMargin: '300px' }).observe(lv);
    }
  })();

  /* ---------- Divers ---------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  const fab = $('#fab');
  const hero = $('#top');
  if (fab && hero) new IntersectionObserver(es => es.forEach(en => fab.classList.toggle('is-on', !en.isIntersecting)), { threshold: .15 }).observe(hero);
})();
