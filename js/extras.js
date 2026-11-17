/* Ateliere IS89 · exercițiile (js/extras.js)
   Fiecare exercițiu: render(root, s) scrie HTML-ul înainte ca player-ul să lege câmpurile, init(root, first, s) îl pornește,
   leave(s) curăță la ieșirea de pe ecran. Starea lor stă în P.S.ex (se salvează în LMS sau în browser, ca restul răspunsurilor).
   Exerciții: quiz (Fotografie, Film), expo (Fotografie 1.8), vizor (Film 1.5), pancarta (Pancarte 1.8), fisa (Fotografie 1.11),
   final (ecranele de final: detaliile din vizor, pancarta). */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function P() { return window.P; }
  function esc(s) { return P().esc(s); }
  function icon(n) { return P().icon(n); }
  function exState(k, def) {
    var S = P().S;
    if (!S.ex[k]) { S.ex[k] = def; }
    return S.ex[k];
  }
  function save() { P().save(300); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v) { return String(v).replace('.', ','); }
  // Amestecare stabilă (aceeași ordine la fiecare revenire), niciodată în ordinea corectă
  function perm(n, seed) {
    var a = [], i, j, t, x = seed || 7;
    for (i = 0; i < n; i++) { a.push(i); }
    var rnd = function () { x = (x * 9301 + 49297) % 233280; return x / 233280; };
    for (i = n - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    var same = a.every(function (v, k) { return v === k; });
    if (same && n > 1) { a.push(a.shift()); }
    return a;
  }
  function download(name, blob) {
    if (window.AT_CONFIG.preview) {
      // în previzualizarea de pe claude.ai, pagina nu are voie să descarce fișiere
      P().banner('În previzualizare nu se pot descărca fișiere. În cursul publicat (LMS, GitHub Pages sau de pe PC), butonul descarcă fișierul.');
      return false;
    }
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
    return true;
  }

  var EX = window.AT_EX = {};

  // =============================================================================================
  // Întrebări formative: ordine (atingi pașii pe rând), potrivire (liste), o variantă, mai multe variante
  // =============================================================================================
  EX.quiz = {
    render: function (root) {
      var box = $('.quiz', root);
      if (box) { box.innerHTML = '<div class="qz"></div>'; }
    },
    init: function (root, first, s) {
      var Q = window.AT_CONFIG.quiz || [], box = $('.qz', root);
      if (!box || !Q.length) { return; }
      var st = exState('quiz', { i: 0, a: {}, r: {}, done: false });
      draw();

      function draw(focus) {
        if (st.done) { drawEnd(focus); return; }
        var i = clamp(st.i, 0, Q.length - 1), q = Q[i], body = '';
        if (q.type === 'order') {
          var o = perm(q.items.length, 11 + i), pick = st.a[i] || [];
          body = '<p class="qz-help">Atinge pașii în ordinea corectă. Atinge din nou un pas ca să-l scoți.</p><ol class="qz-order">' + o.map(function (k) {
            var pos = pick.indexOf(k);
            return '<li><button class="qz-oi" data-k="' + k + '" aria-pressed="' + (pos >= 0) + '"><span class="qz-on" aria-hidden="true">' + (pos >= 0 ? pos + 1 : '') + '</span>' +
              '<span>' + esc(q.items[k]) + '<span class="sr-only">' + (pos >= 0 ? ', poziția ' + (pos + 1) : ', încă fără poziție') + '</span></span></button></li>';
          }).join('') + '</ol>';
        } else if (q.type === 'match') {
          var om = perm(q.pairs.length, 5 + i), sel = st.a[i] || [];
          body = '<div class="qz-match">' + q.pairs.map(function (pr, k) {
            return '<label class="qz-mrow"><span class="qz-mk">' + esc(pr[0]) + '</span><select data-k="' + k + '"><option value="">Alege…</option>' +
              om.map(function (j) { return '<option value="' + j + '"' + (String(sel[k]) === String(j) ? ' selected' : '') + '>' + esc(q.pairs[j][1]) + '</option>'; }).join('') +
              '</select></label>';
          }).join('') + '</div>';
        } else {
          var op = perm(q.opts.length, 3 + i), multi = q.type === 'multi', ans = st.a[i];
          body = (multi ? '<p class="qz-help">Pot fi mai multe variante corecte.</p>' : '') + '<div class="qz-opts">' + op.map(function (k, n) {
            var on = multi ? !!(ans && ans[k]) : ans === k;
            return '<label class="optl"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="qz' + i + '" value="' + k + '"' + (on ? ' checked' : '') + '>' +
              (multi ? '<span class="box" aria-hidden="true">' + icon('check') + '</span>' : '<span class="radio" aria-hidden="true"></span>') +
              '<span class="letter" aria-hidden="true">' + 'ABCD'[n] + '</span><span class="txt">' + esc(q.opts[k][0]) + '</span></label>';
          }).join('') + '</div>';
        }
        var dots = Q.map(function (x, k) { return '<li class="' + (k === i ? 'is-cur' : (st.r[k] === 'ok' ? 'is-ok' : '')) + '"></li>'; }).join('');
        box.innerHTML = '<fieldset class="qz-q"><legend class="qz-text" tabindex="-1">' + esc(q.q) + '</legend>' + body + '</fieldset>' +
          '<div class="qz-side"><p class="qz-pos">Întrebarea <b>' + (i + 1) + '</b> din ' + Q.length + '</p><ol class="qz-dots" aria-hidden="true">' + dots + '</ol>' +
          '<div class="btn-row"><button class="btn btn--primary" data-q="check">' + icon('check') + 'Verifică</button></div>' +
          '<div class="qz-fb" aria-live="polite"></div><div class="btn-row qz-nav"></div></div>';
        wire(i, q);
        if (st.shown === i && st.lastOk != null) { feedback(i, q, st.lastOk, true); }
        if (focus) { var lg = $('.qz-text', box); try { lg.focus({ preventScroll: true }); } catch (e) { lg.focus(); } }
      }

      function answered(i, q) {
        var a = st.a[i];
        if (q.type === 'order') { return !!a && a.length === q.items.length; }
        if (q.type === 'match') { return !!a && q.pairs.every(function (p, k) { return a[k] !== '' && a[k] != null; }); }
        if (q.type === 'multi') { return !!a && Object.keys(a).some(function (k) { return a[k]; }); }
        return a != null;
      }
      function isOk(i, q) {
        var a = st.a[i];
        if (q.type === 'order') { return a.every(function (v, k) { return v === k; }); }
        if (q.type === 'match') { return q.pairs.every(function (p, k) { return Number(a[k]) === k; }); }
        if (q.type === 'multi') { return q.opts.every(function (o, k) { return !!a[k] === !!o[1]; }); }
        return !!q.opts[a][1];
      }
      function clearFb() { st.shown = null; st.lastOk = null; var fb = $('.qz-fb', box); if (fb) { fb.innerHTML = ''; } $('.qz-nav', box).innerHTML = ''; }
      function wire(i, q) {
        $$('.qz-oi', box).forEach(function (b) {
          b.addEventListener('click', function () {
            var k = Number(b.getAttribute('data-k')), a = (st.a[i] = st.a[i] || []), pos = a.indexOf(k);
            if (pos >= 0) { a.splice(pos, 1); } else { a.push(k); }
            save(); clearFb();
            $$('.qz-oi', box).forEach(function (x) {
              var kk = Number(x.getAttribute('data-k')), p = a.indexOf(kk);
              x.setAttribute('aria-pressed', String(p >= 0));
              $('.qz-on', x).textContent = p >= 0 ? String(p + 1) : '';
              $('.sr-only', x).textContent = p >= 0 ? ', poziția ' + (p + 1) : ', încă fără poziție';
            });
            P().announce(pos >= 0 ? 'Scos din ordine' : 'Poziția ' + a.length);
          });
        });
        $$('select', box).forEach(function (sl) {
          sl.addEventListener('change', function () { (st.a[i] = st.a[i] || [])[Number(sl.getAttribute('data-k'))] = sl.value; save(); clearFb(); });
        });
        $$('.qz-opts input', box).forEach(function (inp) {
          inp.addEventListener('change', function () {
            var k = Number(inp.value);
            if (q.type === 'multi') { (st.a[i] = st.a[i] || {})[k] = inp.checked; } else { st.a[i] = k; }
            save(); clearFb();
          });
        });
        $('[data-q=check]', box).addEventListener('click', function () {
          if (!answered(i, q)) {
            P().banner(q.type === 'order' ? 'Atinge toți pașii, în ordinea pe care o crezi corectă.' : q.type === 'match' ? 'Alege câte o variantă pentru fiecare rând.' : 'Alege o variantă.');
            return;
          }
          var ok = isOk(i, q);
          if (st.r[i] == null) { st.r[i] = ok ? 'ok' : 'ko'; }
          st.shown = i; st.lastOk = ok; save();
          feedback(i, q, ok);
        });
      }
      function feedback(i, q, ok, quiet) {
        var txt;
        if (q.type === 'single') { txt = q.opts[st.a[i]][2]; } else { txt = ok ? q.ok : q.ko; }
        $('.qz-fb', box).innerHTML = '<div class="feedback ' + (ok ? 'feedback--ok' : 'feedback--no') + '"><span class="badge" aria-hidden="true">' + icon(ok ? 'check' : 'info') + '</span>' +
          '<div><p class="h3">' + (ok ? 'Corect' : 'Nu încă') + '</p><p>' + esc(txt) + '</p></div></div>';
        var last = i === Q.length - 1;
        $('.qz-nav', box).innerHTML = '<button class="btn" data-q="next">' + (last ? 'Vezi rezultatul' : 'Următoarea întrebare') + icon('next') + '</button>';
        $('[data-q=next]', box).addEventListener('click', function () {
          st.shown = null; st.lastOk = null;
          if (last) { st.done = true; } else { st.i = i + 1; }
          save(); draw(true);
        });
        if (!quiet) { P().announce(ok ? 'Corect' : 'Nu încă'); }
      }
      function drawEnd(focus) {
        var n = Q.filter(function (x, k) { return st.r[k] === 'ok'; }).length;
        box.innerHTML = '<div class="qz-end"><h2 class="h2" tabindex="-1">Ai terminat întrebările</h2><p class="lead"><span class="stat-n">' + n + '</span> / ' + Q.length +
          ' corecte din prima încercare.</p><p class="p">Întrebările nu sunt notate: contează ce afli din explicații.</p>' +
          '<button class="btn" data-q="again">' + icon('replay') + 'Reia întrebările</button></div>';
        $('[data-q=again]', box).addEventListener('click', function () {
          st.i = 0; st.a = {}; st.r = {}; st.done = false; st.shown = null; st.lastOk = null; save(); draw(true);
        });
        if (focus) { var h = $('.h2', box); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
      }
    }
  };

  // =============================================================================================
  // Fotografie 1.8 · simulatorul de expunere: ISO, timp, diafragmă; două misiuni; 36 de cadre
  // =============================================================================================
  var ISO = [100, 200, 400, 800, 1600, 3200];
  var TL = ['1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8'];
  var TS = [1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8];
  var FN = [2, 2.8, 4, 5.6, 8, 11, 16];
  var BLUR = [3, 3, 2, 1, 1, 0, 0];               // fundalul: cât de neclar e, după diafragmă
  var GRAIN = [0.05, 0.1, 0.17, 0.26, 0.36, 0.48]; // granulația, după ISO
  var SCENE = 12;                                  // lumina scenei (EV la ISO 100): zi cu cer acoperit
  function expoE(c) { return SCENE - (Math.log(FN[c.f] * FN[c.f] / TS[c.t]) / Math.LN2 - Math.log(ISO[c.i] / 100) / Math.LN2); }
  function sceneHtml(c, main) {
    // întâi contrastul, apoi lumina: supraexpunerea „arde” spre alb, subexpunerea se întunecă
    var E = clamp(expoE(c), -3, 3), b = Math.pow(2, E * 0.75), k = E > 0 ? 1 - 0.08 * E : 1 + 0.05 * -E;
    return '<div class="xp-exp" style="filter:contrast(' + k.toFixed(3) + ') brightness(' + b.toFixed(3) + ')">' +
      '<img class="xp-bg" src="media/ex/fundal-' + BLUR[c.f] + '.jpg" alt="" draggable="false">' +
      '<img class="xp-rider" src="media/ex/biciclist-' + c.t + '.webp" alt="" draggable="false"></div>' +
      '<span class="xp-grain" style="opacity:' + GRAIN[c.i] + '"></span>' + (main ? '<span class="xp-vf"></span><span class="xp-shot"></span>' : '');
  }
  function describe(c) {
    var E = expoE(c), parts = [];
    parts.push(c.t <= 1 ? 'biciclistul e înghețat' : c.t >= 5 ? 'biciclistul lasă o urmă' : c.t >= 3 ? 'biciclistul e puțin mișcat' : 'biciclistul e aproape clar');
    parts.push(BLUR[c.f] >= 2 ? 'fundalul e neclar' : BLUR[c.f] === 1 ? 'fundalul e ușor neclar' : 'fundalul e clar');
    parts.push(Math.abs(E) <= 0.7 ? 'lumina e corectă' : E > 0 ? 'imaginea e prea luminoasă' : 'imaginea e prea întunecată');
    if (c.i >= 3) { parts.push('se vede granulația'); }
    return 'Previzualizare alb-negru: ' + parts.join(', ') + '.';
  }
  function meterText(E) {
    if (Math.abs(E) <= 0.7) { return 'Lumină corectă'; }
    if (E > 3.4) { return 'Mult prea multă lumină'; }
    if (E < -3.4) { return 'Mult prea puțină lumină'; }
    return (E > 0 ? 'Prea multă lumină (+' : 'Prea puțină lumină (−') + Math.round(Math.abs(E)) + ')';
  }
  EX.expo = {
    render: function (root, s) {
      var box = $('.expo', root);
      if (!box) { return; }
      var cm = s.cm || {};
      box.innerHTML = '<h1 class="h1">' + esc(s.title) + '</h1><div class="xp">' +
        '<div class="xp-left"><div class="xp-scene xp-main" role="img" aria-label=""></div>' +
        '<div class="xp-led" data-cue="' + (cm[3] || 0) + '"><span class="xp-led-v" aria-hidden="true"></span><span class="xp-scale" aria-hidden="true">' +
        '<span>−</span><i></i><i></i><i></i><i class="z"></i><i></i><i></i><i></i><span>+</span></span><span class="xp-meter-t"></span></div>' +
        '<ol class="xp-roll" aria-label="Cadrele tale"></ol></div>' +
        '<div class="xp-side"><ul class="xp-missions">' +
        '<li class="xp-m" data-m="1" data-cue="' + (cm[1] || 0) + '"><span class="xp-box" aria-hidden="true">' + icon('check') + '</span><span><b>Misiunea 1 · Îngheață-l</b>Biciclistul clar, lumina corectă.<span class="sr-only xp-m-st"></span></span></li>' +
        '<li class="xp-m" data-m="2" data-cue="' + (cm[2] || 0) + '"><span class="xp-box" aria-hidden="true">' + icon('check') + '</span><span><b>Misiunea 2 · Lasă o urmă</b>Mișcarea vizibilă, lumina tot corectă.<span class="sr-only xp-m-st"></span></span></li></ul>' +
        '<div class="xp-ctl">' +
        '<div class="xp-row"><label for="xpIso">ISO · sensibilitatea</label><output id="xpIsoV" for="xpIso"></output><input type="range" id="xpIso" min="0" max="5" step="1"><span class="xp-ends" aria-hidden="true"><span>100 · fin</span><span>3200 · granulat</span></span></div>' +
        '<div class="xp-row"><label for="xpT">Timpul de expunere</label><output id="xpTV" for="xpT"></output><input type="range" id="xpT" min="0" max="7" step="1"><span class="xp-ends" aria-hidden="true"><span>1/1000 · îngheață</span><span>1/8 · urmă</span></span></div>' +
        '<div class="xp-row"><label for="xpF">Diafragma</label><output id="xpFV" for="xpF"></output><input type="range" id="xpF" min="0" max="6" step="1"><span class="xp-ends" aria-hidden="true"><span>f/2 · fundal neclar</span><span>f/16 · totul clar</span></span></div>' +
        '</div><div class="xp-shoot"><button class="btn btn--primary" id="xpShoot">' + icon('photo') + 'Declanșează</button><p class="xp-left-n" aria-live="polite"></p></div>' +
        '<p class="xp-fb" aria-live="polite"></p></div></div>';
    },
    init: function (root) {
      var box = $('.expo', root);
      if (!box) { return; }
      var st = exState('expo', { i: 0, t: 3, f: 3, left: 36, shots: [], m1: false, m2: false });
      var main = $('.xp-main', box), led = $('.xp-led-v', box), dots = $$('.xp-scale i', box), mt = $('.xp-meter-t', box);
      var ri = $('#xpIso', box), rt = $('#xpT', box), rf = $('#xpF', box);
      [0, 1, 2, 3].forEach(function (n) { var im = new Image(); im.src = 'media/ex/fundal-' + n + '.jpg'; });
      TL.forEach(function (x, n) { var im = new Image(); im.src = 'media/ex/biciclist-' + n + '.webp'; });
      ri.value = st.i; rt.value = st.t; rf.value = st.f;
      function upd() {
        var c = { i: st.i, t: st.t, f: st.f }, E = expoE(c);
        main.innerHTML = sceneHtml(c, true);
        main.setAttribute('aria-label', describe(c));
        led.textContent = TL[c.t] + '  f/' + num(FN[c.f]) + '  ISO ' + ISO[c.i];
        var lit = clamp(Math.round(E), -3, 3);
        dots.forEach(function (d, k) { d.classList.toggle('on', k - 3 === lit); });
        mt.textContent = meterText(E);
        $('#xpIsoV', box).textContent = String(ISO[c.i]);
        $('#xpTV', box).textContent = TL[c.t] + ' s';
        $('#xpFV', box).textContent = 'f/' + num(FN[c.f]);
        ri.setAttribute('aria-valuetext', 'ISO ' + ISO[c.i] + '. ' + meterText(E));
        rt.setAttribute('aria-valuetext', TL[c.t] + ' secunde. ' + meterText(E));
        rf.setAttribute('aria-valuetext', 'f/' + num(FN[c.f]) + '. ' + meterText(E));
      }
      function missions() {
        $$('.xp-m', box).forEach(function (m) {
          var done = m.getAttribute('data-m') === '1' ? st.m1 : st.m2;
          m.classList.toggle('is-done', !!done);
          $('.xp-m-st', m).textContent = done ? ' Îndeplinită.' : ' Neîndeplinită încă.';
        });
      }
      function roll() {
        var r = $('.xp-roll', box);
        if (!st.shots.length) { r.innerHTML = '<li class="xp-roll-empty">Cadrele tale apar aici, pe film.</li>'; return; }
        r.innerHTML = st.shots.slice(-6).map(function (x) {
          var c = { i: x[0], t: x[1], f: x[2] };
          return '<li><div class="xp-scene" role="img" aria-label="Cadrul ' + x[3] + ': ' + esc(describe(c).replace('Previzualizare alb-negru: ', '')) + '">' + sceneHtml(c, false) + '</div>' +
            '<span class="xp-n" aria-hidden="true">' + String(x[3]).padStart(2, '0') + '</span>' + (x[4] ? '<span class="xp-ok" aria-hidden="true">' + icon('check') + '</span>' : '') + '</li>';
        }).join('');
      }
      function counter() {
        var p = $('.xp-left-n', box), b = $('#xpShoot', box);
        if (st.left > 0) {
          p.innerHTML = '<b>' + st.left + '</b>' + (st.left === 1 ? 'cadru rămas' : 'cadre rămase');
          b.disabled = false;
        } else {
          p.innerHTML = 'Filmul s-a terminat. <button class="btn btn--link" id="xpNew">Pune un film nou</button>';
          b.disabled = true;
          $('#xpNew', box).addEventListener('click', function () { st.left = 36; st.shots = []; save(); counter(); roll(); });
        }
      }
      [[ri, 'i'], [rt, 't'], [rf, 'f']].forEach(function (pr) {
        pr[0].addEventListener('input', function () { st[pr[1]] = Number(pr[0].value); upd(); save(); });
      });
      $('#xpShoot', box).addEventListener('click', function () {
        if (st.left <= 0) { return; }
        var c = { i: st.i, t: st.t, f: st.f }, E = expoE(c), ok = Math.abs(E) <= 0.7, fr = c.t <= 1, tr = c.t >= 5, msg, win = 0;
        st.left -= 1;
        var n = 36 - st.left;
        if (!ok) {
          if (E > 0) {
            msg = 'Prea luminoasă: a intrat prea multă lumină. ' + (c.f === 6 && c.i === 0
              ? 'Diafragma e deja cea mai închisă și ISO-ul cel mai mic: scurtează timpul (1/15 sau 1/30).'
              : 'Închide diafragma (un număr f mai mare), scade ISO-ul sau scurtează timpul.');
          } else {
            msg = 'Prea întunecată: a intrat prea puțină lumină. ' + (fr
              ? 'Păstrează timpul scurt și compensează: deschide diafragma (f/2,8 sau f/4) sau crește ISO-ul.'
              : 'Deschide diafragma (un număr f mai mic), crește ISO-ul sau lungește timpul.');
          }
        } else if (fr) {
          win = 1; msg = 'Biciclistul e înghețat, iar lumina e corectă.' + (st.m1 ? '' : ' Misiunea 1: îndeplinită.');
          st.m1 = true;
        } else if (tr) {
          win = 2; msg = 'Biciclistul lasă o urmă, iar lumina e corectă.' + (st.m2 ? '' : ' Misiunea 2: îndeplinită.');
          st.m2 = true;
        } else {
          msg = 'Lumina e corectă, dar mișcarea nu e nici înghețată, nici o urmă clară. Pentru îngheț: 1/500 sau mai scurt. Pentru urmă: 1/30 sau mai lung.';
        }
        if (st.m1 && st.m2 && win) { msg += ' Ambele misiuni sunt îndeplinite: ai schimbat un reglaj și l-ai compensat cu altul.'; }
        st.shots.push([c.i, c.t, c.f, n, win]);
        if (st.shots.length > 12) { st.shots.shift(); }
        var fb = $('.xp-fb', box);
        fb.textContent = 'Cadrul ' + n + ': ' + msg;
        fb.classList.toggle('is-ok', !!win);
        var sh = $('.xp-shot', main);
        if (sh) { sh.classList.remove('is-on'); void sh.offsetWidth; sh.classList.add('is-on'); }
        if (window.AT_CONFIG.sfx && P().prefs.voice) { try { var a = new Audio('media/ex/declansator.mp3'); a.volume = 0.7; a.play().catch(function () {}); } catch (e) { /* fără sunet */ } }
        missions(); roll(); counter(); P().saveNow(true);
      });
      upd(); missions(); roll(); counter();
    }
  };

  // =============================================================================================
  // Film 1.5 · vizorul: alegi o fotografie din 1989, muți vizorul, fotografiezi trei detalii
  // =============================================================================================
  var PHOTOS = [
    { src: 'media/cadre/cadru-2.jpg', w: 494, h: 290, alt: 'Fotografie din decembrie 1989: oameni strânși în jurul unui transportor blindat, pe o stradă din Timișoara.' },
    { src: 'media/cadre/cadru-3.jpg', w: 524, h: 349, alt: 'Fotografie din decembrie 1989: bocancul unui militar lângă încărcătoare căzute pe jos.' },
    { src: 'media/cadre/cadru-4.jpg', w: 580, h: 356, alt: 'Fotografie din decembrie 1989: militari și blindate într-o piață din Timișoara.' }
  ];
  var SLOTS = [['Când?', 'un detaliu care spune când'], ['Unde?', 'un detaliu care spune unde'], ['Ce n-ai observat?', 'ce nu ai văzut la prima privire']];
  function cropStyle(c) {
    var ph = PHOTOS[c.p] || PHOTOS[0];
    var bx = c.w >= 1 ? 0 : (c.x / (1 - c.w)) * 100, by = c.h >= 1 ? 0 : (c.y / (1 - c.h)) * 100;
    return 'background-image:url(' + ph.src + ');background-size:' + (100 / c.w).toFixed(2) + '% ' + (100 / c.h).toFixed(2) + '%;background-position:' + bx.toFixed(2) + '% ' + by.toFixed(2) + '%';
  }
  EX.vizor = {
    render: function (root, s) {
      var box = $('.vizor', root);
      if (!box) { return; }
      var cm = s.cm || {};
      box.innerHTML = '<h1 class="h1">' + esc(s.title) + '</h1><div class="vz">' +
        '<div class="vz-main"><div class="vz-stage" tabindex="0" role="application" aria-roledescription="vizor" aria-describedby="vzHelp">' +
        '<img class="vz-photo" alt="" draggable="false"><div class="vz-frame"><i></i><i></i><i></i><i></i></div><span class="vz-flash"></span></div>' +
        '<p class="vz-cap">Fotografii din decembrie 1989: martor anonim, Timișoara. Fotografiile sunt mici: de aproape, detaliile se văd granulat.</p></div>' +
        '<div class="vz-side"><div class="vz-pick" role="group" aria-label="Alege fotografia">' + PHOTOS.map(function (ph, k) {
          return '<button class="vz-thumb" data-p="' + k + '" aria-pressed="false" aria-label="Fotografia ' + (k + 1) + ': ' + esc(ph.alt.replace('Fotografie din decembrie 1989: ', '')) + '"><img src="' + ph.src + '" alt=""></button>';
        }).join('') + '</div>' +
        '<p class="ex-help" id="vzHelp" data-cue="' + (cm[1] || 0) + '">Trage vizorul sau folosește săgețile. Plus apropie, minus depărtează. Enter fotografiază detaliul.</p>' +
        '<div class="vz-tools" data-cue="' + (cm[1] || 0) + '"><button class="btn btn--small vz-zoom" data-z="-1" aria-label="Depărtează vizorul">−</button>' +
        '<button class="btn btn--small vz-zoom" data-z="1" aria-label="Apropie vizorul">+</button>' +
        '<button class="btn btn--primary btn--small" id="vzShoot">' + icon('photo') + 'Fotografiază detaliul</button></div>' +
        '<ol class="vz-slots">' + SLOTS.map(function (sl, k) {
          return '<li class="vz-slot" data-s="' + k + '" data-cue="' + (k < 2 ? (cm[2] || 0) : (cm[3] || 0)) + '"><button class="vz-crop is-empty" data-act-s="' + k + '" aria-label="Alege caseta ' + (k + 1) + ': ' + esc(sl[0]) + '">' + (k + 1) + '</button>' +
            '<div><p class="vz-slot-h" style="margin:0"><span>' + esc(sl[0]) + '</span><button class="btn btn--link" data-redo="' + k + '">Refă</button></p>' +
            '<label class="sr-only" for="vzT' + k + '">Ce spune detaliul pentru ' + esc(sl[0]) + '</label></div>' +
            '<input type="text" id="vzT' + k + '" maxlength="80" placeholder="' + esc(sl[1]) + '"></li>';
        }).join('') + '</ol><p class="vz-fb" aria-live="polite"></p></div></div>';
    },
    init: function (root) {
      var box = $('.vizor', root);
      if (!box) { return; }
      var st = exState('vizor', { p: 0, x: 0.3, y: 0.3, w: 0.36, a: 0, slots: [null, null, null], t: ['', '', ''] });
      var stage = $('.vz-stage', box), img = $('.vz-photo', box), fr = $('.vz-frame', box), W = 1080, H = 640;
      function ph() { return PHOTOS[st.p] || PHOTOS[0]; }
      function hOf(w) { return w * (ph().w / ph().h) / 1.5; }
      function fitStage() {
        var p = ph(), ar = p.w / p.h, maxW = stage.parentNode.clientWidth || 1080;
        W = Math.min(maxW, 720 * ar); H = W / ar;
        stage.style.width = W + 'px'; stage.style.height = H + 'px';
      }
      function place() {
        st.w = clamp(st.w, 0.18, Math.min(0.7, 1.5 / (ph().w / ph().h)));
        var h = hOf(st.w);
        st.x = clamp(st.x, 0, 1 - st.w); st.y = clamp(st.y, 0, 1 - h);
        fr.style.left = (st.x * 100) + '%'; fr.style.top = (st.y * 100) + '%';
        fr.style.width = (st.w * 100) + '%'; fr.style.height = (h * 100) + '%';
      }
      function setPhoto(k) {
        st.p = k; img.src = ph().src;
        stage.setAttribute('aria-label', 'Vizorul pe ' + ph().alt.charAt(0).toLowerCase() + ph().alt.slice(1));
        $$('.vz-thumb', box).forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-p')) === k)); });
        fitStage(); place();
      }
      function slots() {
        $$('.vz-slot', box).forEach(function (li) {
          var k = Number(li.getAttribute('data-s')), c = st.slots[k], cr = $('.vz-crop', li);
          li.classList.toggle('is-active', k === st.a);
          if (c) { cr.classList.remove('is-empty'); cr.textContent = ''; cr.setAttribute('style', cropStyle(c)); }
          else { cr.classList.add('is-empty'); cr.textContent = String(k + 1); cr.removeAttribute('style'); }
          $('[data-redo]', li).hidden = !c;
        });
      }
      function syncText() { P().setVar('tDetalii', st.t.filter(function (x) { return x; }).join(' / ')); }
      function capture() {
        var k = st.a, h = hOf(st.w);
        st.slots[k] = { p: st.p, x: +st.x.toFixed(4), y: +st.y.toFixed(4), w: +st.w.toFixed(4), h: +h.toFixed(4) };
        var fl = $('.vz-flash', box); fl.classList.remove('is-on'); void fl.offsetWidth; fl.classList.add('is-on');
        if (window.AT_CONFIG.sfx && P().prefs.voice) { try { var a = new Audio('media/ex/declansator.mp3'); a.volume = 0.7; a.play().catch(function () {}); } catch (e) { /* fără sunet */ } }
        var nextEmpty = st.slots.indexOf(null), msg = 'Detaliul pentru „' + SLOTS[k][0] + '” e salvat.';
        if (nextEmpty >= 0) { st.a = nextEmpty; msg += ' Acum: „' + SLOTS[nextEmpty][0] + '”.'; }
        else { msg += ' Ai toate cele trei detalii. Scrie lângă fiecare ce spune; le regăsești la final.'; }
        $('.vz-fb', box).textContent = msg;
        slots(); P().saveNow(true);
      }
      // trasul cu mouse-ul sau cu degetul
      var drag = null;
      stage.addEventListener('pointerdown', function (e) {
        var r = stage.getBoundingClientRect(), sx = r.width / W;
        if (e.target === fr || fr.contains(e.target)) {
          drag = { px: e.clientX, py: e.clientY, x: st.x, y: st.y, sx: r.width, sy: r.height };
        } else {
          // atingere pe fotografie: vizorul vine acolo
          st.x = (e.clientX - r.left) / r.width - st.w / 2; st.y = (e.clientY - r.top) / r.height - hOf(st.w) / 2; place();
          drag = { px: e.clientX, py: e.clientY, x: st.x, y: st.y, sx: r.width, sy: r.height };
        }
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignoră */ }
        e.preventDefault(); void sx;
      });
      stage.addEventListener('pointermove', function (e) {
        if (!drag) { return; }
        st.x = drag.x + (e.clientX - drag.px) / drag.sx; st.y = drag.y + (e.clientY - drag.py) / drag.sy; place();
      });
      var end = function () { if (drag) { drag = null; save(); } };
      stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
      stage.addEventListener('keydown', function (e) {
        var d = e.shiftKey ? 0.08 : 0.02, used = true;
        if (e.key === 'ArrowLeft') { st.x -= d; } else if (e.key === 'ArrowRight') { st.x += d; }
        else if (e.key === 'ArrowUp') { st.y -= d; } else if (e.key === 'ArrowDown') { st.y += d; }
        else if (e.key === '+' || e.key === '=') { zoom(1); } else if (e.key === '-' || e.key === '_') { zoom(-1); }
        else if (e.key === 'Enter' || e.key === ' ') { capture(); }
        else { used = false; }
        if (used) { e.preventDefault(); place(); save(); }
      });
      function zoom(dir) {
        var cx = st.x + st.w / 2, cy = st.y + hOf(st.w) / 2;
        st.w = clamp(st.w - dir * 0.06, 0.18, 0.7);
        place(); st.x = cx - st.w / 2; st.y = cy - hOf(st.w) / 2; place(); save();
      }
      $$('.vz-zoom', box).forEach(function (b) { b.addEventListener('click', function () { zoom(Number(b.getAttribute('data-z'))); }); });
      $('#vzShoot', box).addEventListener('click', capture);
      $$('.vz-thumb', box).forEach(function (b) { b.addEventListener('click', function () { setPhoto(Number(b.getAttribute('data-p'))); save(); }); });
      $$('[data-act-s]', box).forEach(function (b) {
        b.addEventListener('click', function () { st.a = Number(b.getAttribute('data-act-s')); slots(); $('.vz-fb', box).textContent = 'Caseta activă: „' + SLOTS[st.a][0] + '”. Mută vizorul și fotografiază.'; save(); });
      });
      $$('[data-redo]', box).forEach(function (b) {
        b.addEventListener('click', function () { var k = Number(b.getAttribute('data-redo')); st.a = k; if (st.slots[k]) { st.p = st.slots[k].p; setPhoto(st.p); } slots(); $('.vz-fb', box).textContent = 'Refaci „' + SLOTS[k][0] + '”: mută vizorul și fotografiază din nou.'; save(); });
      });
      $$('.vz-slot input', box).forEach(function (inp, k) {
        inp.value = st.t[k] || '';
        inp.addEventListener('input', function () { st.t[k] = inp.value; syncText(); });
      });
      var onResize = function () { fitStage(); place(); };
      window.addEventListener('resize', onResize);
      EX.vizor._off = function () { window.removeEventListener('resize', onResize); };
      setPhoto(st.p); slots();
    },
    leave: function () { if (EX.vizor._off) { EX.vizor._off(); EX.vizor._off = null; } }
  };

  // =============================================================================================
  // Pancarte 1.8 · pancarta ta: mesaj, pânză, litere decupate; descarci un PNG
  // =============================================================================================
  var CANVAS = [['Albă', '#FFFFFF'], ['Crudă', '#EDE6D6'], ['Neagră', '#231F20'], ['Roșie', '#D7141C']];
  var LETTERS = [['Negre', '#231F20'], ['Roșii', '#E3141C'], ['Albe', '#FFFFFF'], ['Gri', '#656263']];
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function readable(pi, li) { return contrast(CANVAS[pi][1], LETTERS[li][1]) >= 3; }
  function rnd(seed, k) { var x = Math.sin(seed * 99.13 + k * 12.9898) * 43758.5453; return x - Math.floor(x); }
  function upper(t) { try { return String(t || '').toLocaleUpperCase('ro'); } catch (e) { return String(t || '').toUpperCase(); } }
  function placardHtml(msg, pi, li, seed, emptyTxt) {
    var t = upper(msg).trim(), n = 0;
    if (!t) { return '<span class="pc-empty" style="color:' + LETTERS[li][1] + '">' + esc(emptyTxt || 'Scrie mesajul tău') + '</span>'; }
    return Array.prototype.map.call(t, function (ch) {
      if (/\s/.test(ch)) { return '<span class="pc-sp"></span>'; }
      n += 1;
      var r = (rnd(seed, n) - 0.5) * 12, dy = (rnd(seed, n + 50) - 0.5) * 0.1, sc = 0.94 + rnd(seed, n + 90) * 0.12;
      return '<span class="pc-l" style="--r:' + r.toFixed(1) + 'deg;--dy:' + dy.toFixed(3) + 'em;--s:' + sc.toFixed(3) + '">' + esc(ch) + '</span>';
    }).join('');
  }
  function sizeBanner(el, msg) {
    var t = upper(msg).trim(), w = el.clientWidth || 1728, h = w / 5, units = 0;
    Array.prototype.forEach.call(t || 'Scrie mesajul tău', function (ch) { units += /\s/.test(ch) ? 0.34 : (/[MWȘ]/.test(ch) ? 0.86 : /[I1]/.test(ch) ? 0.34 : 0.68); });
    var fs = t ? Math.min(h * 0.62, (w * 0.9) / Math.max(units, 1)) : h * 0.16;
    el.style.fontSize = fs.toFixed(1) + 'px';
  }
  function paintBanner(el, msg, pi, li, seed, emptyTxt) {
    el.style.background = CANVAS[pi][1]; el.style.color = LETTERS[li][1];
    el.innerHTML = placardHtml(msg, pi, li, seed, emptyTxt);
    sizeBanner(el, msg);
    var t = upper(msg).trim();
    el.setAttribute('aria-label', t ? 'Pancarta: „' + t + '”, litere ' + LETTERS[li][0].toLowerCase() + ' pe pânză ' + CANVAS[pi][0].toLowerCase() + '.' : 'Pancarta e încă goală.');
  }
  EX.placard = paintBanner;
  EX.pancarta = {
    render: function (root, s) {
      var box = $('.pancarta', root);
      if (!box) { return; }
      var cm = s.cm || {};
      function sw(name, arr, v) {
        return arr.map(function (c, k) {
          return '<label><input type="radio" name="' + name + '" value="' + k + '" data-num="' + v + '"><span style="--c:' + c[1] + '">' + esc(c[0]) + '</span></label>';
        }).join('');
      }
      box.innerHTML = '<h1 class="h1">' + esc(s.title) + '</h1><div class="pc">' +
        '<div class="pc-view" data-cue="0"><div class="pc-banner" role="img"></div><p class="pc-cap">Schiță la scară: pancarta din atelier are 4 × 0,8 m. Literele se decupează și se lipesc pe pânză.</p></div>' +
        '<div class="pc-form"><div data-cue="' + (cm[1] || 0) + '"><p class="pc-was">Răspunsul tău de la început: <span data-show="tRaspuns" data-empty="(încă nu ai scris)"></span></p>' +
        '<label class="field"><span class="field-lbl">Mesajul pancartei</span><input type="text" data-var="tMesaj" maxlength="28" placeholder="cel mult 3–4 cuvinte" autocomplete="off"><span class="count" aria-hidden="true"></span></label></div>' +
        '<div data-cue="' + (cm[2] || 0) + '"><fieldset class="pc-opts"><legend>Pânza</legend><div class="pc-sw">' + sw('pcP', CANVAS, 'nPanza') + '</div></fieldset>' +
        '<fieldset class="pc-opts"><legend>Literele</legend><div class="pc-sw">' + sw('pcL', LETTERS, 'nLitere') + '</div></fieldset></div>' +
        '<div class="pc-act" data-cue="' + (cm[2] || 0) + '"><button class="btn btn--small" id="pcMix">' + icon('replay') + 'Amestecă literele</button>' +
        '<button class="btn btn--primary btn--small" id="pcPng">' + icon('download') + 'Descarcă pancarta (PNG)</button>' +
        '<p class="note" data-cue="' + (cm[3] || 0) + '">O poți folosi ca schiță în atelier.</p></div></div></div>';
    },
    init: function (root) {
      var box = $('.pancarta', root);
      if (!box) { return; }
      var st = exState('pancarta', { seed: 3 }), V = P().V, el = $('.pc-banner', box);
      function fixColors() {
        // literele care nu se văd pe pânza aleasă nu se pot alege (contrast sub 3:1)
        $$('input[name=pcL]', box).forEach(function (r) {
          var ok = readable(Number(V.nPanza) || 0, Number(r.value));
          r.disabled = !ok;
          r.parentNode.title = ok ? '' : 'Nu se vede pe pânza aleasă';
        });
        if (!readable(Number(V.nPanza) || 0, Number(V.nLitere) || 0)) {
          var k = [0, 1, 2, 3].filter(function (x) { return readable(Number(V.nPanza) || 0, x); })[0];
          P().setVar('nLitere', k);
          $$('input[name=pcL]', box).forEach(function (r) { r.checked = Number(r.value) === k; });
        }
      }
      function draw() { paintBanner(el, V.tMesaj, Number(V.nPanza) || 0, Number(V.nLitere) || 0, st.seed); }
      $$('input[name=pcP], input[name=pcL]', box).forEach(function (r) {
        r.addEventListener('change', function () { setTimeout(function () { fixColors(); draw(); }, 0); });
      });
      $('[data-var=tMesaj]', box).addEventListener('input', draw);
      $('#pcMix', box).addEventListener('click', function () { st.seed = Math.floor(Math.random() * 900) + 1; save(); draw(); });
      $('#pcPng', box).addEventListener('click', function () { png(V.tMesaj, Number(V.nPanza) || 0, Number(V.nLitere) || 0, st.seed); });
      var onResize = function () { sizeBanner(el, V.tMesaj); };
      window.addEventListener('resize', onResize);
      EX.pancarta._off = function () { window.removeEventListener('resize', onResize); };
      fixColors(); draw();
    },
    leave: function () { if (EX.pancarta._off) { EX.pancarta._off(); EX.pancarta._off = null; } }
  };
  function png(msg, pi, li, seed) {
    var t = upper(msg).trim();
    if (!t) { P().banner('Scrie întâi mesajul pancartei.'); return; }
    var W = 2400, H = 480, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var go = function () {
      ctx.fillStyle = CANVAS[pi][1]; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.035; ctx.fillStyle = '#000';
      for (var y = 0; y < H; y += 5) { ctx.fillRect(0, y, W, 2); }
      for (var x = 0; x < W; x += 6) { ctx.fillRect(x, 0, 2, H); }
      ctx.globalAlpha = 1;
      var fs = H * 0.62, chars = Array.prototype.slice.call(t), font = function (s) { return '700 ' + s + 'px "IBM Plex Sans", Arial, sans-serif'; };
      ctx.font = font(fs);
      var gap = fs * 0.34, wOf = function (ch) { return /\s/.test(ch) ? gap : ctx.measureText(ch).width; };
      var total = chars.reduce(function (a, ch) { return a + wOf(ch); }, 0);
      if (total > W * 0.9) { fs = fs * (W * 0.9) / total; ctx.font = font(fs); gap = fs * 0.34; total = chars.reduce(function (a, ch) { return a + wOf(ch); }, 0); }
      var cx = (W - total) / 2, n = 0;
      ctx.textBaseline = 'middle'; ctx.fillStyle = LETTERS[li][1];
      chars.forEach(function (ch) {
        var w = wOf(ch);
        if (!/\s/.test(ch)) {
          n += 1;
          var r = (rnd(seed, n) - 0.5) * 12 * Math.PI / 180, dy = (rnd(seed, n + 50) - 0.5) * 0.1 * fs, sc = 0.94 + rnd(seed, n + 90) * 0.12;
          ctx.save(); ctx.translate(cx + w / 2, H / 2 + dy); ctx.rotate(r); ctx.scale(sc, sc);
          ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowOffsetX = fs * 0.02; ctx.shadowOffsetY = fs * 0.035; ctx.shadowBlur = 0;
          ctx.textAlign = 'center'; ctx.fillText(ch, 0, fs * 0.04); ctx.restore();
        }
        cx += w;
      });
      var name = 'pancarta_' + t.toLowerCase().replace(/[^a-z0-9ăâîșțşţ]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) + '.png';
      if (cv.toBlob) { cv.toBlob(function (b) { if (b && download(name, b)) { P().toast('Pancarta e descărcată'); } }, 'image/png'); }
    };
    if (document.fonts && document.fonts.load) { document.fonts.load('700 100px "IBM Plex Sans"', t).then(go, go); } else { go(); }
  }

  // =============================================================================================
  // Fotografie 1.11 · fișa fotografiei: descărcare .doc și printare
  // =============================================================================================
  function fisaHtml() {
    var V = P().V, CFG = window.AT_CONFIG;
    var row = function (k, v) { return '<tr><th>' + esc(k) + '</th><td>' + (esc(v || '').replace(/\n/g, '<br>') || '&nbsp;') + '</td></tr>'; };
    return '<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><title>Fișa fotografiei</title><style>' +
      'body{font-family:Arial,sans-serif;color:#231F20;margin:32px}h1{font-size:22pt;margin:0 0 4px}p.s{color:#4F4C4D;margin:0 0 18px}' +
      'table{border-collapse:collapse;width:100%}th,td{border:1px solid #9C999A;padding:10px 12px;text-align:left;vertical-align:top;font-size:12pt}th{width:28%;background:#E9EAEB}' +
      '.box{margin-top:18px;border:2px dashed #9C999A;height:240px;display:flex;align-items:center;justify-content:center;color:#656263}</style></head><body>' +
      '<h1>Fișa fotografiei · 1 din 36</h1><p class="s">' + esc(CFG.kicker + ' · ' + CFG.title) + '</p><table>' +
      row('Titlu (cel mult 5 cuvinte)', V.tFisa_Titlu) + row('Loc', V.tFisa_Loc) + row('De ce ai apăsat? (cel mult 30 de cuvinte)', V.tFisa_DeCe) +
      row('Ce nu se vede? (cel mult 20 de cuvinte)', V.tFisa_Nevazut) + '</table><div class="box">Lipește aici printul fotografiei.</div></body></html>';
  }
  EX.fisa = {
    init: function (root) {
      var b1 = $('[data-x=doc]', root), b2 = $('[data-x=print]', root);
      if (b1) { b1.addEventListener('click', function () { if (download('Fisa_fotografiei.doc', new Blob(['\uFEFF' + fisaHtml()], { type: 'application/msword' }))) { P().toast('Fișa e descărcată'); } }); }
      if (b2) {
        b2.addEventListener('click', function () {
          if (window.AT_CONFIG.preview) { P().banner('În previzualizare nu se poate printa. În cursul publicat, butonul deschide fișa pentru printare.'); return; }
          var w = null;
          try { w = window.open('', '_blank'); } catch (e) { w = null; }
          if (!w) { P().banner('Browserul a blocat fereastra de printare. Descarcă fișa (.doc) și printeaz-o de acolo.'); return; }
          w.document.open(); w.document.write(fisaHtml()); w.document.close();
          setTimeout(function () { try { w.focus(); w.print(); } catch (e) { /* ignoră */ } }, 300);
        });
      }
    }
  };

  // =============================================================================================
  // Ecranele de final: detaliile din vizor (Film) și pancarta (Pancarte)
  // =============================================================================================
  EX.final = {
    init: function (root) {
      var d = $('[data-details]', root), pl = $('[data-placard]', root), S = P().S, V = P().V;
      if (d) {
        var vz = S.ex.vizor, has = vz && vz.slots && vz.slots.some(function (x) { return x; });
        d.innerHTML = has ? vz.slots.map(function (c, k) {
          if (!c) { return ''; }
          return '<figure class="final-detail"><div class="vz-crop" role="img" aria-label="Detaliul tău pentru ' + esc(SLOTS[k][0]) + '" style="' + cropStyle(c) + '"></div>' +
            '<figcaption><b>' + esc(SLOTS[k][0]) + '</b> ' + esc((vz.t && vz.t[k]) || '') + '</figcaption></figure>';
        }).join('') : '<p class="final-empty">Detaliile pe care le fotografiezi cu vizorul (ecranul 1.5) apar aici.</p>';
      }
      if (pl) {
        pl.innerHTML = '<div class="pc-banner" role="img"></div>';
        var st = S.ex.pancarta || { seed: 3 }, el = $('.pc-banner', pl);
        paintBanner(el, V.tMesaj, Number(V.nPanza) || 0, Number(V.nLitere) || 0, st.seed, 'Mesajul tău de pe pancartă apare aici (ecranul 1.8).');
      }
    }
  };
})();
