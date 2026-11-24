/* ============================================================
   SinoPouch - data renderer
   从 data/*.json 读取数据，自动填充到页面。
   后台（Decap CMS）修改 JSON 后，前台自动更新。
   - data-bind          → data/content.json（首页文案）
   - data-bind-page     → data/pages.json（内页文案）
   - data-bind          → data/site.json（联系方式，键名不冲突）
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

  function esc(s) { return String(s == null ? "" : s); }

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

  function thumbHtml(p) {
    if (p && p.image) {
      return '<img class="photo-thumb" src="' + esc(p.image) + '" alt="' + esc(p.name || "Pouch") + '">';
    }
    return iconSvg(p && p.icon);
  }

  function productCard(p) {
    var tag = p.tag
      ? '<span class="tag' + (p.tag_style === "amber" ? "" : " green") + '">' + esc(p.tag) + "</span>"
      : "";
    return '' +
      '<div class="product-card cat-card">' +
        '<div class="product-thumb">' + thumbHtml(p) + "</div>" +
        '<div class="product-body">' +
          tag +
          "<h3>" + esc(p.name) + "</h3>" +
          "<p>" + esc(p.description) + "</p>" +
          '<p class="cat-spec"><b>Applications:</b> ' + esc(p.applications) + " · <b>Options:</b> " + esc(p.options) + "</p>" +
          '<a href="' + esc(p.page || "contact.html") + '" class="learn">View details</a>' +
        "</div>" +
      "</div>";
  }

  function renderSite(s) {
    document.querySelectorAll("[data-bind]").forEach(function (el) {
      var key = el.getAttribute("data-bind");
      if (s[key] !== undefined) el.textContent = s[key];
    });
    document.querySelectorAll("[data-bind-mailto]").forEach(function (el) {
      var key = el.getAttribute("data-bind-mailto");
      if (s[key] !== undefined) el.setAttribute("href", "mailto:" + s[key]);
    });
    document.querySelectorAll("[data-bind-wa]").forEach(function (el) {
      var digits = s.whatsapp_number || "";
      el.setAttribute("href", "https://wa.me/" + digits);
    });
    if (window.SINOPOUCH_CONFIG) {
      window.SINOPOUCH_CONFIG.whatsapp = s.whatsapp_number || "";
      window.SINOPOUCH_CONFIG.email = s.email || "";
    }
  }

  function renderProducts(d) {
    var grids = document.querySelectorAll("[data-product-grid]");
    if (!d.products) return;
    grids.forEach(function (grid) {
      var limit = grid.getAttribute("data-limit");
      var list = limit ? d.products.slice(0, parseInt(limit, 10)) : d.products;
      grid.innerHTML = list.map(productCard).join("");
    });
  }

  // 首页：Hero 海报背景 + 文案 + 主图；工厂三图
  function renderHome(c) {
    // 首页文案：所有 data-bind 元素从 content.json 填充（site.json 不含这些键）
    document.querySelectorAll("[data-bind]").forEach(function (el) {
      var key = el.getAttribute("data-bind");
      if (c[key] !== undefined) el.textContent = c[key];
    });
    // Hero 文案
    var hero = document.querySelector("[data-hero-title]");
    if (hero) {
      var before = c.home_hero_before || "";
      var accent = c.home_hero_accent || "";
      var after = c.home_hero_after || "";
      hero.innerHTML = esc(before) + (accent ? ' <span class="accent">' + esc(accent) + "</span>" : "") + (after ? " " + esc(after) : "");
    }
    // Hero 海报背景（上传后铺满 hero，文字改为白色叠加）
    if (c.hero_banner) {
      var heroEl = document.querySelector(".hero");
      if (heroEl) {
        heroEl.style.backgroundImage = "url('" + esc(c.hero_banner) + "')";
        heroEl.style.backgroundSize = "cover";
        heroEl.style.backgroundPosition = "center";
        heroEl.classList.add("hero-has-banner");
      }
    }
    // 右侧产品图
    var heroArt = document.querySelector(".hero-art");
    if (heroArt && c.hero_image) {
      heroArt.innerHTML = '<img class="photo-art" src="' + esc(c.hero_image) + '" alt="Custom pouches">';
    }
    // 工厂三图 + 说明文字
    var shots = document.querySelectorAll(".factory-shot");
    ["1", "2", "3"].forEach(function (n, i) {
      if (!shots[i]) return;
      var label = shots[i].querySelector("span");
      if (label && c["factory_label_" + n]) label.textContent = c["factory_label_" + n];
      if (c["factory_image_" + n]) {
        var old = shots[i].querySelector("svg") || shots[i].querySelector("img");
        if (old) {
          var img = document.createElement("img");
          img.className = "photo-factory";
          img.src = c["factory_image_" + n];
          img.alt = label ? label.textContent : "Factory";
          old.parentNode.replaceChild(img, old);
        }
      }
    });
  }

  // 内页：通用顶部 banner（图片 + 标题 + 副标题）
  function renderInnerBanners(p) {
    // 纯文字绑定（data-bind-page）
    document.querySelectorAll("[data-bind-page]").forEach(function (el) {
      var key = el.getAttribute("data-bind-page");
      if (p[key] !== undefined) el.textContent = p[key];
    });
    // 顶部 banner 图：给对应 section 加背景
    var map = {
      "products.html": "products_banner",
      "oem.html": "oem_banner",
      "contact.html": "contact_banner"
    };
    var file = (window.location.pathname.split("/").pop() || "").toLowerCase();
    var key = map[file];
    if (key && p[key]) {
      var ph = document.querySelector(".page-hero");
      if (ph) {
        ph.style.backgroundImage = "url('" + esc(p[key]) + "')";
        ph.style.backgroundSize = "cover";
        ph.style.backgroundPosition = "center";
        ph.classList.add("page-hero-has-banner");
      }
    }
  }

  // OEM 定制流程（从 pages.json 渲染，可后台增删）
  function renderOemSteps(p) {
    var wrap = document.querySelector("[data-oem-steps]");
    if (!wrap || !p.oem_steps || !p.oem_steps.length) return;
    wrap.innerHTML = p.oem_steps.map(function (s) {
      return '<div class="step"><h3>' + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div>";
    }).join("");
  }

  // 认证页：左图右文证书列表（可后台增删）
  function renderCertificates(p) {
    var wrap = document.querySelector("[data-certificates]");
    if (!wrap || !p.certificates || !p.certificates.length) return;
    wrap.innerHTML = p.certificates.map(function (c) {
      var img = c.image
        ? '<div class="cert-logo"><img src="' + esc(c.image) + '" alt="' + esc(c.title) + '"></div>'
        : '<div class="cert-logo cert-placeholder">✓</div>';
      return '<div class="cert-row">' + img +
        '<div class="cert-copy"><h3>' + esc(c.title) + "</h3><p>" + esc(c.text) + "</p></div></div>";
    }).join("");
  }

  // 分类页：顶部海报 + 多款式图库
  function renderCategoryPage(products) {
    if (!products) return;
    var file = (window.location.pathname.split("/").pop() || "").toLowerCase();
    var match = null;
    products.forEach(function (p) {
      if (p.page && p.page.toLowerCase() === file) match = p;
    });
    if (!match) return;
    // 顶部海报
    if (match.banner_image) {
      var banner = document.querySelector(".cat-banner");
      if (banner) {
        banner.style.backgroundImage = "url('" + esc(match.banner_image) + "')";
        banner.style.backgroundSize = "cover";
        banner.style.backgroundPosition = "center";
        banner.classList.add("cat-banner-has-image");
      }
      var art = document.querySelector(".cat-banner-art");
      if (art) art.style.display = "none";
    } else if (match.image) {
      var art2 = document.querySelector(".cat-banner-art");
      if (art2) art2.innerHTML = '<img class="photo-art" src="' + esc(match.image) + '" alt="' + esc(match.name) + '">';
    }
    // 多款式图库
    var gal = document.querySelector("[data-product-gallery]");
    if (gal && match.gallery && match.gallery.length) {
      gal.innerHTML = match.gallery.map(function (g) {
        var im = g.image
          ? '<img class="gallery-img" src="' + esc(g.image) + '" alt="' + esc(g.title || "Pouch") + '">'
          : '<div class="gallery-img gallery-empty">图片待上传</div>';
        return '<div class="gallery-item">' + im + (g.title ? '<span class="gallery-cap">' + esc(g.title) + "</span>" : "") + "</div>";
      }).join("");
      gal.style.display = "";
    }
  }

  // 导航：Products → Custom Products + 悬浮下拉（从产品数据生成）
  function renderNavDropdown(products) {
    var host = document.querySelector("[data-nav-products]");
    if (!host || !products) return;
    host.textContent = "Custom Products";
    if (!products.length) return;
    var cols = Math.min(3, Math.max(1, Math.ceil(products.length / 3)));
    var items = products.map(function (p) {
      return '<li><a href="' + esc(p.page || "products.html") + '">' + esc(p.name) + "</a></li>";
    }).join("");
    host.parentNode.classList.add("has-dropdown");
    var menu = document.createElement("div");
    menu.className = "nav-dropdown";
    menu.innerHTML = '<div class="nav-dropdown-inner" style="--dd-cols:' + cols + '"><ul>' + items + "</ul></div>";
    host.parentNode.appendChild(menu);
  }

  Promise.all([load("site"), load("products"), load("content"), load("pages")])
    .then(function (res) {
      cache.site = res[0];
      cache.products = res[1];
      cache.content = res[2];
      cache.pages = res[3];
      renderSite(cache.site);
      renderProducts(cache.products);
      renderHome(cache.content);
      renderInnerBanners(cache.pages);
      renderOemSteps(cache.pages);
      renderCertificates(cache.pages);
      renderCategoryPage(cache.products.products);
      renderNavDropdown(cache.products.products);
    })
    .catch(function (e) {
      console.warn("SinoPouch data load skipped:", e.message);
    });
})();
