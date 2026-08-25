/* ============================================================
   office-live.js - "The hour back"
   learn-ai-office-with-phoebe

   Two modes over the same levers:
     TASK  - one weekly report. The number behaves like a lab
             experiment, because a lab measures one task.
     WEEK  - the same levers across a real 40-hour week, where
             most of the week is not assistable and you do not
             reach for the tool every day.

   The gap between the two IS the lesson. Every reference number
   on the readout is sourced in materials/official-course-map.md.
   ============================================================ */
(function () {
  "use strict";

  var WEEK_MIN = 2400;        /* a 40-hour week */
  var ASSISTABLE = 340;       /* minutes in that week this can actually touch */
  var TASK_BASE = 185;        /* the weekly report, start to sent */
  var BASE_SPEEDUP = 0.08;    /* opening the tool and typing a bare ask */

  var LEVERS = [
    { id: "context", w: 0.11, session: 1,
      name: "Attach the data and name who it is for",
      why: "A bare ask makes it guess your audience and invent your context. Attaching last month and naming the reader is the single biggest lever here." },
    { id: "scope", w: 0.07, session: 2,
      name: "Ask for a slice, not the whole document",
      why: "Microsoft: large language models “tend to prioritize content that is at the beginning and end of a file”, so the middle of a long document gets less attention. Ask section by section." },
    { id: "formula", w: 0.05, session: 3,
      name: "Make it show its working",
      why: "Ask for the formula or the source line, not just the answer. You cannot defend a number whose derivation you never saw." },
    { id: "verify", w: 0.03, session: 5,
      name: "Check the figures before it goes out",
      why: "Costs minutes, saves more. The documented failure mode is omission rather than fabrication, and omissions are invisible unless you look." },
    { id: "saved", w: 0.06, session: 6, locked: true,
      name: "A saved prompt you reuse, not one you rewrite",
      why: "Rewriting the ask every week is most of the overhead. This is the lever that turns a trick into a habit, and habit is what the week-level numbers are actually measuring." }
  ];

  var TRAPS = [
    { id: "trust", w: -0.09, kind: "cost",
      name: "Skip the check and send it straight out",
      why: "The rework costs more than the check did. Microsoft's own wording: Copilot “cannot understand meaning or evaluate accuracy”." },
    { id: "meetings", w: 0, kind: "null",
      name: "Expect it to give you fewer meetings",
      why: "It will not, and this is measured. In Microsoft's own randomized trial of over 6,000 workers, total meeting duration moved +2.38 minutes per week and was NOT statistically significant. In its telemetry study, more organizations saw meetings go up than down." }
  ];

  var state = {};
  LEVERS.forEach(function (l) { state[l.id] = false; });
  TRAPS.forEach(function (t) { state[t.id] = false; });
  var days = 2;               /* days per week you actually reach for it */
  var unlocked = false;
  var mode = "task";

  function lockedAvailable() {
    if (unlocked) return true;
    try { return (window.LWP_PASSPORT && window.LWP_PASSPORT.count() >= 4); }
    catch (e) { return false; }
  }

  function speedup() {
    var s = BASE_SPEEDUP;
    LEVERS.forEach(function (l) {
      if (!state[l.id]) return;
      if (l.locked && !lockedAvailable()) return;
      s += l.w;
    });
    TRAPS.forEach(function (t) { if (state[t.id]) s += t.w; });
    return Math.max(0, Math.min(0.95, s));
  }
  function taskMinutes() { return Math.round(TASK_BASE * (1 - speedup())); }
  function weeklySaved() { return ASSISTABLE * speedup() * (days / 5); }
  function pctOfHours() { return (weeklySaved() / WEEK_MIN) * 100; }

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function mount(root) {
    var tabs = el("div", "ol-tabs");
    var tTask = el("button", "ol-tab on", "One task");
    var tWeek = el("button", "ol-tab", "Your whole week");
    tabs.appendChild(tTask); tabs.appendChild(tWeek);
    root.appendChild(tabs);

    var read = el("div", "ol-readout");
    var big = el("output", "ol-big", "170");
    var unit = el("span", "ol-unit", "");
    var cap = el("span", "ol-cap", "");
    read.appendChild(big); read.appendChild(unit); read.appendChild(cap);
    root.appendChild(read);

    var band = el("div", "ol-band");
    root.appendChild(band);

    var dial = el("div", "ol-dial");
    var dl = el("label", "ol-dlabel", "Days a week you actually reach for it");
    var slider = document.createElement("input");
    slider.type = "range"; slider.min = "1"; slider.max = "5"; slider.step = "1"; slider.value = String(days);
    slider.className = "ol-range";
    slider.setAttribute("aria-label", "Days per week you use it");
    var dval = el("b", "ol-dval", days + " of 5");
    dial.appendChild(dl); dial.appendChild(slider); dial.appendChild(dval);
    root.appendChild(dial);

    var panel = el("div", "ol-panel");
    var ph = el("div", "ol-phead");
    ph.appendChild(el("b", null, "What you actually do"));
    ph.appendChild(el("span", "ol-pnote", "each one is a habit, not a setting"));
    panel.appendChild(ph);

    LEVERS.concat(TRAPS).forEach(function (l) {
      var isTrap = TRAPS.indexOf(l) !== -1;
      var row = el("label", "ol-lever" + (isTrap ? " trap" : ""));
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.dataset.id = l.id;
      row.appendChild(cb);
      var mid = el("div", "ol-lmid");
      mid.appendChild(el("b", null, l.name));
      mid.appendChild(el("span", "ol-why", l.why));
      row.appendChild(mid);
      var chip = el("span", "ol-w", l.kind === "null" ? "0 pts"
        : (l.w > 0 ? "+" : "") + Math.round(l.w * 100) + " pts");
      row.appendChild(chip);
      if (l.session) row.appendChild(el("span", "ol-sess", "session " + l.session));
      if (l.kind === "null") row.appendChild(el("span", "ol-nullchip", "measured at zero"));
      if (l.locked) {
        row.classList.add("locked");
        var lk = el("span", "ol-lock", "🔒 unlocks at 4 passport stamps");
        var by = el("button", "ol-bypass", "unlock now");
        by.addEventListener("click", function (e) {
          e.preventDefault(); e.stopPropagation();
          unlocked = true; row.classList.remove("locked");
          lk.remove(); by.remove(); paint();
        });
        row.appendChild(lk); row.appendChild(by);
      }
      cb.addEventListener("change", function () {
        if (l.locked && !lockedAvailable()) { cb.checked = false; return; }
        state[l.id] = cb.checked;
        row.classList.toggle("on", cb.checked);
        paint();
      });
      panel.appendChild(row);
    });

    var acts = el("div", "ol-acts");
    var allOn = el("button", "ol-btn", "Do everything right");
    var reset = el("button", "ol-btn ghost", "Back to typing a bare ask");
    acts.appendChild(allOn); acts.appendChild(reset);
    panel.appendChild(acts);
    root.appendChild(panel);

    var rail = el("p", "ol-rail");
    root.appendChild(rail);

    function sync() {
      panel.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
        cb.checked = !!state[cb.dataset.id];
        cb.closest(".ol-lever").classList.toggle("on", cb.checked);
      });
    }
    allOn.addEventListener("click", function () {
      LEVERS.forEach(function (l) { if (!(l.locked && !lockedAvailable())) state[l.id] = true; });
      TRAPS.forEach(function (t) { state[t.id] = false; });
      sync(); paint();
    });
    reset.addEventListener("click", function () {
      LEVERS.concat(TRAPS).forEach(function (l) { state[l.id] = false; });
      sync(); paint();
    });
    slider.addEventListener("input", function () {
      days = parseInt(slider.value, 10);
      dval.textContent = days + " of 5";
      paint();
    });
    tTask.addEventListener("click", function () {
      mode = "task"; tTask.classList.add("on"); tWeek.classList.remove("on");
      dial.style.opacity = ".45"; slider.disabled = true; paint();
    });
    tWeek.addEventListener("click", function () {
      mode = "week"; tWeek.classList.add("on"); tTask.classList.remove("on");
      dial.style.opacity = "1"; slider.disabled = false; paint();
    });

    function bar(label, val, max, cls, note) {
      var row = el("div", "ol-brow");
      row.appendChild(el("span", "ol-blab", label));
      var track = el("span", "ol-btrack");
      var fill = el("span", "ol-bfill " + cls);
      fill.style.width = Math.max(1, Math.min(100, (val / max) * 100)) + "%";
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el("b", "ol-bval", val.toFixed(1) + "%"));
      if (note) row.appendChild(el("span", "ol-bnote", note));
      return row;
    }

    function paint() {
      var sp = speedup();
      band.textContent = "";
      if (mode === "task") {
        var tm = taskMinutes();
        big.textContent = String(tm);
        unit.textContent = "min";
        big.className = "ol-big " + (sp >= 0.3 ? "hi" : sp >= 0.15 ? "mid" : "lo");
        cap.textContent = "to produce the weekly report, down from " + TASK_BASE +
          ". That is " + Math.round(sp * 100) + " percent faster on this one task.";
        band.appendChild(el("p", "ol-bhead", "Where that sits against the published single-task experiments"));
        band.appendChild(bar("You, on this task", sp * 100, 45, "you", ""));
        band.appendChild(bar("BCG consultants, 758 people", 25.1, 45, "ref", "tasks completed 25.1% faster"));
        band.appendChild(bar("Support agents, 5,172 people", 15.0, 45, "ref", "+15% issues resolved per hour"));
        rail.innerHTML = "<b>This is the number people quote.</b> It is real, and it is measured on " +
          "one task that the tool happens to be good at. Now switch to <em>Your whole week</em>, " +
          "which is the number that actually shows up in your life.";
      } else {
        var saved = weeklySaved(), pct = pctOfHours();
        big.textContent = String(Math.round(saved));
        unit.textContent = "min / week";
        big.className = "ol-big " + (pct >= 4 ? "hi" : pct >= 2 ? "mid" : "lo");
        cap.textContent = "saved across a 40-hour week, which is " + pct.toFixed(1) +
          " percent of your working hours. Only " + ASSISTABLE +
          " minutes of that week are work this can touch at all.";
        band.appendChild(el("p", "ol-bhead", "Where that sits against the measured-workweek studies"));
        band.appendChild(bar("You, this week", pct, 8, "you", ""));
        band.appendChild(bar("US survey, among users", 5.4, 8, "ref", "2.2 hours per week"));
        band.appendChild(bar("US survey, all workers", 1.4, 8, "ref", "including non-users"));
        var m = el("p", "ol-mrail");
        m.innerHTML = "Microsoft's own randomized trial, 56 firms and over 6,000 workers: " +
          "<b>email reading fell 12.3 minutes per week</b> across everyone given a licence, and " +
          "31.2 minutes among those who used it regularly. Nearly 40 percent of people given a " +
          "licence used it regularly at all.";
        band.appendChild(m);
        rail.innerHTML = "<b>The gap is dilution, not deception.</b> Drag the days dial. " +
          "Nothing about the tool changed between these two numbers - only how much of your " +
          "week it touches, and how often you reach for it.";
      }
      if (state.meetings) {
        var n = el("p", "ol-null");
        n.innerHTML = "⚠ You switched on <b>expect fewer meetings</b> and the number did not move, " +
          "because that is what the research found. Microsoft's randomized trial measured meeting " +
          "time at <b>+2.38 minutes per week, not statistically significant</b>. In its telemetry " +
          "study of 47 organizations, 10 saw meetings fall and <b>14 saw meetings rise</b>.";
        band.appendChild(n);
      }
      if (state.trust) {
        var t = el("p", "ol-trap");
        t.innerHTML = "⚠ Skipping the check is costing you " + Math.abs(Math.round(0.09 * 100)) +
          " points of speedup, not saving them. Rework is slower than review, and the failure you " +
          "are rushing past is usually an <b>omission</b> rather than an obvious error.";
        band.appendChild(t);
      }
    }

    dial.style.opacity = ".45"; slider.disabled = true;
    paint();

    window.OFFICE_LIVE = {
      state: state, speedup: speedup, taskMinutes: taskMinutes,
      weeklySaved: weeklySaved, pctOfHours: pctOfHours,
      setDays: function (d) { days = d; slider.value = String(d); dval.textContent = d + " of 5"; paint(); },
      set: function (id, v) { state[id] = v; sync(); paint(); },
      setAll: function (v) {
        LEVERS.forEach(function (l) { state[l.id] = v; });
        TRAPS.forEach(function (t) { state[t.id] = false; });
        sync(); paint();
      },
      setMode: function (m) { (m === "week" ? tWeek : tTask).click(); },
      unlock: function () { unlocked = true; paint(); },
      levers: LEVERS, traps: TRAPS, constants: {WEEK_MIN: WEEK_MIN, ASSISTABLE: ASSISTABLE, TASK_BASE: TASK_BASE}
    };
  }

  var host = document.getElementById("office-live");
  if (host) mount(host);
})();
