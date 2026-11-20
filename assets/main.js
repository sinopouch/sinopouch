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

  // Contact form -> compose an email (no backend needed for a starter site)
  var form = document.getElementById("inquiryForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = data.get("name") || "";
      var company = data.get("company") || "";
      var email = data.get("email") || "";
      var product = data.get("product") || "";
      var qty = data.get("qty") || "";
      var msg = data.get("message") || "";
      var subject = "Website inquiry - " + (product || "Packaging") + " - " + name;
      var body =
        "Name: " + name + "\n" +
        "Company: " + company + "\n" +
        "Email: " + email + "\n" +
        "Interested in: " + product + "\n" +
        "Estimated quantity: " + qty + "\n\n" +
        "Message:\n" + msg;
      var mailto = "mailto:" + window.SINOPOUCH_CONFIG.email +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
      window.location.href = mailto;
      var ok = document.getElementById("formNote");
      if (ok) { ok.textContent = "Thank you! Your email app will open with the inquiry ready to send."; }
    });
  }
});
