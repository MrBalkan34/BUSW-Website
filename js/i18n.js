// BUSW website: interface language (English / Türkçe).
//
// Reads the visitor's language, swaps the text of every marked element from js/i18n-strings.js, keeps the
// document's lang attribute and the page metadata in step, and remembers the choice. Page addresses never
// change, so existing links keep working. Without JavaScript the pages simply stay in English.

(function () {
  var STORAGE_KEY = "busw.lang";
  var DEFAULT = "en";
  var LANGUAGES = [
    { code: "en", name: "English" },
    { code: "tr", name: "Türkçe" }
  ];
  var strings = window.BUSW_STRINGS || {};
  var current = DEFAULT;

  function supported(code) {
    for (var i = 0; i < LANGUAGES.length; i += 1) {
      if (LANGUAGES[i].code === code) {
        return true;
      }
    }
    return false;
  }

  function readStored() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return supported(value) ? value : null;
    } catch (error) {
      return null;
    }
  }

  function store(code) {
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch (error) {
      // Storage can be blocked. The language still applies to this visit.
    }
  }

  function fromBrowser() {
    var list = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < list.length; i += 1) {
      var primary = String(list[i]).toLowerCase().split("-")[0];
      if (supported(primary)) {
        return primary;
      }
    }
    return null;
  }

  // An explicit ?lang= link wins (other BUSW sites can hand the choice over), then the saved choice, then the browser.
  function initial() {
    try {
      var requested = new URLSearchParams(window.location.search).get("lang");
      if (supported(requested)) {
        store(requested);
        return requested;
      }
    } catch (error) {
      // Ignore a malformed address.
    }
    return readStored() || fromBrowser() || DEFAULT;
  }

  // The current language, then English. A key found in neither returns null so the page keeps its own text.
  function lookup(key, code) {
    var table = strings[code];
    if (table && Object.prototype.hasOwnProperty.call(table, key)) {
      return table[key];
    }
    table = strings[DEFAULT];
    if (table && Object.prototype.hasOwnProperty.call(table, key)) {
      return table[key];
    }
    return null;
  }

  function t(key) {
    var value = lookup(key, current);
    return value === null ? "" : value;
  }

  function setMeta(selector, attribute, value) {
    var node = document.querySelector(selector);
    if (node && value !== null) {
      node.setAttribute(attribute, value);
    }
  }

  function applyMetadata() {
    var page = document.documentElement.getAttribute("data-page");
    if (!page) {
      return;
    }
    var title = lookup("meta." + page + ".title", current);
    var description = lookup("meta." + page + ".description", current);
    if (title !== null) {
      document.title = title;
      setMeta('meta[property="og:title"]', "content", title);
      setMeta('meta[name="twitter:title"]', "content", title);
    }
    if (description !== null) {
      setMeta('meta[name="description"]', "content", description);
      setMeta('meta[property="og:description"]', "content", description);
      setMeta('meta[name="twitter:description"]', "content", description);
    }
  }

  function applyText() {
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i += 1) {
      var text = lookup(nodes[i].getAttribute("data-i18n"), current);
      if (text !== null) {
        nodes[i].textContent = text;
      }
    }
    nodes = document.querySelectorAll("[data-i18n-html]");
    for (var j = 0; j < nodes.length; j += 1) {
      // These strings are written by BUSW in js/i18n-strings.js and contain only links.
      var html = lookup(nodes[j].getAttribute("data-i18n-html"), current);
      if (html !== null) {
        nodes[j].innerHTML = html;
      }
    }
    nodes = document.querySelectorAll("[data-i18n-attr]");
    for (var k = 0; k < nodes.length; k += 1) {
      var pairs = nodes[k].getAttribute("data-i18n-attr").split(";");
      for (var p = 0; p < pairs.length; p += 1) {
        var parts = pairs[p].split(":");
        var value = lookup(parts[1], current);
        if (value !== null) {
          nodes[k].setAttribute(parts[0], value);
        }
      }
    }
  }

  function renderSwitch() {
    var holders = document.querySelectorAll("[data-lang-switch]");
    for (var i = 0; i < holders.length; i += 1) {
      var holder = holders[i];
      if (!holder.firstChild) {
        holder.setAttribute("role", "group");
        for (var l = 0; l < LANGUAGES.length; l += 1) {
          var button = document.createElement("button");
          button.type = "button";
          button.setAttribute("data-lang", LANGUAGES[l].code);
          button.setAttribute("lang", LANGUAGES[l].code);
          button.textContent = LANGUAGES[l].name;
          holder.appendChild(button);
        }
        holder.addEventListener("click", function (event) {
          var target = event.target;
          var code = target && target.getAttribute ? target.getAttribute("data-lang") : null;
          if (code) {
            setLanguage(code);
          }
        });
      }
      holder.setAttribute("aria-label", t("common.langGroup"));
      var buttons = holder.querySelectorAll("button");
      for (var b = 0; b < buttons.length; b += 1) {
        buttons[b].setAttribute("aria-pressed", String(buttons[b].getAttribute("data-lang") === current));
      }
    }
  }

  function apply() {
    document.documentElement.setAttribute("lang", current);
    applyText();
    applyMetadata();
    renderSwitch();
    document.documentElement.classList.remove("i18n-loading");
    document.dispatchEvent(new CustomEvent("busw:languagechange", { detail: { lang: current } }));
  }

  function setLanguage(code) {
    if (!supported(code)) {
      return;
    }
    current = code;
    store(code);
    apply();
  }

  window.BUSW_I18N = {
    t: t,
    language: function () {
      return current;
    },
    setLanguage: setLanguage,
    languages: LANGUAGES
  };

  current = initial();
  apply();

  // Keep other open tabs of the site on the same language.
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY && supported(event.newValue) && event.newValue !== current) {
      current = event.newValue;
      apply();
    }
  });
})();
