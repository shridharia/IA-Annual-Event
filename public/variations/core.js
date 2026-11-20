/* Shared logic for every variation: data, clock, countdown, schedule state,
   install, real push notifications, reminders, toasts, reveal and counters. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CFG = window.IMPACT_CONFIG || {};
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- content ---------- */
  var D = '2026-12-17T', T = function (h) { return Date.parse(D + h + ':00+05:30'); };
  var START = T('10:00'), END = T('21:00');
  var SCHED = [
    ['09:00', 'Check-in and breakfast', 'Collect your kit at the registration desk and start the day with breakfast.', 'Grand Foyer'],
    ['10:00', 'Opening and welcome', 'Leadership welcomes everyone to year eleven.', 'Main Ballroom'],
    ['10:45', 'The Impact story', 'A look back at the road from the first desk to today.', 'Main Ballroom'],
    ['11:45', 'Tea and connections', 'Meet colleagues from other teams and other cities.', 'Foyer'],
    ['12:15', 'Team challenges', 'Quizzes and games with your teams. Scores go on the live board.', 'Ballroom and Lawn'],
    ['13:30', 'Lunch', 'A long, relaxed lunch.', 'Restaurant'],
    ['14:45', 'Awards and recognition', 'Celebrating the people who made the year count.', 'Main Ballroom'],
    ['16:00', 'Open floor', 'Photo booth, games and conversations.', 'Lawn'],
    ['17:30', 'High tea', 'A short break before the evening.', 'Foyer'],
    ['18:30', 'Evening showcase', 'Performances and moments from colleagues.', 'Main Ballroom'],
    ['19:30', 'Dinner and music', 'Dinner, music and the closing toast.', 'Grand Terrace'],
    ['21:00', 'See you next year', 'Cabs and shuttles leave from the main entrance.', 'Main Entrance']
  ].map(function (r, i) { return { id: 's' + i, at: T(r[0]), title: r[1], desc: r[2], where: r[3] }; });
  var JOURNEY = [
    [2015, 'The first desk', 'A small team, a big idea and a shared whiteboard. Day one of the Impact story.', 'Where it began'],
    [2018, 'Growing the team', 'More people, more problems worth solving, and a culture that set the tone for everything after.', 'Growing together'],
    [2020, 'One team, many places', 'Distance did not slow us down. We found new ways to work as one team.', 'Staying connected'],
    [2022, 'New offices, new faces', 'We kept growing. Every new colleague added a new way of thinking.', 'Making room'],
    [2024, 'Building what is next', 'Bigger questions, sharper tools and a team that kept raising the bar.', 'Raising the bar'],
    [2026, 'Eleven, together', 'For the first time in a long time, all of us in one room.', '17 December']
  ];
  var FAQ = [
    ['What time does check-in start?', 'The registration desk opens at 9:00 AM and the program begins at 10:00 AM. Arrive early to avoid the queue.'],
    ['Do I need to register?', 'No separate registration is needed. Carry your Impact ID card and show it at the entrance.'],
    ['Is there parking?', 'Yes. Valet and basement parking are available at the venue. Carpooling or a cab is the easiest option.'],
    ['What should I wear?', 'Smart casual. Choose something comfortable, since there are games and activities through the day.'],
    ['Will food be served?', 'Yes. Breakfast, lunch, high tea and dinner are included. Tell People Ops about dietary needs before 10 December.'],
    ['Can I bring a guest?', 'This celebration is for Impact Analytics employees. Ask People Ops if you have a special case.'],
    ['How will I hear about changes?', 'Install this page to your home screen and turn on reminders. We send updates the moment plans change.']
  ];
  var ADDRESS = 'Hilton Embassy Tech Village, Embassy Tech Village, Outer Ring Road, Devarabisanahalli, Marathahalli, Bengaluru 560103';

  /* ---------- storage ---------- */
  var S = { push: 'off', bells: {}, sub: false };
  try { var raw = localStorage.getItem('iy11b'); if (raw) { var o = JSON.parse(raw); if (o && typeof o === 'object') for (var k in S) if (k in o) S[k] = o[k]; } } catch (e) {}
  function save() { try { localStorage.setItem('iy11b', JSON.stringify(S)); } catch (e) {} }

  /* ---------- clock (IST) with optional demo clock ---------- */
  var demoAt = null, demoBase = 0;
  function now() { return demoAt === null ? Date.now() : demoAt + (Date.now() - demoBase); }
  function fmtTime(ms) { return new Date(ms).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase(); }
  function fmtDay(ms) { return new Date(ms).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }); }

  /* ---------- toast ---------- */
  var toastBox;
  function toast(msg, o) {
    o = o || {};
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('aria-live', 'polite'); document.body.appendChild(toastBox); }
    var el = document.createElement('div');
    el.className = 'toast' + (o.title ? '' : ' plain');
    el.innerHTML = o.title ? '<img alt="" src="/variations/icons/icon-192.png"><div><small>Impact Events, now</small><b>' + esc(o.title) + '</b><span class="m">' + esc(msg) + '</span></div>' : esc(msg);
    toastBox.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 450); }, o.ms || 5200);
  }

  /* ---------- install ---------- */
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var os = isIOS ? 'ios' : 'android';
  function standalone() { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } }
  var HOW = {
    ios: ['Open this page in Safari.', 'Tap the Share button at the bottom.', 'Choose Add to Home Screen, then tap Add.', 'Open Impact Events from your home screen and tap Turn on reminders.'],
    android: ['Open this page in Chrome.', 'Tap Install below, or the three-dot menu and then Install app.', 'Open Impact Events from your home screen.', 'Tap Turn on reminders and allow notifications.']
  };
  var dip = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); dip = e; $$('[data-install-btn]').forEach(function (b) { b.hidden = false; }); });
  window.addEventListener('appinstalled', function () { dip = null; $$('[data-install-btn]').forEach(function (b) { b.hidden = true; }); paintPush(); toast('Installed. Open it from your home screen.'); });
  function paintOs() {
    $$('[data-os]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.os === os); });
    $$('[data-how]').forEach(function (l) { l.innerHTML = HOW[os].map(function (h) { return '<li>' + esc(h) + '</li>'; }).join(''); });
  }

  /* ---------- push ---------- */
  var swReg = null;
  function pushCapable() { return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window; }
  function regSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return Promise.resolve(null);
    return navigator.serviceWorker.register('/sw.js').then(function () { return navigator.serviceWorker.ready; }).then(function (r) { swReg = r; return r; }).catch(function () { return null; });
  }
  function b64(s) { var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  function api(path, body) { return fetch((CFG.api || '') + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  function sync() { /* best effort: tell the server which bells this device wants */
    if (!S.sub || !swReg) return;
    swReg.pushManager.getSubscription().then(function (s) { if (s) api('/api/reminders', { endpoint: s.endpoint, sessions: Object.keys(S.bells) }).catch(function () {}); });
  }

  /* Must be called directly from a tap. */
  function enable() {
    if (!isIOS || standalone() || pushCapable()) { /* fine */ }
    if (isIOS && !standalone() && !pushCapable()) {
      os = 'ios'; paintOs();
      toast('On iPhone, add this page to your Home Screen first, then open it from there and turn on reminders.', { ms: 9000 });
      var t = $('#reminders'); t && t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
      return Promise.resolve(false);
    }
    if (!('Notification' in window)) { toast('This browser cannot show notifications. Try Chrome on Android or the installed iPhone app.', { ms: 8000 }); return Promise.resolve(false); }
    var ask = Notification.permission === 'granted' ? Promise.resolve('granted') : Promise.resolve(Notification.requestPermission());
    return ask.then(function (perm) {
      if (perm !== 'granted') { S.push = 'off'; save(); paintPush(); toast(perm === 'denied' ? 'Notifications are blocked. Turn them on for this site in your phone settings.' : 'No problem. You can turn reminders on any time.', { ms: 7000 }); return false; }
      return regSW().then(function (reg) {
        S.push = 'on'; save();
        var done = function () { paintPush(); paintBells(); toast('Reminders are on for this device.'); return true; };
        if (reg && CFG.vapidPublicKey && reg.pushManager) {
          return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(CFG.vapidPublicKey) }); })
            .then(function (s) { return api('/api/subscribe', { subscription: s.toJSON(), ua: navigator.userAgent }); })
            .then(function (r) { S.sub = r.ok; save(); sync(); return done(); })
            .catch(function () { S.sub = false; save(); return done(); });
        }
        return done();
      });
    });
  }
  /* show a real OS notification (falls back to an in-page toast) */
  function notify(p) {
    if ('Notification' in window && Notification.permission === 'granted' && S.push === 'on') {
      var go = function (reg) { if (reg && reg.showNotification) { reg.showNotification(p.title, { body: p.body, icon: '/variations/icons/icon-192.png', badge: '/variations/icons/badge.png', tag: p.tag, data: { url: p.url || './' }, vibrate: [120, 60, 120] }); return true; } return false; };
      (swReg ? Promise.resolve(swReg) : regSW()).then(function (r) { if (!go(r)) { try { new Notification(p.title, { body: p.body, icon: '/variations/icons/icon-192.png' }); } catch (e) { toast(p.body, { title: p.title }); } } });
      if (document.visibilityState === 'visible') toast(p.body, { title: p.title, ms: 6000 });
    } else toast(p.body, { title: p.title });
  }
  function paintPush() {
    var on = S.push === 'on' && ('Notification' in window ? Notification.permission === 'granted' : true);
    if (S.push === 'on' && !on) { S.push = 'off'; save(); }
    $$('[data-push-btn]').forEach(function (b) {
      b.disabled = on; b.classList.toggle('is-on', on);
      var l = $('[data-label]', b) || b; l.textContent = on ? 'Reminders are on' : 'Turn on reminders';
    });
    $$('[data-test-btn]').forEach(function (b) { b.hidden = !on; });
    $$('[data-step-push]').forEach(function (s) { s.classList.toggle('ok', on); });
    $$('[data-step-install]').forEach(function (s) { s.classList.toggle('ok', standalone()); });
    document.documentElement.classList.toggle('push-on', on);
  }
  function paintBells() { $$('[data-bell]').forEach(function (b) { var on = !!S.bells[b.dataset.bell] && S.push === 'on'; b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', (on ? 'Remove reminder for ' : 'Remind me about ') + (SCHED.filter(function (s) { return s.id === b.dataset.bell; })[0] || {}).title); }); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-push-btn]'); if (t) { enable(); return; }
    t = e.target.closest('[data-install-btn]'); if (t) { if (dip) { dip.prompt(); dip = null; t.hidden = true; } return; }
    t = e.target.closest('[data-test-btn]'); if (t) { notify({ title: 'Reminders work', body: 'This is a test from Impact Events. You will get a nudge 10 minutes before each session you pick.', tag: 'test', url: './#schedule' }); return; }
    t = e.target.closest('[data-os]'); if (t) { os = t.dataset.os; paintOs(); return; }
    t = e.target.closest('[data-copy]'); if (t) { var ok = function () { toast('Address copied.'); }, no = function () { toast('Copy is not available here. The address is shown on the page.'); }; try { navigator.clipboard.writeText(ADDRESS).then(ok, no); } catch (x) { no(); } return; }
    t = e.target.closest('[data-bell]');
    if (t) {
      var id = t.dataset.bell, s = SCHED.filter(function (x) { return x.id === id; })[0];
      var apply = function () { var on = !(S.bells[id]); if (on) S.bells[id] = 1; else delete S.bells[id]; save(); paintBells(); sync(); t.classList.remove('ring'); void t.offsetWidth; if (on) t.classList.add('ring'); toast(on ? 'Reminder set for ' + fmtTime(s.at - 600000) + ', 10 minutes before ' + s.title + '.' : 'Reminder removed for ' + s.title + '.'); };
      if (S.push !== 'on') enable().then(function (ok) { if (ok) { S.bells[id] = 1; save(); paintBells(); sync(); t.classList.add('ring'); toast('Reminder set for ' + fmtTime(s.at - 600000) + '.'); } }); else apply();
    }
  });

  /* ---------- schedule state and countdown ---------- */
  function paintSchedule() {
    var n = now(), idx = -1; SCHED.forEach(function (s, i) { if (n >= s.at) idx = i; });
    var over = n >= END;
    $$('[data-sid]').forEach(function (r) {
      var i = +r.dataset.sid.slice(1);
      r.classList.toggle('done', over || i < idx); r.classList.toggle('now', !over && i === idx); r.classList.toggle('next', !over && i === idx + 1);
      var b = $('[data-badge]', r); if (b) b.textContent = (!over && i === idx) ? 'Happening now' : (!over && i === idx + 1) ? 'Up next' : '';
    });
    var k, t;
    if (over) { k = 'That is a wrap'; t = 'Thank you for 11 years'; }
    else if (idx >= 0) { k = 'Happening now'; t = SCHED[idx].title + ' at ' + SCHED[idx].where; }
    else { k = 'Up next, ' + fmtDay(SCHED[0].at); t = SCHED[0].title + ' at ' + fmtTime(SCHED[0].at); }
    $$('[data-now-k]').forEach(function (e) { e.textContent = k; }); $$('[data-now-t]').forEach(function (e) { e.textContent = t; });
    var pr = over ? 1 : idx < 0 ? 0 : Math.min(1, (n - SCHED[0].at) / (END - SCHED[0].at));
    document.documentElement.style.setProperty('--day', pr.toFixed(4));
  }
  var last = {};
  function setUnit(u, v) { var s = String(v).padStart(2, '0'); if (last[u] === s) return; last[u] = s; $$('[data-cd="' + u + '"]').forEach(function (b) { b.textContent = s; if (!RM) { b.classList.remove('tick'); void b.offsetWidth; b.classList.add('tick'); } }); }
  function paintCountdown() {
    var left = START - now(), live = left <= 0;
    $$('[data-cd-wrap]').forEach(function (e) { e.hidden = live; });
    $$('[data-cd-done]').forEach(function (e) { e.hidden = !live; e.textContent = now() < END ? 'It is happening. Welcome to 11 Years of Impact.' : 'Thank you for 11 wonderful years.'; });
    var st = live ? (now() < END ? 'Live now at Hilton Embassy Tech Village' : 'See you at year twelve') : (left > 86400000 * 1 ? Math.ceil(left / 86400000) + ' days to go' : (left > 43200000 ? 'Tomorrow' : 'Today')) + '. Thursday 17 December';
    $$('[data-status]').forEach(function (e) { e.textContent = st; });
    if (live) return;
    var s = Math.floor(left / 1000); setUnit('d', Math.floor(s / 86400)); setUnit('h', Math.floor(s % 86400 / 3600)); setUnit('m', Math.floor(s % 3600 / 60)); setUnit('s', s % 60);
  }

  /* 10-minute reminders for bells (on-device; the server cron covers a closed app) */
  var fired = {};
  function fireReminders() {
    var n = now();
    SCHED.forEach(function (s) { var t = s.at - 600000; if (!fired[s.id] && n >= t && n < t + 90000) { fired[s.id] = 1; if (S.bells[s.id] && S.push === 'on') notify({ title: 'Starting in 10 minutes', body: s.title + '. ' + s.where + ', ' + fmtTime(s.at) + '.', tag: 'rem-' + s.id, url: './#schedule' }); } });
  }
  function refresh() { last = {}; fired = {}; paintCountdown(); paintSchedule(); paintBells(); }

  /* ---------- reveal and counters ---------- */
  function count(el) {
    var to = +el.dataset.count, suf = el.dataset.suffix || '';
    if (RM) { el.textContent = to + suf; return; }
    var t0 = performance.now(), d = 1600; (function f(t) { var p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(to * e) + suf; if (p < 1) requestAnimationFrame(f); })(t0);
  }
  function observe(root) {
    var els = $$('.rv:not(.in),[data-count]:not([data-done])', root);
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); if (e.dataset.count) count(e); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) return; var t = e.target; t.classList.add('in'); $$('[data-count]', t).concat(t.dataset.count ? [t] : []).forEach(function (c) { if (!c.dataset.done) { c.dataset.done = 1; count(c); } }); io.unobserve(t); }); }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- scroll progress variable for pages ---------- */
  var tk = false;
  function onScroll() { tk = false; var h = document.documentElement; var max = h.scrollHeight - innerHeight; h.style.setProperty('--sp', max > 0 ? (scrollY / max).toFixed(4) : 0); h.style.setProperty('--sy', scrollY + 'px'); document.body.classList.toggle('scrolled', scrollY > 40); }
  addEventListener('scroll', function () { if (!tk) { tk = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- boot ---------- */
  function boot() {
    paintOs(); paintPush(); paintBells(); paintCountdown(); paintSchedule(); onScroll(); observe(document);
    if (S.push === 'on') regSW();
    else if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) regSW();
    var sel = $('#demoSel'); if (sel) sel.addEventListener('change', function () { demoAt = this.value ? Date.parse(this.value) : null; demoBase = Date.now(); refresh(); });
    setInterval(function () { paintCountdown(); paintSchedule(); fireReminders(); }, 1000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { paintCountdown(); paintSchedule(); paintPush(); } });
    navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', function () {});
    var burger = $('[data-burger]'), menu = $('[data-menu]');
    if (burger && menu) {
      var set = function (o) { menu.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; };
      burger.onclick = function () { set(!menu.classList.contains('open')); };
      $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    }
  }

  window.IM = { $: $, $$: $$, esc: esc, SCHED: SCHED, JOURNEY: JOURNEY, FAQ: FAQ, ADDRESS: ADDRESS, fmtTime: fmtTime, fmtDay: fmtDay, now: now, toast: toast, notify: notify, observe: observe, boot: boot, RM: RM, START: START, END: END, enable: enable };
})();
