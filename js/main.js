// BUSW — mobile navigation toggle, header shadow on scroll, and scroll-reveal.

(function () {
  var toggle = document.querySelector(".nav-toggle");
  var navList = document.querySelector(".nav-list");

  if (!toggle || !navList) {
    return;
  }

  // The button's words come from the language tables (js/i18n.js); the English text is the fallback.
  function label(isOpen) {
    var i18n = window.BUSW_I18N;
    var text = i18n ? i18n.t(isOpen ? "nav.close" : "nav.menu") : "";
    return text || (isOpen ? "Close" : "Menu");
  }

  function setOpen(isOpen) {
    navList.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = label(isOpen);
  }

  toggle.textContent = label(false);

  toggle.addEventListener("click", function () {
    setOpen(!navList.classList.contains("is-open"));
  });

  // Switching language while the menu is open keeps it open and re-words the button.
  document.addEventListener("busw:languagechange", function () {
    toggle.textContent = label(navList.classList.contains("is-open"));
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && navList.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.matchMedia("(min-width: 45.0625rem)").addEventListener("change", function (event) {
    if (event.matches) {
      setOpen(false);
    }
  });
})();

// The header gains a shadow once the page has scrolled, so it reads as floating above the content.
(function () {
  var header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  var ticking = false;

  function update() {
    ticking = false;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  update();
})();

// Scroll-reveal: blocks below the fold fade up once as they come into view. Skipped entirely when the visitor
// prefers reduced motion or the browser has no IntersectionObserver, and the blocks are then simply shown.
(function () {
  if (!("IntersectionObserver" in window)) {
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  var targets = document.querySelectorAll(
    "main .section-heading, main .card, main .capability-group, main .shot, main .notice, main .prose, main .founders-heading"
  );
  if (!targets.length) {
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  Array.prototype.forEach.call(targets, function (el) {
    // Blocks that share a row come in one after another, a few hundredths of a second apart.
    var siblings = el.parentElement ? el.parentElement.children : [];
    var index = Array.prototype.indexOf.call(siblings, el);
    el.style.setProperty("--reveal-delay", Math.min(Math.max(index, 0), 4) * 70 + "ms");
    el.classList.add("reveal");
    observer.observe(el);
  });
})();

// Pointer spotlight: a card learns where the mouse is, so its CSS can light up the spot under it. Mouse only; touch
// screens and visitors who prefer reduced motion never run this.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  document.addEventListener(
    "pointermove",
    function (event) {
      var card = event.target.closest ? event.target.closest(".card, .capability-group") : null;
      if (!card) {
        return;
      }
      var box = card.getBoundingClientRect();
      card.style.setProperty("--mx", event.clientX - box.left + "px");
      card.style.setProperty("--my", event.clientY - box.top + "px");
    },
    { passive: true }
  );
})();

// When the language changes the main text fades back in, so the swap reads as a change rather than a flicker.
(function () {
  var main = document.querySelector("main");
  if (!main || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  document.addEventListener("busw:languagechange", function () {
    main.classList.remove("lang-swap");
    void main.offsetWidth; // restart the animation if the language is switched twice quickly
    main.classList.add("lang-swap");
  });

  main.addEventListener("animationend", function (event) {
    if (event.target === main) {
      main.classList.remove("lang-swap");
    }
  });
})();
