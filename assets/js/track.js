/* ==========================================================================
   CCG analytics — the ONLY file that talks to the tracking backend.
   If you ever move hosts, this is the single file you swap out.
   It fails silently: if the backend is missing, the website still works.
   ========================================================================== */
(function () {
  'use strict';

  var ENDPOINT = '/api/track';

  // A per-browser-session id so we can count *people* rather than raw clicks.
  // Lives in sessionStorage only — it disappears when the tab closes.
  // No cookies, no IP addresses, no cross-site tracking.
  function sessionId() {
    try {
      var k = 'ccg_sid', v = sessionStorage.getItem(k);
      if (!v) {
        v = (crypto && crypto.randomUUID) ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(36).slice(2);
        sessionStorage.setItem(k, v);
      }
      return v;
    } catch (e) { return 'no-storage'; }
  }

  // Only the *host* of an external referrer, never the full URL.
  function referrerHost() {
    try {
      if (!document.referrer) return 'direct';
      var h = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (h === location.hostname.replace(/^www\./, '')) return 'internal';
      return h;
    } catch (e) { return 'direct'; }
  }

  function send(payload) {
    payload.page    = location.pathname;
    payload.session = sessionId();
    payload.ref     = referrerHost();
    var body = JSON.stringify(payload);
    try {
      // sendBeacon survives the page unloading — important for outbound clicks.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch(ENDPOINT, {
        method: 'POST', body: body, keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      }).catch(function () {});
    } catch (e) { /* tracking must never break the site */ }
  }

  var Track = {
    pageview: function () { send({ type: 'view' }); },
    apply:    function (where) { send({ type: 'apply',  label: where || 'unknown' }); },
    report:   function (file)  { send({ type: 'report', label: file  || 'unknown' }); }
  };

  window.CCGTrack = Track;

  // Auto-wire: any element with data-track="apply" or data-track="report"
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (!el) return;
    var kind = el.getAttribute('data-track');
    if (kind === 'apply')  Track.apply(el.getAttribute('data-track-label'));
    if (kind === 'report') Track.report(el.getAttribute('data-track-label'));
  }, true);

  // Record the pageview once the page has settled.
  if (document.readyState === 'complete') Track.pageview();
  else window.addEventListener('load', Track.pageview);
})();
