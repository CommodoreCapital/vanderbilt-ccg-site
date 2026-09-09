/* ==========================================================================
   CCG dashboard — "Edit site" tab.
   Loads the live site content, lets the exec board change it in a form, and
   saves it back through /api/content. Uploaded pictures go to /api/upload.
   Exposed as window.CCGAdmin.init({ getPassword, mount }).
   ========================================================================== */
(function () {
'use strict';

var data = null, mount = null, dirty = false, original = '';

var esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
var $  = function (s, c) { return (c || mount).querySelector(s); };
var $$ = function (s, c) { return Array.prototype.slice.call((c || mount).querySelectorAll(s)); };

function imgSrc(dir, val) {
  val = String(val || '');
  if (!val) return '';
  return val.indexOf('asset:') === 0
    ? '/api/asset/' + val.slice(6).replace(/[^a-zA-Z0-9]/g, '')
    : dir + val;
}

function markDirty() {
  dirty = true;
  var b = $('#saveBar');
  if (b) b.classList.add('is-on');
}

/* ---------------- loading ---------------- */
function load() {
  mount.innerHTML = '<div class="empty">Loading the site content…</div>';
  fetch('/api/content')
    .then(function (r) { return r.status === 200 ? r.json() : fetch('data/site.json').then(function (x) { return x.json(); }); })
    .catch(function () { return fetch('data/site.json').then(function (x) { return x.json(); }); })
    .then(function (d) {
      data = d;
      original = JSON.stringify(d);
      render();
    })
    .catch(function (e) {
      mount.innerHTML = '<div class="setup">Could not load the site content. ' + esc(String(e)) + '</div>';
    });
}

/* ---------------- saving ---------------- */
function save(btn) {
  var msg = $('#saveMsg');
  btn.disabled = true; msg.textContent = 'Saving…'; msg.className = 'savemsg';
  fetch('/api/admin/content', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: data })
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; });
  }).then(function (res) {
    btn.disabled = false;
    if (res.ok) {
      dirty = false; original = JSON.stringify(data);
      $('#saveBar').classList.remove('is-on');
      msg.textContent = 'Saved. The website updates within about 30 seconds.';
      msg.className = 'savemsg is-good';
    } else if (res.status === 401) {
      msg.textContent = 'Your sign-in expired. Reload the page to sign in again.'; msg.className = 'savemsg is-bad';
    } else {
      msg.textContent = res.j.message || 'Could not save (' + res.status + ').'; msg.className = 'savemsg is-bad';
    }
  }).catch(function () {
    btn.disabled = false;
    msg.textContent = 'Could not reach the server.'; msg.className = 'savemsg is-bad';
  });
}

function revert(btn) {
  if (!confirm('Undo the last save and go back to the previous version of the site?')) return;
  btn.disabled = true;
  fetch('/api/admin/revert', { method: 'POST' }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (res) {
      btn.disabled = false;
      if (res.ok) { load(); }
      else alert(res.j.message || 'Could not undo.');
    }).catch(function () { btn.disabled = false; alert('Could not reach the server.'); });
}

/* ---------------- image upload ---------------- */
function upload(file, onDone, onErr) {
  var fd = new FormData();
  fd.append('file', file);
  fetch('/api/admin/upload', { method: 'POST', body: fd })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (res) { res.ok ? onDone(res.j.ref) : onErr(res.j.message || 'Upload failed.'); })
    .catch(function () { onErr('Could not reach the server.'); });
}

function pickImage(onDone) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
  input.addEventListener('change', function () {
    var f = input.files && input.files[0];
    if (!f) return;
    onDone.busy && onDone.busy();
    upload(f, onDone, function (m) { alert(m); onDone.fail && onDone.fail(); });
  });
  input.click();
}

/* ---------------- render ---------------- */
function render() {
  mount.innerHTML =
    '<div class="ed-tabs" role="tablist">' +
      '<button class="ed-tab is-on" data-sec="apply">Apply link</button>' +
      '<button class="ed-tab" data-sec="exec">Exec team</button>' +
      '<button class="ed-tab" data-sec="classes">Analyst classes</button>' +
      '<button class="ed-tab" data-sec="slider">Logo slider</button>' +
    '</div>' +
    '<div id="edBody"></div>' +
    '<div class="savebar" id="saveBar">' +
      '<span class="savemsg" id="saveMsg">You have unsaved changes.</span>' +
      '<div class="savebar__actions">' +
        '<button class="btn--quiet toggle" id="undoBtn">Undo last save</button>' +
        '<button class="btn" id="saveBtn">Save changes</button>' +
      '</div>' +
    '</div>';

  $$('.ed-tab').forEach(function (t) {
    t.addEventListener('click', function () {
      $$('.ed-tab').forEach(function (x) { x.classList.remove('is-on'); });
      t.classList.add('is-on');
      section(t.getAttribute('data-sec'));
    });
  });
  $('#saveBtn').addEventListener('click', function () { save(this); });
  $('#undoBtn').addEventListener('click', function () { revert(this); });
  if (dirty) $('#saveBar').classList.add('is-on');
  section('apply');
}

function section(name) {
  var b = $('#edBody');
  if (name === 'apply')   return secApply(b);
  if (name === 'exec')    return secExec(b);
  if (name === 'classes') return secClasses(b);
  if (name === 'slider')  return secSlider(b);
}

function field(label, value, hint) {
  return '<label class="fld"><span class="fld__l">' + esc(label) + '</span>' +
    '<input class="fld__i" type="text" value="' + esc(value || '') + '">' +
    (hint ? '<span class="fld__h">' + esc(hint) + '</span>' : '') + '</label>';
}

/* ---- Apply link ---- */
function secApply(b) {
  var a = data.apply;
  b.innerHTML =
    '<div class="card">' +
      '<h3 class="card__title">The Apply button</h3>' +
      '<p class="card__note" style="margin-bottom:18px">This one link is used by every Apply button on the site. ' +
        'Change it here when you make a new Google Form — click tracking keeps working automatically.</p>' +
      '<label class="fld"><span class="fld__l">Application form link</span>' +
        '<input class="fld__i" id="aUrl" type="url" value="' + esc(a.url) + '" placeholder="https://forms.gle/…"></label>' +
      '<div class="fld"><span class="fld__l">Are applications open?</span>' +
        '<div class="seg"><button class="seg__b' + (a.isOpen ? ' is-on' : '') + '" data-open="1">Open</button>' +
        '<button class="seg__b' + (!a.isOpen ? ' is-on' : '') + '" data-open="0">Closed</button></div>' +
        '<span class="fld__h">When closed, every Apply button is replaced by the message below.</span></div>' +
      field('Headline', a.headline, 'Shown on the Apply page and in the banner, e.g. "Fall 2027 Applications Open Now"') +
      field('Sub-heading', a.subhead) +
      field('Button text', a.buttonLabel) +
      field('Message when closed', a.closedMessage) +
    '</div>';

  var inputs = $$('.fld__i', b);
  $('#aUrl').addEventListener('input', function () { data.apply.url = this.value.trim(); markDirty(); });
  var keys = ['headline', 'subhead', 'buttonLabel', 'closedMessage'];
  inputs.forEach(function (inp) {
    if (inp.id === 'aUrl') return;
    var k = keys.shift();
    inp.addEventListener('input', function () { data.apply[k] = this.value; markDirty(); });
  });
  $$('.seg__b', b).forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('.seg__b', b).forEach(function (x) { x.classList.remove('is-on'); });
      btn.classList.add('is-on');
      data.apply.isOpen = btn.getAttribute('data-open') === '1';
      markDirty();
    });
  });
}

/* ---- Exec team + Managing Directors ---- */
function secExec(b) {
  b.innerHTML =
    group('executiveBoard', 'Executive board') +
    group('managingDirectors', 'Managing directors');

  ['executiveBoard', 'managingDirectors'].forEach(function (g) {
    wireGroup(b, g);
  });
}

function group(g, title) {
  var members = data[g].members;
  return '<div class="card" data-group="' + g + '">' +
    '<div class="card__head"><div><h3 class="card__title">' + esc(title) + '</h3>' +
      '<div class="card__note">Drag is not needed — use the arrows to reorder.</div></div>' +
      '<button class="toggle" data-add="' + g + '">+ Add person</button></div>' +
    '<div class="people">' + members.map(function (m, i) { return personCard(g, m, i, members.length); }).join('') + '</div>' +
  '</div>';
}

function personCard(g, m, i, n) {
  var src = imgSrc('assets/img/team/', m.photo);
  return '<div class="person" data-i="' + i + '">' +
    '<div class="person__pic">' +
      (src ? '<img src="' + esc(src) + '" alt="">' : '<span class="person__empty">No photo</span>') +
      '<button class="person__pick" data-photo="' + i + '">Change</button>' +
    '</div>' +
    '<div class="person__fields">' +
      '<input class="fld__i" data-k="name"     value="' + esc(m.name || '') + '" placeholder="Full name">' +
      '<input class="fld__i" data-k="role"     value="' + esc(m.role || '') + '" placeholder="Role, e.g. President">' +
      '<input class="fld__i" data-k="email"    value="' + esc(m.email || '') + '" placeholder="Email (optional)">' +
      '<input class="fld__i" data-k="linkedin" value="' + esc(m.linkedin || '') + '" placeholder="LinkedIn URL (optional)">' +
      '<textarea class="fld__i fld__t" data-k="bio" rows="3" placeholder="Short bio (optional)">' + esc(m.bio || '') + '</textarea>' +
    '</div>' +
    '<div class="person__ops">' +
      '<button class="iconbtn" data-mv="-1" ' + (i === 0 ? 'disabled' : '') + ' title="Move up">↑</button>' +
      '<button class="iconbtn" data-mv="1" '  + (i === n - 1 ? 'disabled' : '') + ' title="Move down">↓</button>' +
      '<button class="iconbtn iconbtn--del" data-del="1" title="Remove">✕</button>' +
    '</div>' +
  '</div>';
}

function wireGroup(root, g) {
  var card = root.querySelector('[data-group="' + g + '"]');
  var members = data[g].members;

  card.querySelector('[data-add="' + g + '"]').addEventListener('click', function () {
    members.push({ name: '', role: '', email: '', linkedin: '', photo: '', bio: '' });
    markDirty(); secExec($('#edBody'));
  });

  $$('.person', card).forEach(function (row) {
    var i = +row.getAttribute('data-i');
    $$('[data-k]', row).forEach(function (inp) {
      inp.addEventListener('input', function () {
        members[i][inp.getAttribute('data-k')] = inp.value;
        markDirty();
      });
    });
    row.querySelector('[data-photo]').addEventListener('click', function () {
      var btn = this, old = btn.textContent;
      var cb = function (ref) { members[i].photo = ref; markDirty(); secExec($('#edBody')); };
      cb.busy = function () { btn.textContent = 'Uploading…'; btn.disabled = true; };
      cb.fail = function () { btn.textContent = old; btn.disabled = false; };
      pickImage(cb);
    });
    $$('[data-mv]', row).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var d = +btn.getAttribute('data-mv'), j = i + d;
        if (j < 0 || j >= members.length) return;
        var t = members[i]; members[i] = members[j]; members[j] = t;
        markDirty(); secExec($('#edBody'));
      });
    });
    row.querySelector('[data-del]').addEventListener('click', function () {
      if (!confirm('Remove ' + (members[i].name || 'this person') + '?')) return;
      members.splice(i, 1); markDirty(); secExec($('#edBody'));
    });
  });
}

/* ---- Analyst classes ---- */
function secClasses(b) {
  b.innerHTML =
    '<div class="card">' +
      '<div class="card__head"><div><h3 class="card__title">Analyst classes</h3>' +
      '<div class="card__note">One name per line. The top class shows first on the Our Team page.</div></div>' +
      '<button class="toggle" id="addClass">+ Add a class</button></div>' +
      '<div id="classList">' + data.analystClasses.map(function (c, i) {
        return '<div class="klass" data-i="' + i + '">' +
          '<div class="klass__head">' +
            '<input class="fld__i klass__term" value="' + esc(c.term) + '" placeholder="e.g. Fall 2026">' +
            '<span class="klass__n">' + c.members.length + ' analysts</span>' +
            '<button class="iconbtn" data-mv="-1" ' + (i === 0 ? 'disabled' : '') + '>↑</button>' +
            '<button class="iconbtn" data-mv="1" ' + (i === data.analystClasses.length - 1 ? 'disabled' : '') + '>↓</button>' +
            '<button class="iconbtn iconbtn--del" data-del="1">✕</button>' +
          '</div>' +
          '<textarea class="fld__i klass__names" rows="8" placeholder="Aaron Ferber&#10;Adam Shamloul">' +
            esc(c.members.join('\n')) + '</textarea>' +
        '</div>';
      }).join('') + '</div>' +
    '</div>';

  $('#addClass').addEventListener('click', function () {
    data.analystClasses.unshift({ term: '', members: [] });
    markDirty(); secClasses($('#edBody'));
  });

  $$('.klass', b).forEach(function (row) {
    var i = +row.getAttribute('data-i');
    row.querySelector('.klass__term').addEventListener('input', function () {
      data.analystClasses[i].term = this.value; markDirty();
    });
    var ta = row.querySelector('.klass__names');
    ta.addEventListener('input', function () {
      data.analystClasses[i].members = this.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      row.querySelector('.klass__n').textContent = data.analystClasses[i].members.length + ' analysts';
      markDirty();
    });
    $$('[data-mv]', row).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var j = i + (+btn.getAttribute('data-mv'));
        if (j < 0 || j >= data.analystClasses.length) return;
        var t = data.analystClasses[i]; data.analystClasses[i] = data.analystClasses[j]; data.analystClasses[j] = t;
        markDirty(); secClasses($('#edBody'));
      });
    });
    row.querySelector('[data-del]').addEventListener('click', function () {
      if (!confirm('Delete the "' + (data.analystClasses[i].term || 'untitled') + '" class?')) return;
      data.analystClasses.splice(i, 1); markDirty(); secClasses($('#edBody'));
    });
  });
}

/* ---- Logo slider ---- */
function secSlider(b) {
  b.innerHTML =
    '<div class="card">' +
      '<div class="card__head"><div><h3 class="card__title">Placement logo slider</h3>' +
      '<div class="card__note">The scrolling row of firm logos on the homepage. ' +
        'Logos look best as a PNG with a transparent background.</div></div>' +
      '<button class="toggle" id="addLogo">+ Add a logo</button></div>' +
      '<div class="logos">' + data.placements.map(function (p, i) {
        return '<div class="logo" data-i="' + i + '">' +
          '<div class="logo__img">' +
            (p.logo ? '<img src="' + esc(imgSrc('assets/img/placements/', p.logo)) + '" alt="">'
                    : '<span class="person__empty">No image</span>') +
          '</div>' +
          '<input class="fld__i" data-k="name" value="' + esc(p.name) + '" placeholder="Firm name">' +
          '<div class="logo__ops">' +
            '<button class="toggle" data-pick="1">Change image</button>' +
            '<button class="iconbtn" data-mv="-1" ' + (i === 0 ? 'disabled' : '') + '>↑</button>' +
            '<button class="iconbtn" data-mv="1" ' + (i === data.placements.length - 1 ? 'disabled' : '') + '>↓</button>' +
            '<button class="iconbtn iconbtn--del" data-del="1">✕</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>' +
    '</div>';

  $('#addLogo').addEventListener('click', function () {
    var btn = this, old = btn.textContent;
    var cb = function (ref) {
      data.placements.push({ name: 'New firm', logo: ref });
      markDirty(); secSlider($('#edBody'));
    };
    cb.busy = function () { btn.textContent = 'Uploading…'; btn.disabled = true; };
    cb.fail = function () { btn.textContent = old; btn.disabled = false; };
    pickImage(cb);
  });

  $$('.logo', b).forEach(function (row) {
    var i = +row.getAttribute('data-i');
    row.querySelector('[data-k="name"]').addEventListener('input', function () {
      data.placements[i].name = this.value; markDirty();
    });
    row.querySelector('[data-pick]').addEventListener('click', function () {
      var btn = this, old = btn.textContent;
      var cb = function (ref) { data.placements[i].logo = ref; markDirty(); secSlider($('#edBody')); };
      cb.busy = function () { btn.textContent = 'Uploading…'; btn.disabled = true; };
      cb.fail = function () { btn.textContent = old; btn.disabled = false; };
      pickImage(cb);
    });
    $$('[data-mv]', row).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var j = i + (+btn.getAttribute('data-mv'));
        if (j < 0 || j >= data.placements.length) return;
        var t = data.placements[i]; data.placements[i] = data.placements[j]; data.placements[j] = t;
        markDirty(); secSlider($('#edBody'));
      });
    });
    row.querySelector('[data-del]').addEventListener('click', function () {
      if (!confirm('Remove ' + (data.placements[i].name || 'this logo') + ' from the slider?')) return;
      data.placements.splice(i, 1); markDirty(); secSlider($('#edBody'));
    });
  });
}

/* ---------------- public API ---------------- */
window.CCGAdmin = {
  init: function (opts) {
    mount = opts.mount;
    load();
  },
  hasUnsavedChanges: function () { return dirty; }
};

window.addEventListener('beforeunload', function (e) {
  if (dirty) { e.preventDefault(); e.returnValue = ''; }
});

})();
