/* TESTING ONLY: notification test panel for every version (v1-v4).
 * Hidden unless the URL contains ?test=1 (remembered for the tab; ?test=0 hides it again).
 *  1) "Show a test notification now": a real OS notification created on this device. No server needed.
 *  2) "Send a test in 5 minutes": the server sends a real push, so it arrives even when the app is closed.
 *     Needs ENABLE_TEST_TOOLS=1 on the server, plus Supabase, push keys and the scheduler.
 */
(function () {
  'use strict';
  try {
    var q = new URLSearchParams(location.search).get('test');
    if (q === '0') sessionStorage.removeItem('i11t');
    if (q === '1') sessionStorage.setItem('i11t', '1');
    if (sessionStorage.getItem('i11t') !== '1') return;
  } catch (e) { return; }

  var UA = navigator.userAgent;
  var iOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var KEY = 'i11t-scheduled';

  var css = document.createElement('style');
  css.textContent =
    '.i11t-fab{position:fixed;z-index:2147483000;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));font:700 13px/1 system-ui,sans-serif;color:#1A1300;background:#F6B73C;border:0;border-radius:999px;padding:12px 16px;min-height:44px;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer}' +
    '.i11t-box{position:fixed;z-index:2147483001;right:12px;bottom:calc(138px + env(safe-area-inset-bottom,0px));width:min(340px,calc(100vw - 24px));background:#0A1033;color:#F4F4F6;border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:16px;font:400 14px/1.45 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '.i11t-box[hidden],.i11t-box button.b[hidden]{display:none!important}.i11t-box h2{margin:0 0 2px;font:700 16px/1.2 system-ui,sans-serif}.i11t-tag{color:#F6B73C;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}' +
    '.i11t-box button.b{display:block;width:100%;margin-top:10px;min-height:46px;border-radius:999px;border:1.5px solid rgba(255,255,255,.35);background:transparent;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer}' +
    '.i11t-box button.b.p{background:#F6B73C;border-color:#F6B73C;color:#1A1300}.i11t-box button.b:disabled{opacity:.5}' +
    '.i11t-st{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.08);min-height:20px}.i11t-st.ok{background:rgba(120,220,160,.15)}.i11t-st.bad{background:rgba(255,255,255,.08)}' +
    '.i11t-note{margin:10px 0 0;font-size:12px;color:#A8B0DC}';
  document.head.appendChild(css);

  var fab = document.createElement('button');
  fab.className = 'i11t-fab'; fab.type = 'button'; fab.textContent = 'Test notifications'; fab.setAttribute('aria-expanded', 'false');
  var box = document.createElement('div');
  box.className = 'i11t-box'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Notification test (testing only)');
  box.innerHTML =
    '<span class="i11t-tag">Testing only</span><h2>Notification test</h2>' +
    '<button class="b p" type="button" data-a="now">1. Show a test notification now</button>' +
    '<button class="b" type="button" data-a="later" hidden>2. Send a test in 5 minutes</button>' +
    '<div class="i11t-st" role="status" aria-live="polite"></div>' +
    '<p class="i11t-note"></p>';
  document.body.appendChild(box); document.body.appendChild(fab);
  var st = box.querySelector('.i11t-st'), note = box.querySelector('.i11t-note');

  function say(msg, kind) { st.textContent = msg; st.className = 'i11t-st' + (kind ? ' ' + kind : ''); }
  function hm(ms) { return new Date(ms).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase(); }
  function stored() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }

  function intro() {
    var s = stored();
    if (iOS && !standalone) { say('On iPhone, add this page to your Home Screen, open it from there, then test.', 'bad'); }
    else if (s && s.at > Date.now() - 600000) { say('A 5-minute test is scheduled for ' + hm(s.at) + ' IST. You can close the app now.', 'ok'); }
    else { say('Tap 1 to see how a notification looks on this device.'); }
    if (!laterBtn.hidden) note.textContent = 'Test 2 goes through the real push system, so it shows up after you fully close the app. Allow notifications when asked.';
  }
  // Only offer the 5-minute test when the server reports it is ready. Otherwise stay quiet: no errors shown.
  var laterBtn = box.querySelector('[data-a="later"]');
  fetch('/api/push/test').then(function (r) { return r.json(); }).then(function (c) {
    if (c && c.enabled && c.vapidPublicKey) laterBtn.hidden = false;
    else note.textContent = 'The 5-minute test will appear here once the notification server is connected.';
  }).catch(function () { note.textContent = 'The 5-minute test will appear here once the notification server is connected.'; });
  intro();
  fab.onclick = function () { var open = box.hidden; box.hidden = !open; fab.setAttribute('aria-expanded', open); if (open) intro(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { box.hidden = true; fab.setAttribute('aria-expanded', 'false'); } });

  function swReg() {
    if (!('serviceWorker' in navigator)) return Promise.reject(new Error('This browser has no service worker support.'));
    return navigator.serviceWorker.getRegistration().then(function (r) { return r || navigator.serviceWorker.register('/sw.js', { scope: '/' }); })
      .then(function () { return navigator.serviceWorker.ready; });
  }
  function permission() { // must run from a tap
    if (!('Notification' in window)) return Promise.reject(new Error(iOS ? 'On iPhone, add this page to your Home Screen first, open it from there, then test.' : 'This browser cannot show notifications.'));
    if (Notification.permission === 'granted') return Promise.resolve();
    if (Notification.permission === 'denied') return Promise.reject(new Error('Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.'));
    return Promise.resolve(Notification.requestPermission()).then(function (p) { if (p !== 'granted') throw new Error('Permission was not granted.'); });
  }
  function disable(on) { box.querySelectorAll('button.b').forEach(function (b) { b.disabled = on; }); }

  function now() {
    disable(true); say('Working…');
    permission().then(swReg).then(function (reg) {
      return reg.showNotification('Test notification', {
        body: 'This is how event notifications will look on this device.', icon: '/icons/icon-192.png', badge: '/icons/badge-96.png',
        tag: 'impact11-test-now', data: { url: '/', id: null }
      });
    }).then(function () { say('Shown. Look at your notification area now. Tap it to check it opens the site.', 'ok'); })
      .catch(function (e) { say(e.message || 'Could not show the notification.', 'bad'); })
      .then(function () { disable(false); });
  }

  function b64(s) { var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, function (c) { return c.charCodeAt(0); }); }

  function later() {
    disable(true); say('Checking the server…');
    var cfg;
    fetch('/api/push/test').then(function (r) { return r.json(); }).then(function (c) {
      cfg = c;
      if (!c.enabled) throw new Error('The 5-minute test is switched off on the server (ENABLE_TEST_TOOLS is not set).');
      if (!c.vapidPublicKey) throw new Error('The server has no push key configured yet.');
      return permission();
    }).then(swReg).then(function (reg) {
      if (!reg.pushManager) throw new Error('Push is not available here. On iPhone, open the Home Screen app.');
      return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.vapidPublicKey) }); });
    }).then(function (sub) {
      say('Scheduling…');
      return fetch('/api/push/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'The server refused the test.'); return j; }); })
      .then(function (j) {
        var at = Date.parse(j.scheduledFor);
        try { localStorage.setItem(KEY, JSON.stringify({ at: at })); } catch (e) { /* private mode */ }
        say((j.existing ? 'A test is already scheduled for ' : 'Scheduled for ') + hm(at) + ' IST. Close the app completely now. It can arrive up to a minute later than that time.', 'ok');
      })
      .catch(function (e) { say(e.message || 'Could not schedule the test.', 'bad'); })
      .then(function () { disable(false); });
  }

  box.addEventListener('click', function (e) {
    var b = e.target.closest('button.b'); if (!b) return;
    if (b.dataset.a === 'now') now(); else later();
  });
})();
