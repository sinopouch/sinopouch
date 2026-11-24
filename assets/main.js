/* ============================================================
   SinoPouch - shared scripts
   ============================================================ */

// ---- CONFIG: replace these placeholders with your real contact details ----
window.SINOPOUCH_CONFIG = {
  whatsapp: "8613800000000",   // WhatsApp number, country code + full number, digits only
  email: "sales@sinopouch.com" // your @sinopouch.com inbox
};

document.addEventListener("DOMContentLoaded", function () {
  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });
  }

  // Footer year
  var yr = document.getElementById("year");
  if (yr) { yr.textContent = new Date().getFullYear(); }

  // WhatsApp float link
  var wa = document.getElementById("waFloat");
  if (wa && window.SINOPOUCH_CONFIG.whatsapp) {
    wa.setAttribute("href", "https://wa.me/" + window.SINOPOUCH_CONFIG.whatsapp);
  }

  // Contact form -> send to Web3Forms inbox and show inline confirmation
  var form = document.getElementById("inquiryForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = document.getElementById("formNote");
      var btn = form.querySelector('button[type="submit"]');
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      if (name) { data.set("subject", "Website inquiry - " + name); }
      var payload = {};
      data.forEach(function (value, key) { payload[key] = value; });
      if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }
      if (note) { note.textContent = "Sending your inquiry..."; }

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(function (response) {
        // Web3Forms returns JSON for browser requests, but may return an HTML
        // success page in some cases. Treat any 2xx as success unless JSON says failure.
        return response.clone().json().then(function (result) {
          return { ok: response.ok && result.success !== false, message: result.message };
        }).catch(function () {
          return { ok: response.ok, message: "" };
        });
      })
      .then(function (res) {
        if (res.ok) {
          if (note) {
            note.textContent = "Thank you! We have received your inquiry and will reply within 24 hours.";
            note.style.color = "var(--green-deep)";
          }
          form.reset();
        } else {
          if (note) {
            note.textContent = "Sorry, something went wrong. Please email us directly at " + window.SINOPOUCH_CONFIG.email + ".";
          }
        }
      })
      .catch(function () {
        if (note) {
          note.textContent = "Network error. Please email us directly at " + window.SINOPOUCH_CONFIG.email + ".";
        }
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = "Send Inquiry →"; }
      });
    });
  }
});
