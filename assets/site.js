/* shawon.art — shell behaviour = Artist Hub's interaction suite, content swapped.
   Landing: Motion@11 hero line-reveal, scroll reveals, stagger, counters, nav scroll-state,
   progress bar, hero parallax, flow-rail fill. Dashboard: liquid-glass morphing selector,
   press-squish, glass tooltips, toast, ⌘K command palette. Console: ident strip.
   (tilt / specular / ripple were dialled back in Artist Hub — deliberately not ported.) */
const ROOT = document.documentElement;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ---- current page → nav / tab bar state ---- */
(function markCurrent() {
  const page = document.body.dataset.page || '';
  $$('[data-tab]').forEach(function (a) {
    if (a.dataset.tab === page) { a.classList.add('on'); a.setAttribute('aria-current', 'page'); }
  });
})();

/* ---- More sheet (phone / tablet) ---- */
(function setupMore() {
  const more = $('[data-more]'); const btn = $('[data-more-btn]');
  if (!more || !btn) return;
  const scrim = $('.more-scrim', more);
  function open() { more.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); more.removeAttribute('aria-hidden'); }
  function close() { more.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); more.setAttribute('aria-hidden', 'true'); }
  btn.addEventListener('click', function () { more.classList.contains('open') ? close() : open(); });
  if (scrim) scrim.addEventListener('click', close);
  $$('a', more).forEach(function (a) { a.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  window.addEventListener('popstate', close);
})();

/* ---- Work filters (?category=) ---- */
(function setupFilters() {
  const bar = $('[data-filters]'); if (!bar) return;
  const cards = $$('[data-cat]'); const empty = $('[data-empty]');
  function apply(cat) {
    let n = 0;
    cards.forEach(function (c) { const show = cat === 'all' || c.dataset.cat === cat; c.hidden = !show; if (show) n++; });
    if (empty) empty.hidden = n > 0;
    $$('.filter', bar).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.filter === cat ? 'true' : 'false'); });
    const banner = $('[data-graphic-banner]'); if (banner) banner.hidden = cat !== 'graphic';
  }
  bar.addEventListener('click', function (e) {
    const b = e.target.closest('.filter'); if (!b) return;
    apply(b.dataset.filter);
    const u = new URL(location.href); if (b.dataset.filter === 'all') u.searchParams.delete('category'); else u.searchParams.set('category', b.dataset.filter);
    history.replaceState(null, '', u);
  });
  const q = new URLSearchParams(location.search).get('category');
  apply(q && $$('.filter', bar).some(function (b) { return b.dataset.filter === q; }) ? q : 'all');
})();

/* ---- toast (Artist Hub: types, icon, dismiss, hover-pause, max 3) ---- */
const TOAST_IC = { ok: 'ti-circle-check', warn: 'ti-alert-triangle', error: 'ti-alert-circle', info: 'ti-info-circle' };
let toastWrap = null;
function ensureWrap() { if (toastWrap) return toastWrap; toastWrap = document.createElement('div'); toastWrap.className = 'toast-wrap'; toastWrap.setAttribute('role', 'region'); toastWrap.setAttribute('aria-label', 'Notifications'); document.body.appendChild(toastWrap); return toastWrap; }
function dismiss(el, instant) { if (!el || el._gone) return; el._gone = true; if (RM || instant) { el.remove(); return; } el.classList.remove('in'); el.classList.add('out'); let done = false; const fin = function () { if (done) return; done = true; el.remove(); }; el.addEventListener('transitionend', fin, { once: true }); setTimeout(fin, 600); }
window.toast = function (message, opts) {
  opts = opts || {}; const type = opts.type || 'info', dur = opts.duration != null ? opts.duration : 2600; const wrap = ensureWrap();
  const el = document.createElement('div'); el.className = 'toast ' + type; el.setAttribute('role', 'status'); el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  const ic = document.createElement('span'); ic.className = 'toast-ic'; ic.setAttribute('aria-hidden', 'true'); ic.innerHTML = '<i class="ti ' + (opts.icon || TOAST_IC[type] || TOAST_IC.info) + '"></i>';
  const msg = document.createElement('span'); msg.className = 'toast-msg'; msg.textContent = message; el.appendChild(ic); el.appendChild(msg);
  const x = document.createElement('button'); x.className = 'toast-x'; x.type = 'button'; x.setAttribute('aria-label', 'Dismiss'); x.innerHTML = '<i class="ti ti-x" aria-hidden="true"></i>'; x.addEventListener('click', function () { dismiss(el); }); el.appendChild(x);
  wrap.appendChild(el); while (wrap.children.length > 3) dismiss(wrap.firstChild, true);
  if (RM) el.classList.add('in'); else requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); }); });
  let timer = null; function arm() { if (dur > 0) timer = setTimeout(function () { dismiss(el); }, dur); } function disarm() { clearTimeout(timer); } arm();
  el.addEventListener('pointerenter', disarm); el.addEventListener('pointerleave', arm); el.addEventListener('focusin', disarm); el.addEventListener('focusout', arm);
  return el;
};
$$('[data-copy]').forEach(function (b) {
  b.addEventListener('click', function () {
    const v = b.dataset.copy;
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { window.toast('Copied ' + v, { type: 'ok', icon: 'ti-copy' }); }).catch(function () { window.toast(v, { type: 'info' }); });
    else window.toast(v, { type: 'info' });
  });
});

/* ---- contact form (static demo: Resend wires in at build) ---- */
(function setupForm() {
  const f = $('[data-form]'); if (!f) return;
  function check(fld) { const el = fld.querySelector('.field'); if (!el) return true; const v = el.value.trim(); let ok = !!v; if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); fld.classList.toggle('invalid', !ok); el.setAttribute('aria-invalid', ok ? 'false' : 'true'); return ok; }
  function validate(form) { return $$('.fld', form).filter(function (fld) { return !check(fld); }); }
  $$('.fld .field', f).forEach(function (el) { el.addEventListener('input', function () { const fld = el.closest('.fld'); if (fld.classList.contains('invalid')) check(fld); }); });
  const ok = $('[data-form-ok]'); const err = $('[data-form-err]');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (ok) ok.hidden = true; if (err) err.hidden = true;
    if (f.querySelector('[name="company"]') && f.querySelector('[name="company"]').value) { return; }
    const bad = validate(f); if (bad.length) { bad[0].querySelector('.field').focus(); return; }
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Sending…';
    setTimeout(function () { btn.disabled = false; btn.innerHTML = 'Send <i class="ti ti-arrow-right" aria-hidden="true"></i>'; f.reset(); if (ok) { ok.hidden = false; ok.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } window.toast('Sent — thanks', { type: 'ok', icon: 'ti-send' }); }, 700);
  });
})();

/* ---- liquid-glass morphing selector (Artist Hub dashboard) ---- */
function liquidGroup(group, sel, activeSel) {
  if (!group || RM) return;
  const items = $$(sel, group); if (!items.length) return;
  group.classList.add('lg-group');
  const pill = document.createElement('span'); pill.className = 'lg-pill'; pill.setAttribute('aria-hidden', 'true'); group.appendChild(pill);
  let active = null; items.forEach(function (it) { if (it.matches(activeSel)) active = it; });
  let cur = { set: false };
  function box(el) { const g = group.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height }; }
  function settle(b) { pill.style.opacity = '1'; pill.style.height = b.h + 'px'; pill.style.width = b.w + 'px'; pill.style.transform = 'translate(' + b.x + 'px,' + b.y + 'px)'; }
  function moveTo(el) {
    if (!el) { pill.style.opacity = '0'; cur.set = false; return; }
    const b = box(el);
    if (!cur.set) { settle(b); cur = { set: true, x: b.x, y: b.y, w: b.w, h: b.h }; return; }
    const sx = Math.min(cur.x, b.x), sw = Math.max(cur.x + cur.w, b.x + b.w) - sx;
    pill.style.height = b.h + 'px'; pill.style.width = sw + 'px'; pill.style.transform = 'translate(' + sx + 'px,' + b.y + 'px)';
    clearTimeout(pill._t); pill._t = setTimeout(function () { settle(b); cur = { set: true, x: b.x, y: b.y, w: b.w, h: b.h }; }, 110);
  }
  requestAnimationFrame(function () { moveTo(active); });
  items.forEach(function (it) {
    it.addEventListener('pointerenter', function () { moveTo(it); });
    it.addEventListener('focus', function () { moveTo(it); });
  });
  group.addEventListener('pointerleave', function () { moveTo(active); });
  group.addEventListener('focusout', function () { setTimeout(function () { if (!group.contains(document.activeElement)) moveTo(active); }, 0); });
  window.addEventListener('resize', function () { cur.set = false; moveTo(active); });
}

/* ---- press-squish (Artist Hub; ripple deliberately omitted) ---- */
(function press() {
  if (RM) return;
  const SEL = '.stat,.pc,.chip,.ib,.cta,.tab,.pill,.lbtn,.filter,.tile,.scard,.fcard,.mrow2,.post,.tabbar a,.tabbar button,.back,.badge';
  document.addEventListener('pointerdown', function (e) { if (e.button !== undefined && e.button !== 0) return; const el = e.target.closest(SEL); if (!el) return; el.classList.add('is-pressed'); });
  function release() { $$('.is-pressed').forEach(function (el) { el.classList.remove('is-pressed'); }); }
  document.addEventListener('pointerup', release); document.addEventListener('pointercancel', release); document.addEventListener('pointerleave', release);
})();

/* ---- glass tooltips from aria-label (Artist Hub) ---- */
(function tooltips() {
  if (!FINE) return;
  $$('.iconset .ib[aria-label],.socials .ib[aria-label],.nav .back[aria-label]').forEach(function (btn) {
    const label = btn.getAttribute('aria-label'); if (!label || btn.querySelector('.gtip')) return;
    btn.classList.add('tipwrap'); const tip = document.createElement('span'); tip.className = 'gtip'; tip.setAttribute('aria-hidden', 'true'); tip.textContent = label; btn.appendChild(tip);
  });
  function reflow() { $$('.tipwrap > .gtip').forEach(function (tip) { tip.classList.remove('tip-r'); if (tip.getBoundingClientRect().right > window.innerWidth - 8) tip.classList.add('tip-r'); }); }
  requestAnimationFrame(reflow); let raf; window.addEventListener('resize', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(reflow); });
})();

/* ---- ident strip: title slides into the nav once the header scrolls out (Artist Hub console) ---- */
(function identStrip() {
  const strip = $('[data-ident]'); const watch = $('[data-ident-watch]'); if (!strip || !watch) return;
  if (RM || !('IntersectionObserver' in window)) { strip.classList.add('show'); return; }
  new IntersectionObserver(function (e) { strip.classList.toggle('show', !e[0].isIntersecting); }, { rootMargin: '-64px 0px 0px 0px' }).observe(watch);
})();

/* ---- ⌘K / "/" command palette (Artist Hub) — searches the whole site ---- */
const INDEX = [
  { k: 'Page', n: 'Home', s: 'shawon.art', u: 'index.html', g: 'linear-gradient(135deg,#a78bfa,#6d5efc)' },
  { k: 'Page', n: 'Work', s: 'Development · UI/UX · Graphic · Motion', u: 'work.html', g: 'linear-gradient(135deg,#6d5efc,#8b7cff)' },
  { k: 'Page', n: 'Art', s: 'Photography · Painting', u: 'art.html', g: 'linear-gradient(135deg,#1e293b,#475569)' },
  { k: 'Page', n: 'Photography', s: 'All photography series', u: 'art-photography.html', g: 'linear-gradient(135deg,#1e293b,#334155)' },
  { k: 'Page', n: 'Painting', s: 'All painting series', u: 'art-painting.html', g: 'linear-gradient(135deg,#312e81,#4338ca)' },
  { k: 'Page', n: 'Writing', s: 'Essays & notes, as Rakhal', u: 'writing.html', g: 'linear-gradient(135deg,#0f172a,#6d5efc)' },
  { k: 'Page', n: 'About', s: 'Bio · roles · now · resume', u: 'about.html', g: 'linear-gradient(135deg,#f4f4f6,#a3a3ae)' },
  { k: 'Page', n: 'Contact', s: 'Projects · prints · anything', u: 'contact.html', g: 'linear-gradient(135deg,#d6ff4f,#84cc16)' },
  { k: 'Page', n: 'Shop', s: 'linearterra · five marketplaces', u: 'shop.html', g: 'linear-gradient(135deg,#a78bfa,#6d5efc)' },
  { k: 'Development', n: 'OnnoRokom ERP', s: 'OnnoRokom Projukti · ERP · 2026', u: 'project.html?slug=onnorokom-erp', g: 'linear-gradient(135deg,#0f2027,#2c5364)' },
  { k: 'Development', n: 'OnnoRokom HRIS', s: 'OnnoRokom · HR system · 2026', u: 'project.html?slug=onnorokom-hris', g: 'linear-gradient(135deg,#4f46e5,#7c3aed,#d946ef)' },
  { k: 'Development', n: 'Udvash–Unmesh E-Commerce', s: 'Udvash–Unmesh · E-commerce · 2026', u: 'https://udvash-unmesh-e-commerce.vercel.app', g: 'linear-gradient(135deg,#0f766e,#14b8a6)' },
  { k: 'Development', n: 'Udvash–Unmesh App v1 / v2', s: 'Udvash–Unmesh · Mobile app · 2026', u: 'project.html?slug=udvash-unmesh-app', g: 'linear-gradient(135deg,#6366f1,#22d3ee)' },
  { k: 'Development', n: 'Udvash–Unmesh AI', s: 'Udvash–Unmesh · AI · 2026', u: 'project.html?slug=udvash-unmesh-ai', g: 'linear-gradient(135deg,#7c3aed,#ec4899)' },
  { k: 'Development', n: 'Ignite Traders', s: 'Ignite · E-commerce · 2026', u: 'https://ignitetradersbd.com', g: 'linear-gradient(135deg,#f97316,#b91c1c)' },
  { k: 'Development', n: 'Artist Hub', s: 'Own · Studio hub · 2026', u: 'https://artist-hub-app.vercel.app', g: 'linear-gradient(135deg,#6d5efc,#8b7cff)' },
  { k: 'Development', n: 'To-Do for macOS', s: 'Own · macOS app · 2026', u: 'project.html?slug=todo-macos', g: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
  { k: 'Development', n: 'SecureVault', s: 'Own · App · 2026', u: 'project.html?slug=securevault', g: 'linear-gradient(135deg,#111827,#4b5563)' },
  { k: 'Development', n: 'Nockout', s: 'Own · App · 2026', u: 'project.html?slug=nockout', g: 'linear-gradient(135deg,#ef4444,#f59e0b)' },
  { k: 'UI/UX', n: 'Udvash–Unmesh Design System', s: 'Udvash–Unmesh · Design system · 2026', u: 'project-design.html?slug=udvash-unmesh-design-system', g: 'linear-gradient(135deg,#1e3a8a,#06b6d4)' },
  { k: 'UI/UX', n: 'Bangla Zoom wireframes', s: 'Internal · Wireframes · 2026', u: 'https://wireframes-opal-iota.vercel.app', g: 'linear-gradient(135deg,#6366f1,#22d3ee)' },
  { k: 'UI/UX', n: 'Education Pro', s: 'UI/UX · Design versions · 2026', u: 'work.html?category=uiux', g: 'linear-gradient(135deg,#059669,#84cc16)' },
  { k: 'Motion', n: 'Motion project', s: 'Video · template', u: 'project-motion.html', g: 'linear-gradient(135deg,#7c3aed,#ec4899)' },
  { k: 'Graphic', n: 'linearterra — stock graphics', s: 'Five marketplaces · since 2020', u: 'shop.html', g: 'linear-gradient(135deg,#a78bfa,#6d5efc)' },
  { k: 'Photography', n: 'Monsoon', s: '2026 · 24 photos', u: 'series.html', g: 'linear-gradient(135deg,#1e293b,#475569)' },
  { k: 'Photography', n: 'Street', s: '2025 · 18 photos', u: 'series.html', g: 'linear-gradient(135deg,#7c2d12,#f59e0b)' },
  { k: 'Photography', n: 'Portraits', s: '2025 · 12 photos', u: 'series.html', g: 'linear-gradient(135deg,#312e81,#0ea5e9)' },
  { k: 'Painting', n: 'Ink studies', s: '2026 · 9 pieces · ink on paper', u: 'series.html', g: 'linear-gradient(135deg,#0f172a,#6d5efc)' },
  { k: 'Painting', n: 'Landscapes', s: '2025 · 7 pieces · acrylic', u: 'series.html', g: 'linear-gradient(135deg,#14532d,#84cc16)' },
  { k: 'Painting', n: 'Figures', s: '2024 · 6 pieces · watercolour', u: 'series.html', g: 'linear-gradient(135deg,#7f1d1d,#f97316)' },
  { k: 'Writing', n: 'Notes on building a design system twice', s: 'Rakhal · 2026 · 4 min', u: 'post.html', g: 'linear-gradient(135deg,#1e3a8a,#06b6d4)' },
  { k: 'Writing', n: 'Shipping an ERP as a team of one', s: 'Rakhal · 2026 · 6 min', u: 'post.html', g: 'linear-gradient(135deg,#0f2027,#2c5364)' },
  { k: 'Writing', n: 'Monsoon light', s: 'Rakhal · 2026 · 3 min', u: 'post.html', g: 'linear-gradient(135deg,#1e293b,#475569)' },
  { k: 'Writing', n: 'One address for everything', s: 'Rakhal · 2026 · 5 min', u: 'post.html', g: 'linear-gradient(135deg,#a78bfa,#6d5efc)' },
  { k: 'Writing', n: 'Ink, and then not fixing it', s: 'Rakhal · 2026 · 4 min', u: 'post.html', g: 'linear-gradient(135deg,#0f172a,#6d5efc)' },
  { k: 'Marketplace', n: 'GraphicRiver', s: 'linearterra on Envato', u: 'https://graphicriver.net/user/linearterra', g: 'linear-gradient(135deg,#84cc16,#14532d)' }
];
(function cmdk() {
  const el = $('#cmdk'); if (!el) return;
  const scrim = $('.cmdk-scrim', el), input = $('#cmdk-in'), list = $('#cmdk-list');
  let rows = [], sel = 0, lastFocus = null, open = false;
  function match(p, q) { return (p.n + ' ' + p.s + ' ' + p.k).toLowerCase().indexOf(q) >= 0; }
  function hl(name, q) { if (!q) return esc(name); const i = name.toLowerCase().indexOf(q); if (i < 0) return esc(name); return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length)); }
  function render() {
    const q = input.value.trim().toLowerCase();
    const items = INDEX.filter(function (p) { return !q || match(p, q); });
    if (!items.length) { list.innerHTML = '<div class="cmdk-empty">Nothing matches “' + esc(input.value) + '”</div>'; rows = []; input.removeAttribute('aria-activedescendant'); return; }
    list.innerHTML = items.map(function (p, i) { return '<div class="cmdk-row" role="option" id="cmdk-o' + i + '" aria-selected="' + (i === 0 ? 'true' : 'false') + '" data-url="' + esc(p.u) + '"><span class="cmdk-sw" style="background:' + esc(p.g) + '"></span><span class="cmdk-meta"><span class="cmdk-nm">' + hl(p.n, q) + '</span><span class="cmdk-sub">' + esc(p.s) + '</span></span><span class="cmdk-stg">' + esc(p.k) + '</span></div>'; }).join('');
    rows = $$('.cmdk-row', list); sel = 0; mark();
    rows.forEach(function (r, i) { r.addEventListener('click', function () { choose(i); }); r.addEventListener('pointermove', function () { if (sel !== i) { sel = i; mark(); } }); });
  }
  function mark() { rows.forEach(function (r, i) { r.setAttribute('aria-selected', i === sel ? 'true' : 'false'); }); if (rows[sel]) { input.setAttribute('aria-activedescendant', rows[sel].id); rows[sel].scrollIntoView({ block: 'nearest' }); } }
  function choose(i) { const r = rows[i]; if (!r) return; const u = r.getAttribute('data-url'); close(); if (!u) return; if (/^https?:/.test(u)) window.open(u, '_blank', 'noopener'); else location.href = u; }
  function openP() { if (open) return; open = true; lastFocus = document.activeElement; el.hidden = false; requestAnimationFrame(function () { el.classList.add('open'); }); input.value = ''; render(); setTimeout(function () { input.focus(); }, RM ? 0 : 60); ROOT.style.overflow = 'hidden'; }
  function close() { if (!open) return; open = false; el.classList.remove('open'); ROOT.style.overflow = ''; setTimeout(function () { el.hidden = true; }, RM ? 0 : 300); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (rows.length) { sel = (sel + 1) % rows.length; mark(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) { sel = (sel - 1 + rows.length) % rows.length; mark(); } }
    else if (e.key === 'Home') { e.preventDefault(); sel = 0; mark(); }
    else if (e.key === 'End') { e.preventDefault(); sel = rows.length - 1; mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open ? close() : openP(); }
    else if (e.key === '/' && !open && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); openP(); }
    else if (e.key === 'Escape' && open) { close(); }
  });
  $$('[data-search]').forEach(function (b) { b.addEventListener('click', openP); });
})();

/* ---- liquid selectors: top nav, nav icon set ---- */
liquidGroup($('.nlinks'), '.nlink', '[aria-current="page"]');
liquidGroup($('.nav .iconset'), '.ib', '.never');

/* ---- Motion: reveals, stagger, counters, hero, flow rail, scroll state ---- */
function revealAll() {
  $$('[data-reveal],[data-stagger-item],.flow-node,.flow-card').forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
  const h = $('[data-hero]');
  if (h) $$('.eye,.h1 .line,.sub,.trust,.hero-visual,.cta-row > *', h).forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
  $$('[data-to]').forEach(function (el) { el.textContent = (+el.dataset.to).toLocaleString('en-US'); });
  const ff = $('[data-flow-fill]'); if (ff) ff.style.transform = 'scaleX(1)';
}
function runCounters(scope) {
  $$('[data-to]', scope).forEach(function (el) {
    const to = +el.dataset.to;
    if (RM || to === 0) { el.textContent = to.toLocaleString('en-US'); return; }
    el.textContent = '0'; const dur = 1100; let s = null;
    function step(t) { if (!s) s = t; const p = Math.min((t - s) / dur, 1); el.textContent = Math.round(p * to).toLocaleString('en-US'); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  });
}
function bindScroll(staticMode, heroReadyFn) {
  const prog = $('.scroll-progress'); const nav = $('[data-nav]');
  const heroVis = $('.hero-visual'); const heroSec = $('[data-hero]');
  const flowFill = $('[data-flow-fill]'); const flowNodes = $('.flow-nodes');
  const wide = function () { return window.innerWidth >= 820; };
  if (nav) nav.classList.toggle('solid', (window.scrollY || 0) > 30);
  function frame() {
    const st = window.scrollY || document.documentElement.scrollTop;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (prog) prog.style.transform = 'scaleX(' + (docH > 0 ? clamp(st / docH, 0, 1) : 0) + ')';
    if (nav) { if (st > 40) nav.classList.add('solid'); else if (st < 20) nav.classList.remove('solid'); }
    if (!staticMode && !RM) {
      if (heroVis && heroSec && heroReadyFn && heroReadyFn()) { const r = heroSec.getBoundingClientRect(); const p = clamp(-r.top / (r.height || 1), 0, 1); heroVis.style.transform = 'translateY(' + (-90 * p) + 'px) scale(' + (1 + 0.02 * p) + ')'; }
      if (flowFill && flowNodes && wide()) { const r = flowNodes.getBoundingClientRect(); const vh = window.innerHeight; const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.5), 0, 1); flowFill.style.transform = 'scaleX(' + p + ')'; }
    }
  }
  let ticking = false;
  function onScroll() { if (!ticking) { requestAnimationFrame(function () { frame(); ticking = false; }); ticking = true; } }
  window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); frame();
}
function initStatic() { revealAll(); bindScroll(true); }
function initMotion(m) {
  const animate = m.animate, inView = m.inView, stagger = m.stagger;
  const EO = [.22, 1, .36, 1]; const SPRING = [.34, 1.56, .64, 1]; const seen = new WeakSet(); let heroVisReady = false;
  const hero = $('[data-hero]');
  if (hero) {
    const eye = $('.eye', hero), lines = $$('.h1 .line', hero), sub = $('.sub', hero), ctas = $$('.cta-row > *', hero), vis = $('.hero-visual', hero), trust = $('.trust', hero);
    [eye, sub, trust, vis].forEach(function (e) { if (e) e.style.opacity = '0'; });
    lines.forEach(function (l) { l.style.opacity = '0'; }); ctas.forEach(function (c) { c.style.opacity = '0'; });
    if (eye) animate(eye, { opacity: [0, 1], y: [12, 0] }, { duration: .6, delay: .1, ease: EO });
    if (lines.length) animate(lines, { opacity: [0, 1], y: ['110%', '0%'] }, { delay: function (i) { return 0.28 + i * 0.09; }, duration: .9, ease: EO });
    if (sub) animate(sub, { opacity: [0, 1], y: [14, 0] }, { duration: .6, delay: .62, ease: EO });
    if (ctas.length) animate(ctas, { opacity: [0, 1], y: [14, 0], scale: [.96, 1] }, { delay: function (i) { return 0.74 + i * 0.08; }, duration: .6, ease: SPRING });
    if (vis) { const va = animate(vis, { opacity: [0, 1], y: [48, 0], scale: [.94, 1] }, { duration: .9, delay: .5, ease: EO }); if (va && va.finished) va.finished.then(function () { heroVisReady = true; }).catch(function () { heroVisReady = true; }); }
    if (trust) animate(trust, { opacity: [0, 1], y: [10, 0] }, { duration: .5, delay: .95, ease: EO });
  }
  setTimeout(function () { heroVisReady = true; }, 1800);
  $$('[data-reveal]').forEach(function (el) {
    inView(el, function () { if (seen.has(el)) return; seen.add(el); animate(el, { opacity: [0, 1], y: [24, 0] }, { duration: .7, ease: EO }); }, { amount: .2 });
  });
  $$('[data-stagger]').forEach(function (group) {
    const items = $$('[data-stagger-item]', group); items.forEach(function (it) { it.style.opacity = '0'; });
    inView(group, function () {
      if (seen.has(group)) return; seen.add(group);
      animate(items, { opacity: [0, 1], y: [28, 0], scale: [.97, 1] }, { delay: stagger(.07), duration: .6, ease: SPRING });
      if (group.hasAttribute('data-counters')) runCounters(group);
    }, { amount: .01 });
  });
  drawArt(animate, inView);
  const rail = $('.flow-rail');
  if (rail) {
    const nodes = $$('.flow-node', rail), cards = $$('.flow-card', rail);
    nodes.forEach(function (n) { n.style.opacity = '0'; });
    inView(rail, function () {
      if (seen.has(rail)) return; seen.add(rail);
      animate(nodes, { opacity: [0, 1], scale: [.4, 1] }, { delay: stagger(.1), duration: .6, ease: SPRING });
      animate(cards, { opacity: [0, 1], y: [12, 0] }, { delay: function (i) { return 0.05 + i * 0.1; }, duration: .5, ease: EO });
    }, { amount: .25 });
  }
  bindScroll(false, function () { return heroVisReady; });
}
async function loadMotion() {
  try { return await import('https://cdn.jsdelivr.net/npm/motion@11/+esm'); }
  catch (e) { return await import('https://esm.sh/motion@11'); }
}
try {
  const m = await loadMotion();
  if (!m || !m.animate || !m.inView || !m.stagger) throw new Error('motion exports missing');
  clearTimeout(window.__ahWatchdog);
  if (ROOT.classList.contains('reduce-motion') || ROOT.classList.contains('motion-failed')) initStatic();
  else { ROOT.classList.add('js-motion'); try { initMotion(m); } catch (e) { console.warn('[shawon.art] initMotion failed; static fallback.', e); ROOT.classList.add('motion-failed'); initStatic(); } }
} catch (err) {
  console.warn('[shawon.art] Motion load failed; static fallback.', err);
  clearTimeout(window.__ahWatchdog); ROOT.classList.add('motion-failed'); initStatic();
}

/* ---- Art viewer / lightbox (phase A) — opens over the grid, ?view=<id> is shareable ---- */
(function viewer() {
  const el = $('[data-viewer]'); if (!el) return;
  const items = $$('[data-viewer-item]'); if (!items.length) return;
  const img = $('[data-v-img]', el), title = $('[data-v-title]', el), sub = $('[data-v-sub]', el), count = $('[data-v-count]', el), cap = $('[data-v-cap]', el), meta = $('[data-v-meta]', el), buy = $('[data-v-buy]', el), share = $('[data-v-share]', el);
  let i = 0, open = false, lastFocus = null, startX = null;
  function render(n) {
    i = (n + items.length) % items.length; const t = items[i];
    img.style.background = t.dataset.bg && !t.dataset.img ? t.dataset.bg : ''; img.style.backgroundImage = t.dataset.img ? 'url(' + t.dataset.img + ')' : ''; img.classList.toggle('portrait', t.dataset.orient === 'portrait');
    title.textContent = t.dataset.title || ''; sub.textContent = [t.dataset.series, t.dataset.year].filter(Boolean).join(' · '); count.textContent = (i + 1) + ' / ' + items.length;
    cap.textContent = t.dataset.cap || ''; cap.hidden = !t.dataset.cap;
    const pills = []; if (t.dataset.medium) pills.push(t.dataset.medium); if (t.dataset.dim) pills.push(t.dataset.dim); (t.dataset.tags || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) { pills.push('#' + s); });
    meta.innerHTML = pills.map(function (p) { return '<span class="pill">' + esc(p) + '</span>'; }).join('');
    if (t.dataset.buy) { buy.hidden = false; buy.href = t.dataset.buy; } else buy.hidden = true;
    const u = new URL(location.href); u.searchParams.set('view', t.dataset.id); history.replaceState({ view: t.dataset.id }, '', u);
  }
  function openAt(n, push) {
    if (!open) { open = true; lastFocus = document.activeElement; el.hidden = false; requestAnimationFrame(function () { el.classList.add('open'); }); document.body.classList.add('viewing'); if (push) history.pushState({ view: 'open' }, '', location.href); setTimeout(function () { $('.v-x', el).focus(); }, RM ? 0 : 80); }
    render(n);
  }
  function close(fromPop) {
    if (!open) return; open = false; el.classList.remove('open'); document.body.classList.remove('viewing');
    const u = new URL(location.href); u.searchParams.delete('view'); if (fromPop) history.replaceState(null, '', u); else history.replaceState(null, '', u);
    setTimeout(function () { el.hidden = true; }, RM ? 0 : 300); if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  items.forEach(function (t, n) { t.addEventListener('click', function (e) { e.preventDefault(); openAt(n, true); }); });
  $$('[data-v-close]', el).forEach(function (b) { b.addEventListener('click', function () { close(false); }); });
  $('[data-v-prev]', el).addEventListener('click', function () { render(i - 1); });
  $('[data-v-next]', el).addEventListener('click', function () { render(i + 1); });
  if (share) share.addEventListener('click', function () { const u = location.href; if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { window.toast('Link copied', { type: 'ok', icon: 'ti-link' }); }).catch(function () { window.toast(u, { type: 'info' }); }); else window.toast(u, { type: 'info' }); });
  document.addEventListener('keydown', function (e) { if (!open) return; if (e.key === 'Escape') { e.preventDefault(); close(false); } else if (e.key === 'ArrowRight') { e.preventDefault(); render(i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); render(i - 1); } });
  el.addEventListener('pointerdown', function (e) { startX = e.clientX; }, { passive: true });
  el.addEventListener('pointerup', function (e) { if (startX == null) return; const dx = e.clientX - startX; startX = null; if (Math.abs(dx) > 48 && e.target.closest('.v-fig')) render(dx < 0 ? i + 1 : i - 1); });
  window.addEventListener('popstate', function () { if (open) close(true); });
  const q = new URLSearchParams(location.search).get('view'); if (q) { const n = items.findIndex(function (t) { return t.dataset.id === q; }); if (n >= 0) openAt(n, false); }
})();


/* ---- line art draws itself on scroll (no JS / no motion = already drawn) ---- */
function drawArt(animate, inView) {
  $$('[data-draw]').forEach(function (svg) {
    const parts = $$('path,circle,line,polyline,rect', svg); if (!parts.length) return;
    const lens = parts.map(function (p) { try { return p.getTotalLength ? p.getTotalLength() : 0; } catch (e) { return 0; } });
    parts.forEach(function (p, i) { if (!lens[i]) return; p.style.strokeDasharray = lens[i]; p.style.strokeDashoffset = lens[i]; });
    inView(svg, function () {
      parts.forEach(function (p, i) {
        const L = lens[i]; if (!L) return;
        const a = animate(p, { strokeDashoffset: [L, 0] }, { duration: .9, delay: .07 * i, ease: [.22, 1, .36, 1] });
        if (a && a.finished) a.finished.then(function () { p.style.strokeDasharray = 'none'; }).catch(function () { });
      });
    }, { amount: .3 });
  });
}

/* ---- ident role rotator: one role lit at a time, glyph cross-fades in a fixed slot ---- */
(function roleRotator() {
  const box = $('[data-roles]'); if (!box || RM) return;
  const words = $$('.ro', box), glyphs = $$('.rm', box); if (words.length < 2) return;
  let i = 0, timer = null;
  function tick() { i = (i + 1) % words.length; words.forEach(function (w, n) { w.classList.toggle('on', n === i); }); glyphs.forEach(function (g, n) { g.classList.toggle('on', n === i); }); }
  function start() { stop(); timer = setInterval(tick, 2600); }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  const host = box.closest('.ident') || box;
  host.addEventListener('pointerenter', stop); host.addEventListener('pointerleave', start);
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  start();
})();
