/*
 * scorm_api.js - minimal SCORM 2004 (3rd Edition) runtime wrapper for the HTML course player.
 *
 * What it does
 *   1. Finds the LMS API object (API_1484_11) in the parent frames or the opener window.
 *   2. Initialize -> GetValue / SetValue / Commit -> Terminate, with error checks.
 *   3. Writes cmi.session_time and cmi.exit when the session ends.
 *   4. If no LMS is found (SharePoint, a local web server, a preview link), every call is
 *      logged and nothing is sent, so the course still runs.
 *
 * Exposes window.SCORM:
 *   init(logger) -> true when an LMS session is open
 *   get(element) -> string ('' when empty or not connected)
 *   set(element, value) -> true when the LMS accepted the value
 *   commit()     -> asks the LMS to store what was sent
 *   finish(exitMode) -> 'suspend' keeps the attempt open for resume, 'normal' closes it
 */
(function (global) {
  'use strict';

  var api = null;            // LMS API object, if found
  var active = false;        // true between Initialize and Terminate
  var started = null;        // session start, for cmi.session_time
  var log = function () {};  // logger supplied by the player: log(call, argument, result)

  // ADL search algorithm: walk up the parent frames (then the opener chain) until API_1484_11 is found
  function scan(win) {
    var hops = 0;
    try {
      while (win && !win.API_1484_11 && win.parent && win.parent !== win && hops < 10) {
        hops += 1;
        win = win.parent;
      }
      return (win && win.API_1484_11) || null;
    } catch (e) {
      return null; // a frame from another domain blocks the search
    }
  }

  function findAPI() {
    var found = scan(global);
    try { if (!found && global.opener) { found = scan(global.opener); } } catch (e) { /* no access */ }
    try { if (!found && global.top && global.top.opener) { found = scan(global.top.opener); } } catch (e) { /* no access */ }
    return found;
  }

  function errorText() {
    var code = String(api.GetLastError());
    if (code === '0' || code === '') { return ''; }
    return code + ' ' + api.GetErrorString(code);
  }

  // ISO 8601 duration, the format SCORM 2004 expects for cmi.session_time (for example PT0H12M5S)
  function duration(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return 'PT' + Math.floor(s / 3600) + 'H' + Math.floor((s % 3600) / 60) + 'M' + (s % 60) + 'S';
  }

  // Shorten long values (suspend data) for the tracking log only
  function short(v) {
    v = String(v);
    return v.length > 140 ? v.slice(0, 137) + '...' : v;
  }

  var SCORM = {
    connected: false,

    init: function (logger) {
      if (typeof logger === 'function') { log = logger; }
      started = new Date();
      api = findAPI();
      if (!api) {
        log('Initialize', '', 'no LMS found: preview mode, nothing is recorded');
        return false;
      }
      active = String(api.Initialize('')) === 'true';
      SCORM.connected = active;
      log('Initialize', '', active ? 'true' : 'false ' + errorText());
      return active;
    },

    get: function (element) {
      if (!active) { return ''; }
      var value = String(api.GetValue(element));
      var err = errorText();
      if (err) {
        // 403 = "value not initialized": normal on a first launch
        log('GetValue', element, err.indexOf('403') === 0 ? '(empty)' : 'error ' + err);
        return '';
      }
      log('GetValue', element, value === '' ? '(empty)' : '"' + short(value) + '"');
      return value;
    },

    set: function (element, value) {
      value = String(value);
      if (!active) {
        log('SetValue', element + ' = "' + short(value) + '"',
          SCORM.connected ? 'not sent: session closed' : 'not sent (preview)');
        return false;
      }
      var ok = String(api.SetValue(element, value)) === 'true';
      log('SetValue', element + ' = "' + short(value) + '"', ok ? 'true' : 'false ' + errorText());
      return ok;
    },

    commit: function () {
      if (!active) { return false; }
      var ok = String(api.Commit('')) === 'true';
      log('Commit', '', ok ? 'true' : 'false ' + errorText());
      return ok;
    },

    finish: function (exitMode) {
      if (!active) {
        log('Terminate', '', SCORM.connected ? 'already closed' : 'not sent (preview)');
        return false;
      }
      SCORM.set('cmi.session_time', duration(new Date() - started));
      SCORM.set('cmi.exit', exitMode || 'suspend');
      SCORM.commit();
      var ok = String(api.Terminate('')) === 'true';
      log('Terminate', '', ok ? 'true' : 'false ' + errorText());
      active = false;
      return ok;
    }
  };

  global.SCORM = SCORM;
})(window);
