/* ============================================================
   SinoPouch - data renderer
   从 data/*.json 读取数据，自动填充到页面。
   后台（Decap CMS）修改 JSON 后，前台自动更新。
   ============================================================ */

(function () {
  "use strict";

  var cache = {};

  function load(name) {
    return fetch("data/" + name + ".json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("Failed to load " + name);
        return r.json();
      });
  }

  // ---- SVG icons for product categories ----
  function iconSvg(type) {
    var svgs = {
      coffee: '<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><path d="M20 34 L100 34 L106 124 Q106 132 98 132 L22 132 Q14 132 14 124 Z" fill="#fff" stroke="#21A179" stroke-width="2.5"/><path d="M20 34 L100 34 L98 52 L22 52 Z" fill="#21A179" opacity=".35"/><rect x="55" y="20" width="10" height="14" rx="2" fill="#21A179"/><circle cx="60" cy="88" r="20" fill="#F2A93B" opacity=".9"/></svg>',
      mylar: '<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><path d="M22 28 L98 28 L104 128 Q104 136 96 136 L24 136 Q16 136 16 128 Z" fill="#d9d9d6" stroke="#21A179" stroke-width="2.5"/><path d="M22 28 L98 28 L96 46 L24 46 Z" fill="#9a9a96"/><rect x="38" y="16" width="44" height="12" rx="3" fill="#21A179"/><rect x="34" y="66" width="52" height="34" rx="4" fill="#fff" opacity=".75"/></svg>',
      pet: '<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><path d="M20 30 L100 30 L108 126 Q108 134 100 134 L20 134 Q12 134 12 126 Z" fill="#e6f0ea" stroke="#21A179" stroke-width="2.5"/><path d="M20 30 L100 30 L98 48 L22 48 Z" fill="#F2A93B" opacity=".6"/><path d="M46 14 q14 -10 28 0" fill="none" stroke="#21A179" stroke-width="4"/><rect x="40" y="70" width="40" height="30" rx="15" fill="#fff" opacity=".9"/><circle cx="60" cy="82" r="6" fill="#21A179"/></svg>',
      bread: '<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><path d="M24 26 L96 26 L102 128 Q102 136 94 136 L26 136 Q18 136 18 128 Z" fill="#f7efe0" stroke="#21A179" stroke-width="2.5"/><rect x="34" y="58" width="52" height="40" rx="6" fill="#fff" stroke="#21A179" stroke-width="1.5"/><rect x="44" y="18" width="32" height="8" rx="3" fill="#21A179"/></svg>',
      spout: '<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><path d="M26 46 L94 46 L100 130 Q100 138 92 138 L28 138 Q20 138 20 130 Z" fill="#eaf1ec" stroke="#21A179" stroke-width="2.5"/><rect x="54" y="20" width="12" height="28" rx="3" fill="#21A179"/><rect x="50" y="12" width="20" height="10" rx="3" fill="#F2A93B"/><rect x="40" y="80" width="40" height="26" rx="4" fill="#fff" opacity=".8"/></svg>',
      shaped: '<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><path d="M60 16 Q92 16 100 46 L104 122 Q104 132 94 132 L26 132 Q16 132 16 122 L20 46 Q28 16 60 16 Z" fill="#f6e9d6" stroke="#21A179" stroke-width="2.5"/><path d="M60 16 Q92 16 100 46 L20 46 Q28 16 60 16 Z" fill="#F2A93B" opacity=".5"/><rect x="40" y="72" width="40" height="26" rx="4" fill="#fff" opacity=".85"/></svg>',
      standup: '<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><path d="M24 26 L96 26 L104 128 Q104 136 96 136 L24 136 Q16 136 16 128 Z" fill="#e9efe9" stroke="#21A179" stroke-width="2.5"/><path d="M24 26 L96 26 L94 44 L26 44 Z" fill="#21A179" opacity=".5"/><rect x="44" y="14" width="32" height="12" rx="3" fill="#21A179"/><rect x="36" y="66" width="48" height="30" rx="4" fill="#fff" opacity=".85"/></svg>'
    };
    return svgs[type] || svgs.standup;
  }

  function productCard(p) {
    var tag = p.tag
      ? '<span class="tag' + (p.tag_style === "amber" ? "" : " green") + '">' + p.tag + "</span>"
      : "";
    return '' +
      '<div class="product-card cat-card">' +
        '<div class="product-thumb">' + iconSvg(p.icon) + "</div>" +
        '<div class="product-body">' +
          tag +
          "<h3>" + p.name + "</h3>" +
          "<p>" + p.description + "</p>" +
          '<p class="cat-spec"><b>Applications:</b> ' + p.applications + " · <b>Options:</b> " + p.options + "</p>" +
          '<a href="' + (p.page || "contact.html") + '" class="learn">View details</a>' +
        "</div>" +
      "</div>";
  }

  function renderSite(s) {
    // text bindings
    document.querySelectorAll("[data-bind]").forEach(function (el) {
      var key = el.getAttribute("data-bind");
      if (s[key] !== undefined) el.textContent = s[key];
    });
    // mailto links
    document.querySelectorAll("[data-bind-mailto]").forEach(function (el) {
      var key = el.getAttribute("data-bind-mailto");
      if (s[key] !== undefined) el.setAttribute("href", "mailto:" + s[key]);
    });
    // whatsapp links (https://wa.me/<digits>)
    document.querySelectorAll("[data-bind-wa]").forEach(function (el) {
      var digits = s.whatsapp_number || "";
      el.setAttribute("href", "https://wa.me/" + digits);
    });
    // update config used by contact form
    if (window.SINOPOUCH_CONFIG) {
      window.SINOPOUCH_CONFIG.whatsapp = s.whatsapp_number || "";
      window.SINOPOUCH_CONFIG.email = s.email || "";
    }
  }

  function renderProducts(d) {
    var grids = document.querySelectorAll("[data-product-grid]");
    if (!d.products) return;
    grids.forEach(function (grid) {
      // 首页只显示前 3 个作为预览，产品页显示全部
      var limit = grid.getAttribute("data-limit");
      var list = limit ? d.products.slice(0, parseInt(limit, 10)) : d.products;
      grid.innerHTML = list.map(productCard).join("");
    });
  }

  function renderContent(c) {
    document.querySelectorAll("[data-bind]").forEach(function (el) {
      var key = el.getAttribute("data-bind");
      if (c[key] !== undefined) el.textContent = c[key];
    });
    // hero title: before + accent + after
    var hero = document.querySelector("[data-hero-title]");
    if (hero) {
      var before = c.home_hero_before || "";
      var accent = c.home_hero_accent || "";
      var after = c.home_hero_after || "";
      hero.innerHTML = before + (accent ? ' <span class="accent">' + accent + "</span>" : "") + (after ? " " + after : "");
    }
    document.querySelectorAll("[data-bind-html]").forEach(function (el) {
      var key = el.getAttribute("data-bind-html");
      if (c[key] !== undefined) el.textContent = c[key];
    });
  }

  Promise.all([load("site"), load("products"), load("content")])
    .then(function (res) {
      cache.site = res[0];
      cache.products = res[1];
      cache.content = res[2];
      renderSite(cache.site);
      renderProducts(cache.products);
      renderContent(cache.content);
    })
    .catch(function (e) {
      // 本地 file:// 打开时 fetch 会被浏览器拦截，属正常现象；部署到网站后正常。
      console.warn("SinoPouch data load skipped:", e.message);
    });
})();
