// BUSW website: the Balkan Universal Account link in the navigation.
//
// The marketing site is static and has no accounts of its own. If (and only if) the page names an account server in
//   <meta name="bu-account-origin" content="https://account.example.com">
// this asks that server who is signed in and shows "Sign in", or the person's name with the founder badge.
// It receives a display name and a badge, nothing else, and only trusted origins may read it. With no address
// configured, or if the server cannot be reached, nothing is shown, so there are never dead sign-in links.

(function () {
  var meta = document.querySelector('meta[name="bu-account-origin"]');
  var origin = meta && meta.getAttribute("content") ? meta.getAttribute("content").replace(/\/+$/, "") : "";
  var holder = document.querySelector("[data-account-nav]");
  if (!origin || !holder || !window.fetch) {
    return;
  }

  var session = null;

  function t(key, fallback) {
    var i18n = window.BUSW_I18N;
    return (i18n && i18n.t(key)) || fallback;
  }

  function language() {
    return window.BUSW_I18N ? window.BUSW_I18N.language() : "en";
  }

  function render() {
    if (!session) {
      return;
    }
    holder.textContent = "";
    var link = document.createElement("a");
    link.className = "account-link";
    // The chosen language travels with the link, so the account pages open in the same language.
    var lang = "?lang=" + encodeURIComponent(language());
    if (session.signedIn) {
      link.href = origin + "/dashboard" + lang;
      link.title = t("account.dashboard", "My dashboard");
      // Names are written with textContent, never as markup.
      link.textContent = session.name;
      holder.appendChild(link);
      if (session.badge && session.badge.label) {
        var badge = document.createElement("span");
        badge.className = "founder-badge";
        badge.textContent = session.badge.label;
        holder.appendChild(badge);
      }
    } else {
      link.href = origin + "/account/sign-in" + lang;
      link.textContent = t("account.signIn", "Sign in");
      holder.appendChild(link);
    }
    holder.hidden = false;
  }

  fetch(origin + "/api/public/session", { credentials: "include" })
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(function (data) {
      if (data && typeof data === "object" && typeof data.signedIn === "boolean") {
        session = data;
        render();
      }
    })
    .catch(function () {
      // No server, or it is down: show nothing.
    });

  document.addEventListener("busw:languagechange", render);
})();
