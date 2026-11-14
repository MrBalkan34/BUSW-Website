// BUSW — project inquiry form (contact page).
//
// The form is sent to /api/inquiry. The page only ever says "sent" when that endpoint answers { ok: true }. Any other
// outcome (the endpoint is not set up, a network error, a refusal) says plainly that nothing was sent and offers the same
// message as an email instead. Without this script the form falls back to the browser's own email link.

(function () {
  var form = document.getElementById("inquiry");
  var status = document.getElementById("inquiry-status");
  if (!form || !status) {
    return;
  }

  var ENDPOINT = "/api/inquiry";
  var MAIL = "contact@busoftwareworks.com";
  var SERVICES = ["website", "electron", "social", "other"];
  var FIELDS = ["name", "email", "service", "message"];
  var TIMEOUT_MS = 15000;

  var submit = form.querySelector('button[type="submit"]');
  var errors = {}; // field -> translation key of the message being shown
  var render = null; // re-draws the status box (so a language switch re-words it)

  function t(key) {
    var i18n = window.BUSW_I18N;
    return (i18n && i18n.t(key)) || "";
  }

  // /contact.html?service=website (from the website, Electron and social pages) preselects the service.
  try {
    var asked = new URLSearchParams(window.location.search).get("service");
    if (SERVICES.indexOf(asked) !== -1) {
      form.elements.service.value = asked;
    }
  } catch (e) {
    // Ignore a malformed address.
  }

  function read() {
    return {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      service: form.elements.service.value,
      message: form.elements.message.value.trim(),
      company: form.elements.company.value
    };
  }

  function validate(data) {
    var found = {};
    if (data.name === "") {
      found.name = "inq.err.name";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      found.email = "inq.err.email";
    }
    if (SERVICES.indexOf(data.service) === -1) {
      found.service = "inq.err.service";
    }
    if (data.message.length < 10) {
      found.message = "inq.err.message";
    }
    return found;
  }

  function showErrors() {
    FIELDS.forEach(function (field) {
      var input = form.elements[field];
      var note = document.getElementById("inq-" + field + "-error");
      if (errors[field]) {
        note.textContent = t(errors[field]);
        note.hidden = false;
        input.setAttribute("aria-invalid", "true");
        var described = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
        if (described.indexOf(note.id) === -1) {
          described.unshift(note.id);
        }
        input.setAttribute("aria-describedby", described.join(" "));
      } else {
        note.textContent = "";
        note.hidden = true;
        input.removeAttribute("aria-invalid");
        var rest = (input.getAttribute("aria-describedby") || "").split(" ").filter(function (id) {
          return id && id !== note.id;
        });
        if (rest.length) {
          input.setAttribute("aria-describedby", rest.join(" "));
        } else {
          input.removeAttribute("aria-describedby");
        }
      }
    });
  }

  function clearStatus() {
    render = null;
    status.hidden = true;
    status.textContent = "";
    status.removeAttribute("data-state");
  }

  function setStatus(state, draw) {
    render = function () {
      status.textContent = "";
      status.setAttribute("data-state", state);
      draw(status);
    };
    render();
    status.hidden = false;
  }

  function paragraph(text) {
    var p = document.createElement("p");
    p.textContent = text;
    return p;
  }

  function mailtoFor(data) {
    var lines = [
      t("inq.name") + ": " + data.name,
      t("inq.email") + ": " + data.email,
      t("inq.service") + " " + t("inq.opt." + data.service),
      "",
      data.message
    ];
    return {
      text: lines.join("\n"),
      href: "mailto:" + MAIL + "?subject=" + encodeURIComponent(t("inq.msg.mailSubject")) + "&body=" + encodeURIComponent(lines.join("\n"))
    };
  }

  // Nothing was sent. Say so, keep what the visitor typed, and offer the same message as an email.
  function showFailed(data, invalid) {
    var mail = mailtoFor(data);
    setStatus("failed", function (box) {
      var title = document.createElement("h3");
      title.textContent = t("inq.msg.failedTitle");
      box.appendChild(title);
      box.appendChild(paragraph(t(invalid ? "inq.msg.invalid" : "inq.msg.failed")));

      var actions = document.createElement("div");
      actions.className = "btn-group";
      var link = document.createElement("a");
      link.className = "btn btn-primary";
      link.href = mail.href;
      link.textContent = t("inq.msg.emailIt");
      actions.appendChild(link);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        var copy = document.createElement("button");
        copy.type = "button";
        copy.className = "btn btn-secondary";
        copy.textContent = t("inq.msg.copy");
        copy.addEventListener("click", function () {
          navigator.clipboard.writeText(mail.text).then(function () {
            copy.textContent = t("inq.msg.copied");
          });
        });
        actions.appendChild(copy);
      }
      box.appendChild(actions);
    });
  }

  function showSent() {
    setStatus("sent", function (box) {
      box.appendChild(paragraph(t("inq.msg.sent")));
    });
    status.setAttribute("tabindex", "-1");
    status.focus();
  }

  function setBusy(busy) {
    submit.disabled = busy;
    form.setAttribute("aria-busy", String(busy));
    submit.textContent = busy ? t("inq.msg.sending") : t("inq.submit");
  }

  function send(data) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) {
        controller.abort();
      }
    }, TIMEOUT_MS);

    setBusy(true);
    clearStatus();

    var language = window.BUSW_I18N && window.BUSW_I18N.language ? window.BUSW_I18N.language() : "en";
    var request = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, email: data.email, service: data.service, message: data.message, company: data.company, lang: language })
    };
    if (controller) {
      request.signal = controller.signal;
    }

    fetch(ENDPOINT, request)
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return null;
          })
          .then(function (body) {
            return { status: response.status, body: body };
          });
      })
      .then(function (result) {
        // The only success: the server says it delivered the message.
        if (result.status === 200 && result.body && result.body.ok === true) {
          form.reset();
          showSent();
        } else {
          showFailed(data, result.status === 400 && result.body && result.body.error === "invalid");
        }
      })
      .catch(function () {
        showFailed(data, false);
      })
      .then(function () {
        clearTimeout(timer);
        setBusy(false);
      });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearStatus();

    var data = read();
    if (data.company !== "") {
      return; // only a robot fills the hidden field
    }

    errors = validate(data);
    showErrors();

    var first = FIELDS.filter(function (field) {
      return errors[field];
    })[0];
    if (first) {
      setStatus("invalid", function (box) {
        box.appendChild(paragraph(t("inq.msg.checking")));
      });
      form.elements[first].focus();
      return;
    }
    send(data);
  });

  // A field's message goes away as soon as the visitor starts fixing it.
  FIELDS.forEach(function (field) {
    form.elements[field].addEventListener("input", function () {
      if (errors[field]) {
        delete errors[field];
        showErrors();
      }
    });
  });

  document.addEventListener("busw:languagechange", function () {
    showErrors();
    if (render) {
      render();
    }
    if (!submit.disabled) {
      submit.textContent = t("inq.submit");
    }
  });
})();
