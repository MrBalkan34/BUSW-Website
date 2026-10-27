// BUSW — mobile navigation toggle.

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
