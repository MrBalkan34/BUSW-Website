// BUSW — mobile navigation toggle.

(function () {
  var toggle = document.querySelector(".nav-toggle");
  var navList = document.querySelector(".nav-list");

  if (!toggle || !navList) {
    return;
  }

  function setOpen(isOpen) {
    navList.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Close" : "Menu";
  }

  toggle.addEventListener("click", function () {
    setOpen(!navList.classList.contains("is-open"));
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
