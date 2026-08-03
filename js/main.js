// BUSW — mobile nav toggle + optional reduced-motion-aware scroll reveal.

(function () {
  var toggle = document.querySelector(".nav-toggle");
  var navList = document.querySelector(".nav-list");

  if (toggle && navList) {
    toggle.addEventListener("click", function () {
      var isOpen = navList.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "Close" : "Menu";
    });
  }

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    var revealEls = document.querySelectorAll(".reveal");

    if (revealEls.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );

      revealEls.forEach(function (el) {
        observer.observe(el);
      });
    }
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }
})();
