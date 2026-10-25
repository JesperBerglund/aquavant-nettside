/* AquaVant – v09. No tracking. One small library: Lenis (smooth scrolling, MIT, assets/js/vendor). */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.remove("no-js");
  doc.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var lang = doc.lang === "nb" ? "nb" : "en";

  /* ---------- Smooth scrolling (Lenis) ----------
     Wheel and trackpad scrolling glide to a stop instead of stepping. The page still
     scrolls natively underneath, so scroll events, sticky sections and the observers
     below work as before. Touch scrolling is left to the phone's own momentum.
     Off for "reduce motion"; anchor links glide too and stop below the header. */
  var lenis = null;
  if (window.Lenis && !reduceMotion.matches) {
    lenis = new window.Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      autoRaf: true,
      anchors: { offset: -96 }
    });
  }

  /* ---------- Header (after inflect.co.uk) ----------
     Clear over the hero; the frosted background fades in once the section after the
     hero reaches the header (on the home page: when the blue band has slid up over
     the whale). Scrolling down slides the header up out of view; scrolling up slides
     it back. It always shows near the top of the page, while the menu is open and
     while keyboard focus is inside it. */
  var header = document.querySelector(".site-header");
  var lastY = window.scrollY;
  var headerFocus = false;
  var glassFrom = null; // scroll position where the hero ends under the header; measured lazily
  var heroEnd = function () {
    var hero = document.querySelector(".whale, .page-hero, .hero");
    if (!hero) return 24;
    var next = hero.nextElementSibling || (hero.parentElement && hero.parentElement.nextElementSibling);
    var bottom = next ? next.getBoundingClientRect().top : hero.getBoundingClientRect().bottom;
    return Math.max(24, bottom + window.scrollY - header.offsetHeight);
  };
  window.addEventListener("resize", function () { glassFrom = null; });
  window.addEventListener("load", function () { glassFrom = null; onScroll(); });
  function onScroll() {
    if (!header) return;
    var y = window.scrollY;
    if (glassFrom === null) glassFrom = heroEnd();
    header.classList.toggle("is-scrolled", y >= glassFrom);
    var dy = y - lastY;
    if (Math.abs(dy) < 6 && y > 120) return; // ignore tiny jitters, e.g. trackpad settle
    var hide = dy > 0 && y > 120 && !headerFocus && !document.body.classList.contains("menu-open");
    header.classList.toggle("is-hidden", hide);
    lastY = y;
  }
  if (header) {
    header.addEventListener("focusin", function () { headerFocus = true; header.classList.remove("is-hidden"); });
    header.addEventListener("focusout", function () { headerFocus = false; });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Buttons (after inflect.co.uk) ----------
     Adds a colour layer that wipes up on hover and a second copy of the label that
     rolls in from below. Screen readers only hear the label once. */
  function setButtonLabel(btn, text) {
    var parts = btn.querySelectorAll(".btn-text");
    if (!parts.length) { btn.textContent = text; return; }
    parts.forEach(function (p) { p.textContent = text; });
  }
  document.querySelectorAll(".btn").forEach(function (btn) {
    var text = btn.textContent.trim();
    btn.textContent = "";
    btn.insertAdjacentHTML("beforeend",
      "<span class=\"btn-wipe\" aria-hidden=\"true\"></span>" +
      "<span class=\"btn-label\"><span class=\"btn-track\">" +
      "<span class=\"btn-text\"></span><span class=\"btn-text btn-clone\" aria-hidden=\"true\"></span>" +
      "</span></span>");
    setButtonLabel(btn, text);
    btn.classList.add("btn-fx");
  });

  /* ---------- Full-screen menu (after leome-and-partners.com) ----------
     The animation is all CSS: .is-open unrolls the panel and lifts the links in.
     This part opens and closes it, keeps keyboard focus inside while it is open,
     pauses page scrolling, and hides the menu again once the close has played out. */
  // Split [data-chars] text into letters for the hover roll (the readable copy sits beside it).
  document.querySelectorAll("[data-chars]").forEach(function (el) {
    var text = el.textContent;
    el.textContent = "";
    Array.from(text).forEach(function (ch, i) {
      var c = document.createElement("span");
      c.className = "c";
      c.style.setProperty("--ci", i);
      c.textContent = ch === " " ? "\u00a0" : ch;
      el.appendChild(c);
    });
  });

  var toggle = document.querySelector(".menu-toggle");
  var menu = document.getElementById("site-menu");
  if (toggle && menu) {
    var outside = Array.prototype.slice.call(document.querySelectorAll("main, footer, .side-tab, .skip-link"));
    var menuIsOpen = false;
    var menuHideTimer = 0;
    var menuLastFocus = null;
    var CLOSE_MS = 1150; // panel 1 s plus the staggered links

    var setOutsideInert = function (on) {
      outside.forEach(function (el) { if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert"); });
    };
    var setExpanded = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", toggle.dataset[open ? "labelClose" : "labelOpen"]);
    };

    var openMenu = function (byKeyboard) {
      if (menuIsOpen) return;
      menuIsOpen = true;
      clearTimeout(menuHideTimer);
      menuLastFocus = document.activeElement;
      menu.hidden = false;
      void menu.offsetWidth; // start the transition from the closed state
      menu.classList.add("is-open");
      document.body.classList.add("menu-open");
      if (lenis) lenis.stop();
      setExpanded(true);
      setOutsideInert(true);
      // Keyboard users land on the first link; mouse users keep focus on the button.
      var first = menu.querySelector(".menu-list a");
      if (byKeyboard && first) first.focus({ preventScroll: true });
    };
    var closeMenu = function (restoreFocus) {
      if (!menuIsOpen) return;
      menuIsOpen = false;
      menu.classList.remove("is-open");
      setExpanded(false);
      if (restoreFocus) toggle.focus({ preventScroll: true });
      menuHideTimer = setTimeout(function () {
        menu.hidden = true;
        document.body.classList.remove("menu-open");
        if (lenis) lenis.start();
        setOutsideInert(false);
      }, reduceMotion.matches ? 0 : CLOSE_MS);
    };

    toggle.addEventListener("click", function (e) { if (menuIsOpen) closeMenu(true); else openMenu(e.detail === 0); });
    document.addEventListener("keydown", function (e) {
      if (!menuIsOpen) return;
      if (e.key === "Escape") { closeMenu(true); return; }
      if (e.key === "Tab") {
        // Keep focus on the header (logo, language, close) and the menu links.
        var items = Array.prototype.slice.call(document.querySelectorAll(".site-header a[href], .site-header button, #site-menu a[href]"));
        var i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
  }

  /* ---------- Hero video: pause button, still image for reduced motion / data saver ---------- */
  var video = document.querySelector(".hero-media video");
  var videoBtn = document.querySelector(".video-toggle");
  if (video && videoBtn) {
    var saveData = navigator.connection && navigator.connection.saveData;
    function setPaused(paused) {
      if (paused) video.pause(); else video.play().catch(function () {});
      videoBtn.setAttribute("aria-pressed", String(paused));
      videoBtn.setAttribute("aria-label", videoBtn.dataset[paused ? "labelPlay" : "labelPause"]);
    }
    if (reduceMotion.matches || saveData) {
      video.removeAttribute("autoplay");
      setPaused(true);
    }
    videoBtn.addEventListener("click", function () {
      setPaused(!video.paused ? true : false);
    });
  }

  /* ---------- Whale scroll sequence (after seasats.com) ----------
     The hero pins to the screen while the visitor scrolls through a tall section.
     The calm ocean video keeps looping underneath; a canvas fades in on top and
     draws a whale fluke rising out of the water, frame by frame with the scroll, until
     it stands as the V of the AquaVant logo.
     Frames load coarse-to-fine (every 16th first, then the gaps), so the sequence
     works almost immediately and sharpens as the rest arrive. */
  (function () { // own scope: the names below must not collide with other sections
  var whale = document.querySelector("[data-whale]");
  var saveData = navigator.connection && navigator.connection.saveData;
  var frameCount = whale ? parseInt(whale.dataset.count, 10) : 0;
  if (whale && frameCount > 1 && !reduceMotion.matches && !saveData && window.HTMLCanvasElement) {
    var canvas = whale.querySelector(".whale-canvas");
    var ctx = canvas.getContext("2d");
    var heroText = whale.querySelector(".hero-content");
    var videoToggle = whale.querySelector(".video-toggle");
    var heroVideo = whale.querySelector(".hero-media video");
    var onScreen = true;
    var frames = new Array(frameCount);
    var shown = -1;
    whale.classList.add("is-live");

    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

    // The frames are 1280 px wide, so a bigger canvas only adds pixels to push each
    // frame without adding detail. Cap the drawing size; CSS stretches it on the GPU.
    var sizeCanvas = function () {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      var scale = Math.min(window.devicePixelRatio || 1, 1600 / Math.max(w, 1), 1600 / Math.max(h, 1));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      shown = -1;
    };

    // Draw with "object-fit: cover" so the frame fills the screen at any aspect ratio.
    var draw = function (img) {
      var cw = canvas.width, ch = canvas.height;
      var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      var w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };
    // Nearest frame that has finished loading, looking outward from the wanted one.
    var nearest = function (i) {
      for (var d = 0; d < frameCount; d++) {
        if (frames[i - d]) return i - d;
        if (frames[i + d]) return i + d;
      }
      return -1;
    };

    // Scroll position eases toward its target instead of jumping, so a flick of the
    // wheel glides through the frames. Neighbouring frames are blended by the
    // fraction in between, which hides the step from one frame to the next.
    var target = 0, smooth = -1, lastT = 0, lastF = -1, raf = 0;
    var LAG = lenis ? 45 : 110; // ms; higher = softer, lower = tighter. Lenis already eases the scroll.

    var progress = function () {
      var r = whale.getBoundingClientRect();
      var travel = r.height - window.innerHeight;
      return travel > 0 ? clamp(-r.top / travel) : 0;
    };

    var render = function (p) {
      // Canvas takes over from the looping video during the first few percent of the scroll.
      canvas.style.opacity = clamp(p / 0.03).toFixed(3);
      // Once the canvas covers it, the video is invisible: stop decoding it.
      if (heroVideo) {
        var userPaused = videoToggle && videoToggle.getAttribute("aria-pressed") === "true";
        if (p >= 0.035 || !onScreen) { if (!heroVideo.paused) heroVideo.pause(); }
        else if (!userPaused && heroVideo.paused) heroVideo.play().catch(function () {});
      }
      // Hero text lifts away while the fluke starts to rise.
      var q = ease(clamp(p / 0.2));
      heroText.style.opacity = (1 - q).toFixed(3);
      heroText.style.transform = "translate3d(0," + (-60 * q).toFixed(1) + "px,0)";
      heroText.style.visibility = q >= 1 ? "hidden" : "";
      if (videoToggle) videoToggle.style.opacity = (1 - clamp(p / 0.05)).toFixed(3);
      // Frames run to the very end of the scroll. The blue band covers the screen over the
      // last ~45% (CSS margin-top: -100svh), so the final frames play beneath it and the
      // fluke never stands still on screen.
      var f = clamp((p - 0.03) / 0.97) * (frameCount - 1);
      if (Math.abs(f - lastF) > 0.02 || shown === -1) {
        var i0 = Math.floor(f), mix = f - i0;
        var base = nearest(i0);
        if (base !== -1) {
          ctx.globalAlpha = 1;
          draw(frames[base]);
          if (base === i0 && mix > 0.02 && frames[i0 + 1]) {
            ctx.globalAlpha = mix;
            draw(frames[i0 + 1]);
            ctx.globalAlpha = 1;
          }
          shown = base;
          lastF = f;
        }
      }
    };

    var tick = function (now) {
      raf = 0;
      var dt = lastT ? Math.min(64, now - lastT) : 16;
      lastT = now;
      target = progress();
      if (smooth < 0) smooth = target;
      smooth += (target - smooth) * (1 - Math.exp(-dt / LAG));
      if (Math.abs(target - smooth) < 0.0004) smooth = target;
      render(smooth);
      if (smooth !== target) raf = requestAnimationFrame(tick); else lastT = 0;
    };
    var requestTick = function () { if (!raf) raf = requestAnimationFrame(tick); };
    var update = function () { lastF = -1; requestTick(); };

    // Coarse-to-fine load order: 0, 16, 32 … then 8, 24 … then 4, 12 … and so on.
    var order = [];
    for (var step = 16; step >= 1; step = step / 2) {
      for (var k = 0; k < frameCount; k += step) if (order.indexOf(k) === -1) order.push(k);
    }
    if (order.indexOf(frameCount - 1) === -1) order.splice(1, 0, frameCount - 1);
    else { order.splice(order.indexOf(frameCount - 1), 1); order.splice(1, 0, frameCount - 1); }

    var pad = function (n) { return ("000" + (n + 1)).slice(-3); };
    var loadAll = function (ext) {
      var next = 0, active = 0, MAX = 6;
      var pump = function () {
        while (active < MAX && next < order.length) {
          (function (idx) {
            active++;
            var img = new Image();
            img.decoding = "async";
            img.onload = function () {
              frames[idx] = img;
              active--;
              update();
              pump();
            };
            img.onerror = function () { active--; pump(); };
            img.src = whale.dataset.frames + "frame-" + pad(idx) + "." + ext;
          })(order[next++]);
        }
      };
      pump();
    };
    // Use AVIF when the browser can decode it, JPEG otherwise.
    var probe = new Image();
    probe.onload = function () { loadAll(probe.width > 0 ? "avif" : "jpg"); };
    probe.onerror = function () { loadAll("jpg"); };
    probe.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";

    sizeCanvas();
    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", function () { sizeCanvas(); update(); });
    new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; update(); }).observe(whale);
    update();
  }
  })();

  /* ---------- Carousel (slide change after inflect.co.uk) ----------
     The current image is wiped away to reveal the next one underneath, the old
     text lifts and fades, then the new lines rise in one after another. The
     carousel loops endlessly; arrows wait until a change has finished. */
  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll(".slide"));
    var images = Array.prototype.slice.call(root.querySelectorAll(".carousel-media img"));
    var count = root.querySelector(".carousel-count");
    var EASE_WIPE = "cubic-bezier(.645, .045, .355, 1)";
    var i = 0;
    var busy = false;
    var token = 0;     // each change gets a number; late callbacks from older changes are ignored
    var running = [];

    function setText(n) {
      slides.forEach(function (s, k) {
        s.classList.toggle("is-active", k === n);
        s.setAttribute("aria-hidden", String(k !== n));
      });
    }
    function lines(slide) { return Array.prototype.slice.call(slide.children); }
    function isPill(el) { return el.classList.contains("status"); }

    function show(n, dir) {
      n = (n + slides.length) % slides.length;
      if (busy || n === i) return;
      var from = i;
      i = n;
      if (count) count.textContent = (n + 1) + " / " + slides.length;

      if (reduceMotion.matches || !root.animate) {
        images.forEach(function (img, k) { img.classList.toggle("is-active", k === n); });
        setText(n);
        return;
      }
      busy = true;
      var my = ++token;
      var current = function () { return my === token; };
      // Start from a clean state: stop anything left over and show slide "from" as settled.
      running.forEach(function (a) { a.cancel(); });
      running = [];
      images.forEach(function (img, k) { img.classList.toggle("is-active", k === from); img.style.zIndex = ""; });
      setText(from);

      // Image: the next one waits directly underneath while the current one is wiped away.
      var fromImg = images[from], toImg = images[n];
      toImg.style.zIndex = 2;
      var wipe = fromImg.animate(
        [{ clipPath: "inset(0 0 0 0)" }, { clipPath: dir > 0 ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)" }],
        { duration: 900, easing: EASE_WIPE, fill: "forwards" });
      running.push(wipe);
      var imageDone = wipe.finished.then(function () {
        if (!current()) return;
        fromImg.classList.remove("is-active");
        toImg.classList.add("is-active");
        toImg.style.zIndex = "";
        wipe.cancel();
      });

      // Text: old lines lift and fade, the status pill shrinks away.
      var outs = lines(slides[from]).map(function (el, k) {
        return el.animate(
          [{ opacity: 1, transform: "none" }, { opacity: 0, transform: isPill(el) ? "scale(0)" : "translateY(-20px)" }],
          { duration: 380, delay: k * 40, easing: "cubic-bezier(.55, 0, .7, .2)", fill: "forwards" });
      });
      running = running.concat(outs);
      var textDone = Promise.all(outs.map(function (a) { return a.finished; })).then(function () {
        if (!current()) return;
        setText(n);
        outs.forEach(function (a) { a.cancel(); });
        // New lines rise in from below; the pill pops in like the buttons.
        var ins = lines(slides[n]).map(function (el, k) {
          return el.animate(
            [{ opacity: 0, transform: isPill(el) ? "scale(0)" : "translateY(20px)" }, { opacity: 1, transform: "none" }],
            { duration: isPill(el) ? 550 : 700, delay: 120 + k * 90, easing: isPill(el) ? EASE_WIPE : "cubic-bezier(.16, 1, .3, 1)", fill: "backwards" });
        });
        running = running.concat(ins);
        return Promise.all(ins.map(function (a) { return a.finished; }));
      });

      // Unlock when both halves are done, or after 2.5 s at the latest so the arrows never stay locked.
      var unlock = setTimeout(function () { busy = false; }, 2500);
      Promise.all([imageDone, textDone]).then(function () {
        if (current()) { busy = false; clearTimeout(unlock); }
      }, function () { /* cancelled by a newer change */ });
    }

    root.querySelector("[data-prev]").addEventListener("click", function () { show(i - 1, -1); });
    root.querySelector("[data-next]").addEventListener("click", function () { show(i + 1, 1); });
    root.addEventListener("keydown", function (e) {
      if (e.target.closest("input, textarea")) return;
      if (e.key === "ArrowLeft") show(i - 1, -1);
      if (e.key === "ArrowRight") show(i + 1, 1);
    });
    images.forEach(function (img, k) { img.classList.toggle("is-active", k === 0); });
    setText(0);
  });

  /* ---------- Scroll animations (after inflect.co.uk) ----------
     Headings rise word by word, text and list items slide in from the right like
     the menu links, images drift inside their
     frames, and the statement on the blue band fills from light blue to white
     letter by letter as it scrolls through the screen. Boxes rise into place and
     images are uncovered by a curtain lifting from the bottom.
     Reveals are reversible (after rothfinder.com): scrolling back up plays them out
     again as their element drops below the screen, and scrolling down replays them. */
  var canAnimate = !reduceMotion.matches && "IntersectionObserver" in window;
  if (canAnimate) {
    doc.classList.add("motion");

    // Wrap each word in a mask so it can rise into view. Nested elements are kept.
    var splitWords = function (el) {
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 1) { walk(child); return; }
          if (child.nodeType !== 3 || !child.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var mask = document.createElement("span");
            var word = document.createElement("span");
            mask.className = "w-mask";
            word.className = "w";
            word.style.setProperty("--wi", i++);
            word.textContent = part;
            mask.appendChild(word);
            frag.appendChild(mask);
          });
          child.replaceWith(frag);
        });
      })(el);
      el.classList.add("rv-words");
    };

    var inHero = function (el) { return el.closest(".hero, .page-hero, .menu, .slide"); };
    // The first solid background behind an element: the colour its reveal cover takes.
    var coverColor = function (el) {
      for (var n = el.parentElement; n; n = n.parentElement) {
        var bg = getComputedStyle(n).backgroundColor;
        if (bg && bg !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(bg)) return bg;
      }
      return "#fff";
    };
    var tag = function (selector, type) {
      document.querySelectorAll(selector).forEach(function (el) {
        if (inHero(el) || el.classList.contains("rv-" + type)) return;
        if (type === "words") splitWords(el); else el.classList.add("rv-" + type);
        if (type === "wipe") { el.style.setProperty("--rv-cover", coverColor(el)); preload.observe(el); }
        revealer.observe(el);
      });
    };

    // Elements that enter in the same frame are staggered in reading order. An element
    // that leaves through the bottom edge (the visitor scrolled back up) plays out again;
    // one that leaves through the top stays revealed, so nothing flickers on the way down.
    // Image frames wait for their photo before the curtain lifts, otherwise a slow or
    // lazy-loaded photo would pop in after the reveal had already run over an empty frame.
    var photoReady = function (el, done) {
      var img = el.classList.contains("rv-wipe") && (el.querySelector("img.is-active") || el.querySelector("img"));
      if (!img || (img.complete && img.naturalWidth)) { done(); return; }
      var called = false;
      var go = function () { if (!called) { called = true; done(); } };
      img.loading = "eager";
      if (img.decode) img.decode().then(go, go); else img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
      setTimeout(go, 2500);
    };
    var reveal = function (el, delay) {
      el._rvIn = true;
      photoReady(el, function () {
        if (!el._rvIn) return; // scrolled away again while the photo loaded
        el.style.setProperty("--stagger", delay);
        // Make sure the hidden state has been styled before revealing, so the
        // transition always runs instead of the element appearing in one go.
        void getComputedStyle(el).opacity;
        el.classList.add("is-in");
      });
    };
    var revealer = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          reveal(el, Math.min(n++, 8) * 70 + "ms");
        } else if (entry.boundingClientRect.top > entry.rootBounds.bottom - 1) {
          el._rvIn = false;
          el.style.setProperty("--stagger", "0ms");
          el.classList.remove("is-in");
        }
      });
    }, { rootMargin: "0px 0px -10% 0px" });

    // Start loading framed photos well before they reach the screen.
    var preload = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll("img").forEach(function (img) {
          img.loading = "eager";
          if (img.decode) img.decode().catch(function () {});
        });
        preload.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px 150% 0px" });

    tag("main h2", "words");
    tag(".media:not(.tile .media), .carousel-media", "wipe");
    tag(".block, .tile, .diagram, .facts, .founder", "rise");
    tag([
      ".label", ".section-head .lead", ".section-head .text-link", ".split .lead", ".split .measure > p",
      ".points li", ".steps li", ".series-logo", ".series li", ".flow-steps li",
      ".mechanism figure", ".stat", ".block > .lead", ".band-body > p", ".band-body > div > p",
      ".contact-list > div", ".cta p", ".person h3", ".person .role", ".person li", ".species h3", ".species p"
    ].join(", "), "slide");
    tag(".btn", "pop");

    // Hero headings rise on load.
    document.querySelectorAll(".hero h1, .page-hero h1").forEach(function (h1) {
      splitWords(h1);
      h1.style.setProperty("--stagger", "120ms");
      requestAnimationFrame(function () { requestAnimationFrame(function () { h1.classList.add("is-in"); }); });
    });

    // Scroll-driven effects run only while their element is on screen.
    var active = new Set();
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) active.add(e.target); else active.delete(e.target); });
      requestTick();
    });

    var parallax = document.querySelectorAll(".media img, .page-hero-img img");
    parallax.forEach(function (img) { img.classList.add("rv-parallax"); watcher.observe(img.parentElement); });

    var FILL_FROM = [140, 207, 242], FILL_TO = [255, 255, 255], EDGE = 12;
    var fills = [];
    document.querySelectorAll(".statement").forEach(function (el) {
      var chars = [];
      var plain = el.textContent.replace(/\s+/g, " ").trim();
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 1) { walk(child); return; }
          if (child.nodeType !== 3) return;
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var word = document.createElement("span");
            word.className = "fill-word";
            word.setAttribute("aria-hidden", "true");
            Array.from(part).forEach(function (c) {
              var s = document.createElement("span");
              s.className = "ch";
              s.textContent = c;
              word.appendChild(s);
              chars.push(s);
            });
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        });
      })(el);
      // Screen readers get the sentence once, not letter by letter.
      var sr = document.createElement("span");
      sr.className = "visually-hidden";
      sr.textContent = plain;
      el.prepend(sr);
      fills.push({ el: el, chars: chars, last: -1 });
      watcher.observe(el);
    });

    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      parallax.forEach(function (img) {
        var frame = img.parentElement;
        if (!active.has(frame)) return;
        var r = frame.getBoundingClientRect();
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        img.style.setProperty("--py", (Math.max(-1, Math.min(1, p)) * 5).toFixed(2) + "%");
      });
      fills.forEach(function (f) {
        if (!active.has(f.el) && f.last !== -1) return;
        var r = f.el.getBoundingClientRect();
        var p = (vh * 0.9 - r.top) / (r.height + vh * 0.4);
        p = Math.max(0, Math.min(1, p));
        var front = p * (f.chars.length + EDGE);
        if (Math.abs(front - f.last) < 0.2) return;
        f.last = front;
        f.chars.forEach(function (c, i) {
          var t = Math.round(Math.max(0, Math.min(1, (front - i) / EDGE)) * 24) / 24;
          if (c._t === t) return; // unchanged: skip, so only the letters at the edge restyle
          c._t = t;
          c.style.setProperty("--ch", "rgb(" + FILL_FROM.map(function (v, k) { return Math.round(v + (FILL_TO[k] - v) * t); }).join(",") + ")");
        });
      });
    };
    var ticking = false;
    var requestTick = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick);
    update();
  }

  /* ---------- Contact form → Netlify Forms ----------
     The message is posted to Netlify, which stores it and emails it to both founders.
     Without JavaScript the form posts normally and returns to contact.html?sent. */
  var form = document.querySelector("form[data-contact]");
  if (form) {
    var t = {
      en: { required: "Please fill in this field.", email: "Enter an email address like name@company.com.", consent: "Please confirm so we can reply to you.", summary: "Please correct the highlighted fields.",
            sending: "Sending…", sent: "Thank you. Your message has been sent, and we will reply as soon as we can.",
            failed: "Sorry, the message could not be sent. Please try again, or email us at " },
      nb: { required: "Fyll ut dette feltet.", email: "Skriv inn en e-postadresse, for eksempel navn@firma.no.", consent: "Bekreft for at vi kan svare deg.", summary: "Rett opp feltene som er markert.",
            sending: "Sender …", sent: "Takk. Meldingen er sendt, og vi svarer så snart vi kan.",
            failed: "Beklager, meldingen kunne ikke sendes. Prøv igjen, eller skriv til " }
    }[lang];
    var status = form.querySelector(".form-status");
    var button = form.querySelector("button[type=submit]");
    var say = function (kind, text) { status.className = "form-status is-" + kind; status.textContent = text; status.focus(); };

    function check(field) {
      var err = document.getElementById(field.id + "-error");
      var msg = "";
      if (field.type === "checkbox") { if (field.required && !field.checked) msg = t.consent; }
      else if (field.required && !field.value.trim()) msg = t.required;
      else if (field.type === "email" && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) msg = t.email;
      field.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg;
      return !msg;
    }
    var fields = form.querySelectorAll("input[id], select, textarea");
    fields.forEach(function (f) {
      f.addEventListener("blur", function () { if (f.value || f.getAttribute("aria-invalid")) check(f); });
    });

    if (/[?&]sent\b/.test(location.search)) say("ok", t.sent);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (f) { if (!check(f) && !firstBad) firstBad = f; });
      if (firstBad) {
        status.className = "form-status is-error";
        status.textContent = t.summary;
        firstBad.focus();
        return;
      }
      var label = button.textContent;
      button.disabled = true;
      button.textContent = t.sending;
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.reset();
        fields.forEach(function (f) { f.removeAttribute("aria-invalid"); });
        say("ok", t.sent);
      }).catch(function () {
        say("error", t.failed + form.dataset.fallback + ".");
      }).then(function () {
        button.disabled = false;
        button.textContent = label;
      });
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
