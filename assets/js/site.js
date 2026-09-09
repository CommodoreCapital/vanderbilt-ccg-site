/* ==========================================================================
   CCG site behaviour: loads data/site.json and renders the page.
   You should not normally need to edit this file — edit data/site.json.
   ========================================================================== */
(function () {
  'use strict';

  var DATA_URL = 'data/site.json';
  // Support pages served from a sub-path
  var base = document.documentElement.getAttribute('data-base') || '';
  if (base) DATA_URL = base.replace(/\/$/, '') + '/data/site.json';

  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  // A picture is either a filename shipped in the repo, or "asset:<id>" for
  // something uploaded through the dashboard.
  var img = function (dir, val) {
    val = String(val || '');
    return val.indexOf('asset:') === 0
      ? '/api/asset/' + val.slice(6).replace(/[^a-zA-Z0-9]/g, '')
      : dir + val;
  };

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- navigation ---------------- */
  function initNav() {
    var nav = $('.nav');
    if (!nav) return;
    var solidAlways = nav.hasAttribute('data-solid');

    function onScroll() {
      if (solidAlways || window.scrollY > 40) nav.classList.add('is-solid');
      else nav.classList.remove('is-solid');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = $('.nav__toggle', nav);
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.style.overflow = open ? 'hidden' : '';
      });
      $$('.nav__links a', nav).forEach(function (a) {
        a.addEventListener('click', function () {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });
    }

    // Mark the current page. Cloudflare serves these pages without the .html
    // suffix, while the links in the HTML still carry it, so normalise both.
    var norm = function (p) {
      return p.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
    };
    var here = norm(location.pathname);
    $$('.nav__link', nav).forEach(function (a) {
      if (norm(a.getAttribute('href')) === here) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---------------- scroll reveal ---------------- */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    var showAll = function () { items.forEach(function (el) { el.classList.add('is-in'); }); };

    // If the browser can't observe intersections — or reports no viewport at all,
    // which happens in some embedded/headless contexts — show everything rather
    // than leaving the page permanently blank.
    if (!('IntersectionObserver' in window) || !window.innerHeight) { showAll(); return; }

    // Safety net: whatever happens, nothing stays invisible for more than 4s.
    var safety = setTimeout(showAll, 4000);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
    window.addEventListener('pagehide', function () { clearTimeout(safety); });
  }

  /* ---------------- accordions ---------------- */
  function initAccordions(root) {
    $$('.faq', root || document).forEach(function (faq) {
      var q = $('.faq__q', faq), a = $('.faq__a', faq);
      if (!q || !a) return;
      q.addEventListener('click', function () {
        var open = faq.classList.toggle('is-open');
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
        a.style.height = open ? a.scrollHeight + 'px' : '0px';
      });
    });
    window.addEventListener('resize', function () {
      $$('.faq.is-open .faq__a', root || document).forEach(function (a) {
        a.style.height = a.scrollHeight + 'px';
      });
    });
  }

  /* ---------------- renderers ---------------- */
  var R = {};

  R.stats = function (el, d) {
    el.innerHTML = d.stats.map(function (s) {
      return '<div class="stat"><div class="stat__value">' + esc(s.value) + '</div>' +
             '<div class="stat__label">' + esc(s.label) + '</div></div>';
    }).join('');
  };

  R.pillars = function (el, d) {
    el.innerHTML = d.pillars.map(function (p, i) {
      return '<article class="pillar reveal" data-delay="' + (i * 90) + '">' +
        '<span class="pillar__num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<h3>' + esc(p.name) + '</h3><p>' + esc(p.body) + '</p></article>';
    }).join('');
  };

  R.placements = function (el, d) {
    var dir = (base ? base.replace(/\/$/, '') + '/' : '') + 'assets/img/placements/';
    var one = d.placements.map(function (p) {
      return '<div class="marquee__item"><img src="' + esc(img(dir, p.logo)) +
             '" alt="' + esc(p.name) + '" loading="lazy" width="180" height="44"></div>';
    }).join('');
    el.innerHTML = one + one; // duplicated for a seamless loop
  };

  function memberCard(m, dir, opts) {
    opts = opts || {};
    var links = [];
    if (m.linkedin) links.push('<a href="' + esc(m.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>');
    if (m.email)    links.push('<a href="mailto:' + esc(m.email) + '">Email</a>');
    return '<article class="member reveal">' +
      (m.photo ? '<div class="member__photo"><img src="' + esc(img(dir, m.photo)) + '" alt="' + esc(m.name) +
                 '" loading="lazy"></div>' : '') +
      '<h3 class="member__name">' + esc(m.name) + '</h3>' +
      '<div class="member__role">' + esc(m.role) + '</div>' +
      (opts.bio && m.bio ? '<p class="member__bio">' + esc(m.bio) + '</p>' : '') +
      (links.length ? '<div class="member__links">' + links.join('') + '</div>' : '') +
      '</article>';
  }

  R.execPreview = function (el, d) {
    var dir = (base ? base.replace(/\/$/, '') + '/' : '') + 'assets/img/team/';
    el.innerHTML = d.executiveBoard.members.map(function (m) {
      return memberCard(m, dir, { bio: false });
    }).join('');
  };

  R.exec = function (el, d) {
    var dir = (base ? base.replace(/\/$/, '') + '/' : '') + 'assets/img/team/';
    el.innerHTML = d.executiveBoard.members.map(function (m) {
      return memberCard(m, dir, { bio: true });
    }).join('');
  };

  R.mds = function (el, d) {
    var dir = (base ? base.replace(/\/$/, '') + '/' : '') + 'assets/img/team/';
    el.innerHTML = d.managingDirectors.members.map(function (m) {
      return memberCard(m, dir, { bio: true });
    }).join('');
  };

  R.classes = function (el, d) {
    el.innerHTML = d.analystClasses.map(function (c) {
      return '<div class="class reveal"><div class="class__grid">' +
        '<div><div class="class__term">' + esc(c.term) + '</div>' +
        '<span class="class__count">' + c.members.length + ' analysts</span></div>' +
        '<ul class="class__names">' + c.members.map(function (n) {
          return '<li>' + esc(n) + '</li>';
        }).join('') + '</ul></div></div>';
    }).join('');
  };

  R.reports = function (el, d) {
    var dir = (base ? base.replace(/\/$/, '') + '/' : '') + 'reports/';
    var list = d.dealReports.slice().sort(function (a, b) {
      return String(b.sortDate).localeCompare(String(a.sortDate));
    });
    el.innerHTML = list.map(function (r, i) {
      return '<a class="report reveal" href="' + dir + esc(r.file) + '" target="_blank" rel="noopener"' +
        ' data-track="report" data-track-label="' + esc(r.file) + '" data-type="' + esc(r.type) + '">' +
        '<span class="report__idx">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="report__title">' + esc(r.title) + '</span>' +
        '<span class="report__type">' + esc(r.type) + '</span>' +
        '<span class="report__date">' + esc(r.date) + '</span>' +
        '<span class="report__cta">Deliverable' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
          '<path d="M12 3v13M6 12l6 6 6-6M4 21h16"/></svg></span></a>';
    }).join('');

    // type filters
    var bar = $('[data-render="report-filters"]');
    if (!bar) return;
    var types = ['All'].concat(list.map(function (r) { return r.type; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; }));
    bar.innerHTML = types.map(function (t, i) {
      return '<button class="filter' + (i === 0 ? ' is-active' : '') + '" data-filter="' + esc(t) + '">' +
             esc(t) + '</button>';
    }).join('');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('.filter'); if (!b) return;
      $$('.filter', bar).forEach(function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active');
      var f = b.getAttribute('data-filter');
      $$('.report', el).forEach(function (row) {
        row.style.display = (f === 'All' || row.getAttribute('data-type') === f) ? '' : 'none';
      });
    });
  };

  R.faqs = function (el, d) {
    el.innerHTML = d.faqs.map(function (f, i) {
      return '<div class="faq reveal">' +
        '<button class="faq__q" aria-expanded="false" aria-controls="faq-' + i + '">' +
          '<span>' + esc(f.q) + '</span><span class="faq__icon" aria-hidden="true"></span></button>' +
        '<div class="faq__a" id="faq-' + i + '"><p>' + esc(f.a) + '</p></div></div>';
    }).join('');
    initAccordions(el);
  };

  /* Apply call-to-action blocks. Renders open/closed state from site.json. */
  R.applyCta = function (el, d) {
    var a = d.apply;
    var where = el.getAttribute('data-track-label') || 'cta';
    if (!a.isOpen) {
      el.innerHTML = '<p class="lead" style="margin-top:1.4rem">' + esc(a.closedMessage) + '</p>';
      return;
    }
    el.innerHTML =
      '<a class="btn btn--gold" href="' + esc(a.url) + '" target="_blank" rel="noopener"' +
      ' data-track="apply" data-track-label="' + esc(where) + '">' + esc(a.buttonLabel) +
      '<span class="btn__arrow" aria-hidden="true">&rarr;</span></a>';
  };

  R.applyStatus = function (el, d) {
    var a = d.apply;
    if (!a.isOpen) { el.innerHTML = '<span class="cta__status">Applications closed</span>'; return; }
    el.innerHTML = '<span class="cta__status"><span class="cta__dot"></span>' + esc(a.headline) + '</span>';
  };

  R.applyHeadline  = function (el, d) { el.textContent = d.apply.headline; };
  R.applySubhead   = function (el, d) { el.textContent = d.apply.subhead; };
  R.tagline        = function (el, d) { el.textContent = d.org.tagline; };
  R.year           = function (el)    { el.textContent = new Date().getFullYear(); };
  R.address        = function (el, d) { el.innerHTML = d.org.address.map(esc).join('<br>'); };
  R.linkedin       = function (el, d) { el.setAttribute('href', d.org.linkedin); };
  R.instagram      = function (el, d) { el.setAttribute('href', d.org.instagram); };

  /* ---------------- boot ---------------- */
  function boot(data) {
    $$('[data-render]').forEach(function (el) {
      var key = el.getAttribute('data-render');
      var fn = R[key];
      if (!fn) return;
      try { fn(el, data); }
      catch (err) { console.error('render failed for "' + key + '"', err); }
    });
    initReveal();
    initAccordions();
  }

  initNav();

  // Content saved from the dashboard wins; the file in the repo is the fallback
  // (and is what a brand-new deployment shows before anything is edited).
  function loadStatic() {
    return fetch(DATA_URL, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  fetch('/api/content')
    .then(function (r) {
      if (r.status === 200) return r.json();
      return loadStatic();                       // 204 = nothing saved yet
    })
    .catch(loadStatic)                           // no backend at all (local preview)
    .then(boot)
    .catch(function (err) {
      console.error('Could not load ' + DATA_URL + '.', err);
      console.error('If you are opening the .html file directly, run a local server instead: python3 -m http.server');
      // Reveal everything so the static copy is still readable.
      $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
    });
})();
