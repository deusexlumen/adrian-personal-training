// No storage, no cookies, no third-party requests — keeps the site banner-free.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Footer year
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  // Header shadow once scrolled
  var header = document.querySelector("[data-header]");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile navigation
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");
  function setNav(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    nav.classList.toggle("is-open", open);
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setNav(false);
        toggle.focus();
      }
    });
  }

  // Hero headline gains mass: lock each line at its final (black) break, grow the lines from thin
  // to black, strike "Schema F" (CSS), then unwrap the lines so the headline reflows normally again
  var bulkTitle = document.querySelector("[data-bulk]");
  if (bulkTitle) {
    var runBulk = function () {
      if (reduceMotion) {
        bulkTitle.classList.add("is-ready");
        return;
      }
      var units = [];
      Array.prototype.slice.call(bulkTitle.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) {
          units.push(node);
          return;
        }
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            units.push(document.createTextNode(part));
            return;
          }
          var word = document.createElement("span");
          word.textContent = part;
          units.push(word);
        });
      });
      bulkTitle.textContent = "";
      units.forEach(function (u) { bulkTitle.appendChild(u); });

      var lines = [];
      var lastTop = null;
      units.forEach(function (u) {
        if (u.nodeType === 3) {
          if (lines.length) lines[lines.length - 1].push(u);
          return;
        }
        if (u.offsetTop !== lastTop) {
          lines.push([]);
          lastTop = u.offsetTop;
        }
        lines[lines.length - 1].push(u);
      });
      bulkTitle.textContent = "";
      var lineEls = lines.map(function (line, i) {
        var el = document.createElement("span");
        el.className = "hero__line";
        el.style.animationDelay = i * 90 + "ms";
        line.forEach(function (u) { el.appendChild(u); });
        bulkTitle.appendChild(el);
        return el;
      });
      bulkTitle.classList.add("is-ready", "is-bulking");

      // After the strike (1150 + 450 ms in CSS): moved nodes would restart their animation, so drop it first
      setTimeout(function () {
        bulkTitle.classList.remove("is-bulking");
        lineEls.forEach(function (el) {
          while (el.firstChild) bulkTitle.insertBefore(el.firstChild, el);
          el.remove();
        });
      }, 1700);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(runBulk);
    else runBulk();
  }

  // Mobile quick-contact bar: visible once the hero is out of view
  var quickbar = document.querySelector("[data-quickbar]");
  var hero = document.querySelector(".hero");
  // Hidden while hero, quiz or contact are on screen (it would cover their own buttons)
  var contact = document.getElementById("kontakt");
  var checkSection = document.getElementById("check");
  if (quickbar && hero && "IntersectionObserver" in window) {
    var heroVisible = true;
    var contactVisible = false;
    quickbar.inert = true;
    var update = function () {
      var show = !heroVisible && !contactVisible;
      quickbar.classList.toggle("is-visible", show);
      quickbar.inert = !show;
    };
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      update();
    }).observe(hero);
    var blockers = [contact, checkSection].filter(Boolean);
    var blockerState = blockers.map(function () { return false; });
    blockers.forEach(function (el, i) {
      new IntersectionObserver(function (entries) {
        blockerState[i] = entries[0].isIntersecting;
        contactVisible = blockerState.some(Boolean);
        update();
      }).observe(el);
    });
  }

  // ---------- Method as a pinned sequence (GSAP, self-hosted) ----------
  // Pins below the header; the four steps play one after another, each number gains weight,
  // the progress line fills. Without GSAP or with reduced motion the static grid stays.
  var stage = document.querySelector("[data-method-stage]");
  if (stage && window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    var list = stage.querySelector(".method");
    var steps = gsap.utils.toArray(list.children);
    var nums = steps.map(function (li) { return li.querySelector(".method__num"); });
    list.removeAttribute("data-scroll"); // the pin drives --p here, not the generic loop below
    list.style.setProperty("--p", "0");
    stage.classList.add("is-staged");
    list.classList.add("method--staged");
    // Opacity only (no visibility), so screen readers still reach every step
    gsap.set(steps.slice(1), { opacity: 0, y: 32 });
    gsap.set(nums, { fontWeight: 200 });

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: stage,
        start: function () { return "top " + (header ? header.offsetHeight : 0) + "px"; },
        end: "+=" + steps.length * 45 + "%",
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) { list.style.setProperty("--p", self.progress.toFixed(3)); }
      }
    });
    steps.forEach(function (li, i) {
      if (i > 0) tl.to(li, { opacity: 1, y: 0, duration: 0.3 }, i);
      tl.to(nums[i], { fontWeight: 900, duration: 0.5 }, i + (i > 0 ? 0.1 : 0));
      if (i < steps.length - 1) tl.to(li, { opacity: 0, y: -32, duration: 0.3 }, i + 0.75);
    });
    tl.to({}, { duration: 0.3 }); // hold the last step before the pin releases
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  // ---------- Scroll-driven effects ----------
  // [data-scroll] elements get --p (0..1). Photos: progress through the whole viewport (parallax).
  // Everything else: progress while entering (strike, progress line, sliding words).
  var scrollEls = Array.prototype.slice.call(document.querySelectorAll("[data-scroll]"));

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function updateScroll() {
    var vh = window.innerHeight;
    scrollEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var p = el.classList.contains("photo")
        ? clamp01((vh - r.top) / (vh + r.height))
        : clamp01((vh * 0.95 - r.top) / (vh * 0.45));
      el.style.setProperty("--p", p.toFixed(3));
    });
  }

  if (!reduceMotion) {
    var scrollTicking = false;
    var requestScroll = function () {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(function () {
        updateScroll();
        scrollTicking = false;
      });
    };
    window.addEventListener("scroll", requestScroll, { passive: true });
    window.addEventListener("resize", requestScroll);
    updateScroll();
  }

  // ---------- Trainings-Check (client-side only, nothing stored or sent automatically) ----------
  var quiz = document.querySelector("[data-quiz]");
  if (quiz) {
    var FIELDS = ["ziel", "erfahrung", "beschwerden", "zeit", "ort"];
    var countEl = quiz.querySelector("[data-quiz-count]");
    var resultEl = quiz.querySelector("[data-quiz-result]");
    var stepsEl = quiz.querySelector("[data-quiz-steps]");
    var noteEl = quiz.querySelector("[data-quiz-note]");
    var sendEl = quiz.querySelector("[data-quiz-send]");
    var showEl = quiz.querySelector("[data-quiz-show]");
    showEl.hidden = false;
    var goalEl = quiz.querySelector("[data-quiz-goal]");
    var goalEditEl = quiz.querySelector("[data-quiz-goal-edit]");
    var nextEl = document.querySelector("[data-quiz-next]");
    var q2 = quiz.querySelector("[data-quiz-q2]");
    var missingEl = quiz.querySelector("[data-quiz-missing]");
    // Same number as in index.html (3×)
    var WHATSAPP = "4915568820575";

    var ZIEL = {
      "Gewichtsabnahme": "Training und Ernährung als ein Plan – so, dass du ihn im Alltag durchhältst.",
      "Straffung": "Gezieltes Krafttraining kann ein Einstieg sein; die Übungsauswahl wird persönlich besprochen.",
      "Muskelaufbau": "Strukturierter Aufbau mit messbaren Fortschritten statt planlosem Training.",
      "Athletik": "Kraft und Belastbarkeit für deinen Sport als mögliches Trainingsziel."
    };
    var ERFAHRUNG = {
      "Einsteiger": "Für den Einstieg bieten sich das Erlernen der Technik und eine schrittweise Steigerung an.",
      "Wiedereinsteiger": "Nach einer Pause kann ein schrittweiser Wiedereinstieg sinnvoll sein; die Belastung wird persönlich besprochen.",
      "Fortgeschritten": "Wir suchen die Stellschrauben, an denen du stagnierst: Winkel, Taktung, Ausführung."
    };
    // Result addresses the visitor; contact messages deliberately contain no answers.
    var ORT = {
      "im Studio": "im Studio",
      "outdoor": "outdoor",
      "zu Hause": "bei dir zu Hause"
    };

    var readAnswers = function () {
      var a = {};
      FIELDS.forEach(function (name) {
        // quiz.elements also covers question 1, which sits in the hero (form="quiz")
        var value = quiz.elements[name] && quiz.elements[name].value;
        if (value) a[name] = value;
      });
      return a;
    };

    var render = function () {
      var a = readAnswers();
      var n = FIELDS.filter(function (f) { return a[f]; }).length;
      countEl.textContent = String(n);
      showEl.disabled = n < FIELDS.length;
      quiz.style.setProperty("--q", String(n / FIELDS.length));
      goalEl.textContent = a.ziel || "noch offen";
      goalEditEl.textContent = a.ziel ? "ändern" : "oben wählen";
      if (nextEl) nextEl.hidden = !a.ziel;
      // Visitors who jump straight to #check never saw question 1 in the hero
      missingEl.hidden = !(n === FIELDS.length - 1 && !a.ziel);
      if (n < FIELDS.length) {
        resultEl.hidden = true;
        return;
      }
      var steps = [
        "Im Erstgespräch besprechen wir deine Ziele, Erfahrung und deinen Alltag.",
        ZIEL[a.ziel],
        ERFAHRUNG[a.erfahrung]
      ];
      steps.push("Dein Zeitwunsch: " + a.zeit + " pro Woche, " + ORT[a.ort] + ". Ob und wie das passt, klären wir im Gespräch.");

      stepsEl.innerHTML = "";
      steps.forEach(function (t) {
        var li = document.createElement("li");
        li.textContent = t;
        stepsEl.appendChild(li);
      });
      noteEl.hidden = a.beschwerden === "Keine" || a.beschwerden === "Keine Angabe";

      // Deliberately independent of every answer, including health information.
      var msg = "Hallo Adrian, ich interessiere mich für ein Erstgespräch.";
      sendEl.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);
    };

    // Continue with question 2: scroll to the form and move focus there
    var goToQ2 = function () {
      quiz.scrollIntoView({ block: "start" });
      if (q2) q2.focus({ preventScroll: true });
    };
    // Radios outside the form (hero) do not bubble their change through it, so listen on the document
    // Optional feedback, suppressed with reduced motion: a tick per pick, a double pulse on result request.
    var buzz = function (pattern) {
      if (reduceMotion || !navigator.vibrate) return;
      try { navigator.vibrate(pattern); } catch (err) { /* ignored: haptics are optional */ }
    };
    // Coach: Adrian reacts to the latest answer in his speech bubble (same pose, only the words change)
    var coach = document.querySelector("[data-coach]");
    var coachText = document.querySelector("[data-coach-text]");
    var SAYS = {
      ziel: {
        "Gewichtsabnahme": "Abnehmen. Dann gehören Training und Ernährung in einen Plan.",
        "Straffung": "Straffung als Ziel. Die Übungen besprechen wir persönlich.",
        "Muskelaufbau": "Muskelaufbau. Dann bauen wir strukturiert auf, mit messbarem Fortschritt.",
        "Athletik": "Athletik. Dann ist dein Sport der Ausgangspunkt fürs Gespräch."
      },
      erfahrung: {
        "Einsteiger": "Einsteiger ist gut. Wir fangen mit sauberer Technik an.",
        "Wiedereinsteiger": "Wiedereinstieg? Dann sprechen wir über deine Pause und Erfahrung.",
        "Fortgeschritten": "Dann suchen wir die Stellschrauben, an denen du hängst."
      },
      beschwerden: {
        "Keine": "Notiert. Als Nächstes geht es um deine Zeit.",
        "Rücken": "Der Check kann Rückenbeschwerden nicht beurteilen.",
        "Knie": "Der Check kann Kniebeschwerden nicht beurteilen.",
        "Andere": "Beschwerden lassen sich mit diesem Check nicht beurteilen.",
        "Keine Angabe": "Das bleibt offen. Weiter geht es mit deiner Zeit."
      },
      zeit: {
        "1-mal": "Einmal pro Woche. Dann muss jede Einheit sitzen.",
        "2-mal": "Zweimal pro Woche lässt sich gut planen.",
        "3-mal oder öfter": "Dreimal oder öfter. Damit können wir richtig aufbauen."
      },
      ort: {
        "im Studio": "Studio passt.",
        "outdoor": "Outdoor, gern.",
        "zu Hause": "Bei dir zu Hause. Ich komme zu dir."
      }
    };
    var coachSay = function (name, value) {
      if (!coachText) return;
      var a = readAnswers();
      var n = FIELDS.filter(function (f) { return a[f]; }).length;
      var line = (SAYS[name] && SAYS[name][value]) || "";
      if (n === FIELDS.length) line = "Alles beantwortet. Du kannst jetzt deine erste Orientierung anzeigen.";
      else if (n === FIELDS.length - 1 && !a.ziel) line = "Eins fehlt noch: dein Ziel, ganz oben.";
      if (line) coachText.textContent = line;
    };
    // Narrow screens: the coach bar shows while the form is on screen
    if (coach && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        coach.classList.toggle("is-visible", entries[0].isIntersecting);
      }, { rootMargin: "0px 0px -35% 0px" }).observe(quiz);
    }
    var startAnswers = readAnswers();
    if (startAnswers.ziel) coachSay("ziel", startAnswers.ziel);

    document.addEventListener("change", function (e) {
      if (e.target.form !== quiz) return;
      render();
      coachSay(e.target.name, e.target.value);
      buzz(12);
    });
    // Explicit continuation keeps touch and keyboard behaviour predictable.
    goalEditEl.addEventListener("click", function (e) {
      e.preventDefault();
      var goal = document.querySelector('input[name="ziel"]:checked') || document.querySelector('input[name="ziel"]');
      goal.focus();
    });
    if (nextEl) {
      nextEl.addEventListener("click", function (e) {
        e.preventDefault();
        goToQ2();
      });
    }
    quiz.addEventListener("submit", function (e) {
      e.preventDefault();
      render();
      if (showEl.disabled) return;
      resultEl.hidden = false;
      buzz([15, 60, 30]);
      resultEl.querySelector("h3").focus();
    });
    window.addEventListener("pageshow", render);
    render();
  }
})();

