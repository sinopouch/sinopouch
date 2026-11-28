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

  function esc(s) { return String(s == null ? "" : s); }

  // 给上传图片加缓存版本号：CDN 缓存旧图时，换版本号即可强制刷新。
  // 只处理本站 /assets/uploads/ 图片，外链图片原样返回。
  var IMG_VERSION = "20261125f";
  function imgv(u) {
    u = String(u == null ? "" : u);
    if (!u) return u;
    if (u.indexOf("/assets/uploads/") < 0) return u;
    if (u.indexOf("?") >= 0) return u; // 已有参数就不重复加
    return u + "?v=" + IMG_VERSION;
  }

  // 轻量 Markdown 渲染：支持图片、表格、标题、列表、加粗、链接、段落（后台富文本用）
  function md(s) {
    var src = String(s == null ? "" : s).replace(/\r\n?/g, "\n");
    var lines = src.split("\n"), out = [], i = 0;
    function inline(t) {
      return esc(t)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (m, alt, src) { return '<img src="' + imgv(src) + '" alt="' + alt + '" loading="lazy">'; })
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    }
    function flush(para) {
      if (para.length) out.push("<p>" + inline(para.join(" ")) + "</p>");
    }
    while (i < lines.length) {
      var line = lines[i];
      if (line.indexOf("|") >= 0 && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf("-") >= 0) {
        flush([]);
        var head = line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(function (x) { return x.trim(); });
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].indexOf("|") >= 0) {
          rows.push(lines[i].replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(function (x) { return x.trim(); }));
          i++;
        }
        out.push('<table class="md-table"><thead><tr>' + head.map(function (h) { return "<th>" + inline(h) + "</th>"; }).join("") +
          "</tr></thead><tbody>" + rows.map(function (r) {
            return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table>");
        continue;
      }
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { flush([]); var lv = h[1].length; out.push("<h" + lv + ">" + inline(h[2]) + "</h" + lv + ">"); i++; continue; }
      // 空图片占位 ![]() 或不完整图片语法：跳过，避免死循环
      if (/^\s*!\[[^\]]*\]\(\s*\)\s*$/.test(line)) { i++; continue; }
      var im = line.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
      if (im) { flush([]); out.push('<p class="md-img"><img src="' + esc(imgv(im[2])) + '" alt="' + esc(im[1]) + '" loading="lazy"></p>'); i++; continue; }
      var li = line.match(/^\s*[-*+]\s+(.*)$/);
      var ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (li || ol) {
        flush([]);
        var tag = ol ? "ol" : "ul", items = [];
        while (i < lines.length) {
          var m2 = lines[i].match(/^\s*[-*+]\s+(.*)$/) || lines[i].match(/^\s*\d+[.)]\s+(.*)$/);
          if (!m2) break;
          items.push("<li>" + inline(m2[1]) + "</li>"); i++;
        }
        out.push("<" + tag + ">" + items.join("") + "</" + tag + ">");
        continue;
      }
      if (!line.trim()) { flush([]); i++; continue; }
      var para = [];
      var before = i;
      while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s/.test(lines[i]) && !/^\s*!\[/.test(lines[i]) && lines[i].indexOf("|") < 0 && !/^\s*[-*+]\s/.test(lines[i]) && !/^\s*\d+[.)]\s/.test(lines[i])) {
        para.push(lines[i].trim()); i++;
      }
      if (i === before) { i++; continue; } // 保险：任何未识别的行都跳过，杜绝死循环
      flush(para);
    }
    return out.join("");
  }

  // Cloudflare Pages 会把 /page.html 重定向为 /page，这里统一文件名以便匹配
  function pageName() {
    var f = (window.location.pathname.split("/").pop() || "").toLowerCase();
    if (!f) f = "index.html";
    if (!/\.html?$/.test(f)) f = f + ".html";
    return f;
  }

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
      return '<img class="photo-thumb" src="' + esc(imgv(p.image)) + '" alt="' + esc(p.name || "Pouch") + '">';
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

  function renderHome(c) {
    document.querySelectorAll("[data-bind]").forEach(function (el) {
      var key = el.getAttribute("data-bind");
      if (c[key] !== undefined) el.textContent = c[key];
    });
    var hero = document.querySelector("[data-hero-title]");
    if (hero) {
      var before = c.home_hero_before || "";
      var accent = c.home_hero_accent || "";
      var after = c.home_hero_after || "";
      hero.innerHTML = esc(before) + (accent ? ' <span class="accent">' + esc(accent) + "</span>" : "") + (after ? " " + esc(after) : "");
    }
    if (c.hero_banner) {
      var heroEl = document.querySelector(".hero");
      if (heroEl) {
        heroEl.style.backgroundImage = "url('" + esc(imgv(c.hero_banner)) + "')";
        heroEl.style.setProperty("--hero-banner", "url('" + esc(imgv(c.hero_banner)) + "')");
        heroEl.classList.add("hero-has-banner");
      }
    }
    var heroArt = document.querySelector(".hero-art");
    if (heroArt && c.hero_image) {
      heroArt.innerHTML = '<img class="photo-art" src="' + esc(imgv(c.hero_image)) + '" alt="Custom pouches">';
    }
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
          img.src = imgv(c["factory_image_" + n]);
          img.alt = label ? label.textContent : "Factory";
          old.parentNode.replaceChild(img, old);
        }
      }
    });
  }

  function renderInnerBanners(p) {
    document.querySelectorAll("[data-bind-page]").forEach(function (el) {
      var key = el.getAttribute("data-bind-page");
      if (p[key] !== undefined) el.textContent = p[key];
    });
    var map = {
      "products.html": "products_banner",
      "oem.html": "oem_banner",
      "contact.html": "contact_banner"
    };
    var file = pageName();
    var key = map[file];
    if (key && p[key]) {
      var ph = document.querySelector(".page-hero");
      if (ph) {
        ph.style.backgroundImage = "url('" + esc(imgv(p[key])) + "')";
        ph.classList.add("page-hero-has-banner");
        var phProbe = new Image();
        phProbe.onload = function () {
          if (phProbe.naturalWidth && phProbe.naturalHeight) {
            var phRatio = phProbe.naturalWidth / phProbe.naturalHeight;
            if (phRatio >= 1.5 && phRatio <= 5) ph.style.aspectRatio = phRatio + " / 1";
          }
        };
        phProbe.src = imgv(p[key]);
      }
    }
  }

  function renderOemSteps(p) {
    var wrap = document.querySelector("[data-oem-steps]");
    if (!wrap || !p.oem_steps || !p.oem_steps.length) return;
    wrap.innerHTML = p.oem_steps.map(function (s) {
      return '<div class="step"><h3>' + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div>";
    }).join("");
  }

  function renderCertificates(p) {
    var wrap = document.querySelector("[data-certificates]");
    if (!wrap || !p.certificates || !p.certificates.length) return;
    wrap.innerHTML = p.certificates.map(function (c) {
      var img = c.image
        ? '<div class="cert-logo"><img src="' + esc(imgv(c.image)) + '" alt="' + esc(c.title) + '"></div>'
        : '<div class="cert-logo cert-placeholder">✓</div>';
      return '<div class="cert-row">' + img +
        '<div class="cert-copy"><h3>' + esc(c.title) + "</h3><p>" + esc(c.text) + "</p></div></div>";
    }).join("");
  }

  function renderCategoryPage(products) {
    if (!products) return;
    var file = pageName();
    var match = null;
    products.forEach(function (p) {
      if (p.page && p.page.toLowerCase() === file) match = p;
    });
    if (!match) return;
    if (match.banner_image) {
      var banner = document.querySelector(".cat-banner");
      if (banner) {
        banner.style.backgroundImage = "url('" + esc(imgv(match.banner_image)) + "')";
        banner.classList.add("cat-banner-has-image");
        var probe = new Image();
        probe.onload = function () {
          if (probe.naturalWidth && probe.naturalHeight) {
            var ratio = probe.naturalWidth / probe.naturalHeight;
            if (ratio >= 1.5 && ratio <= 5) banner.style.aspectRatio = ratio + " / 1";
          }
        };
        probe.src = imgv(match.banner_image);
      }
      var art = document.querySelector(".cat-banner-art");
      if (art) art.style.display = "none";
    } else if (match.image) {
      var art2 = document.querySelector(".cat-banner-art");
      if (art2) art2.innerHTML = '<img class="photo-art" src="' + esc(imgv(match.image)) + '" alt="' + esc(match.name) + '">';
    }
    var gal = document.querySelector("[data-product-gallery]");
    var galSection = gal ? gal.closest("section") : null;
    if (gal && match.gallery && match.gallery.length) {
      gal.innerHTML = match.gallery.map(function (g, i) {
        var im = g.image
          ? '<img class="gallery-img" src="' + esc(imgv(g.image)) + '" alt="' + esc(g.title || "Pouch") + '">'
          : '<div class="gallery-img gallery-empty">图片待上传</div>';
        var href = "product-detail.html?c=" + encodeURIComponent(match.page || "") + "&i=" + i;
        return '<a class="gallery-item" href="' + href + '" aria-label="View details">' +
          '<div class="gallery-media">' + im + "</div>" +
          '<div class="gallery-text">' +
            (g.title ? '<h3 class="gallery-cap">' + esc(g.title) + "</h3>" : "") +
            (g.desc ? '<p class="gallery-desc">' + esc(g.desc) + "</p>" : "") +
          "</div>" +
          '<span class="gallery-more">read more <span aria-hidden="true">›</span></span>' +
          "</a>";
      }).join("");
      gal.style.display = "";
      if (galSection) galSection.style.display = "";
    } else if (galSection) {
      galSection.style.display = "none";
    }
  }

  // 独立产品详情页：按 URL 参数 c=分类页 i=款式序号 渲染
  function renderProductDetail(products) {
    var host = document.getElementById("detailContent");
    if (!host) return;
    var qs = new URLSearchParams(location.search);
    var cat = qs.get("c") || "";
    var idx = parseInt(qs.get("i"), 10);
    if (isNaN(idx) || idx < 0) idx = 0;
    var product = null, item = null;
    (products || []).forEach(function (p) {
      if (p.page && p.page.toLowerCase() === cat.toLowerCase()) product = p;
    });
    if (product && product.gallery && product.gallery[idx]) item = product.gallery[idx];
    if (!item) {
      host.innerHTML = '<div class="section"><p>Product not found. <a href="products.html">Back to products</a></p></div>';
      return;
    }
    var categoryName = product && product.name ? product.name : "Product";
    var title = item.title || "Product style";
    document.title = title + " | SinoPouch";

    // 顶部大图：款式主图 + 「详情图片」字段，严格按后台顺序，最多5张
    // 「下方详细描述」里的图只显示在页面下方正文，不进入顶部切换，避免混在一起
    var imgs = [];
    if (item.image && imgs.indexOf(item.image) < 0) imgs.push(item.image);
    (item.detail_images || []).forEach(function (d) {
      var src = d && d.image ? d.image : (typeof d === "string" ? d : "");
      if (src && imgs.indexOf(src) < 0) imgs.push(src);
    });
    imgs = imgs.slice(0, 5);
    var mainSrc = imgs[0] || "";
    var leftHtml = mainSrc
      ? '<div class="sd-media">' +
          '<div class="sd-main"><img class="sd-main-img" src="' + esc(imgv(mainSrc)) + '" alt="' + esc(title) + '"></div>' +
          (imgs.length > 1
            ? '<div class="sd-thumbs">' + imgs.map(function (src, i) {
                return '<button type="button" class="sd-thumb' + (i === 0 ? " is-active" : "") + '" data-src="' + esc(imgv(src)) + '" aria-label="Image ' + (i + 1) + '"><img src="' + esc(imgv(src)) + '" alt=""></button>';
              }).join("") + "</div>"
            : "") +
        "</div>"
      : "";

    var shareUrl = encodeURIComponent(location.href.split("#")[0]);
    var shareText = encodeURIComponent("Check out " + title + " from SinoPouch");
    var shareHtml =
      '<div class="sd-share">' +
        '<a class="sd-share-btn sd-sh-f" href="https://www.facebook.com/sharer/sharer.php?u=' + shareUrl + '" target="_blank" rel="noopener" aria-label="Facebook">f</a>' +
        '<a class="sd-share-btn sd-sh-x" href="https://twitter.com/intent/tweet?url=' + shareUrl + '&text=' + shareText + '" target="_blank" rel="noopener" aria-label="X">X</a>' +
        '<a class="sd-share-btn sd-sh-in" href="https://www.linkedin.com/sharing/share-offsite/?url=' + shareUrl + '" target="_blank" rel="noopener" aria-label="LinkedIn">in</a>' +
        '<a class="sd-share-btn sd-sh-p" href="https://pinterest.com/pin/create/button/?url=' + shareUrl + '" target="_blank" rel="noopener" aria-label="Pinterest">P</a>' +
        '<a class="sd-share-btn sd-sh-wa" href="https://wa.me/?text=' + shareText + '%20' + shareUrl + '" target="_blank" rel="noopener" aria-label="WhatsApp">W</a>' +
      "</div>";

    var rich = item.content || item.details || "";
    var hasOwnTitle = /^\s*#{1,4}\s+\S/m.test(rich);
    var richHtml = rich
      ? '<div class="sd-rich">' + (hasOwnTitle ? "" : '<h4 class="sd-rich-title">Product Introduction</h4>') + md(rich) + "</div>"
      : "";

    var backHref = esc(product && product.page ? product.page : "products.html");
    host.innerHTML =
      '<div class="detail-box">' +
        '<div class="crumb"><a href="index.html">Home</a> / <a href="products.html">Products</a> / <a href="' + backHref + '">' + esc(categoryName) + "</a> / " + esc(title) + "</div>" +
        '<div class="sd-grid">' +
          leftHtml +
          '<div class="style-modal-body">' +
            "<h1>" + esc(title) + "</h1>" +
            (item.desc ? '<p class="style-desc">' + esc(item.desc) + "</p>" : "") +
            '<a href="contact.html?style=' + encodeURIComponent(title) + '" class="btn btn-primary style-modal-cta">Send Inquiry</a>' +
            shareHtml +
          "</div>" +
        "</div>" +
        richHtml +
        '<div class="detail-back"><a href="' + backHref + '">← Back to ' + esc(categoryName) + "</a></div>" +
      "</div>";

    var mainImg = host.querySelector(".sd-main-img");
    host.querySelectorAll(".sd-thumb").forEach(function (t) {
      t.addEventListener("click", function () {
        if (mainImg) mainImg.src = t.getAttribute("data-src");
        host.querySelectorAll(".sd-thumb").forEach(function (x) { x.classList.remove("is-active"); });
        t.classList.add("is-active");
      });
    });
  }

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

  // ---------- 博客：分类映射 / 日期格式 / 列表 / 详情 ----------
  function catName(cats, slug) {
    var found = (cats || []).filter(function (c) { return c.slug === slug; })[0];
    return found ? found.name : (slug || "General");
  }
  function fmtDate(d) {
    if (!d) return "";
    var p = String(d).split("-");
    if (p.length === 3) {
      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var m = months[parseInt(p[1], 10) - 1] || p[1];
      return m + " " + parseInt(p[2], 10) + ", " + p[0];
    }
    return String(d);
  }
  function postHref(post) {
    return 'blog-post.html?s=' + encodeURIComponent(post.slug || "");
  }
  function postThumb(post) {
    if (post.image) {
      return '<img src="' + esc(imgv(post.image)) + '" alt="' + esc(post.title) + '" loading="lazy">';
    }
    // 无封面图时用品牌色 SVG 占位，保证卡片不空
    return '<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="90" fill="#E9F7F1"/>' +
      '<path d="M34 20 L86 20 L90 74 Q90 79 85 79 L35 79 Q30 79 30 74 Z" fill="#fff" stroke="#21A179" stroke-width="2"/>' +
      '<rect x="44" y="36" width="32" height="4" rx="2" fill="#21A179"/>' +
      '<rect x="42" y="46" width="36" height="3" rx="1.5" fill="#b9d3c7"/>' +
      '<rect x="46" y="54" width="28" height="3" rx="1.5" fill="#b9d3c7"/>' +
      '<circle cx="60" cy="66" r="6" fill="#F2A93B"/></svg>';
  }
  function renderBlogList(blog) {
    var grid = document.querySelector("[data-blog-grid]");
    var filters = document.querySelector("[data-blog-filters]");
    if (!blog || !blog.posts) return;
    var cats = blog.categories || [];
    var qs = new URLSearchParams(location.search);
    var active = qs.get("cat") || "all";

    if (filters) {
      var tabs = [{ slug: "all", name: "All Posts" }].concat(cats);
      filters.innerHTML = tabs.map(function (c) {
        var href = c.slug === "all" ? "blog.html" : "blog.html?cat=" + encodeURIComponent(c.slug);
        return '<a href="' + href + '" class="blog-filter' + (active === c.slug ? " is-active" : "") + '">' + esc(c.name) + "</a>";
      }).join("");
    }
    if (!grid) return;
    var posts = blog.posts.filter(function (p) {
      return active === "all" || p.category === active;
    });
    if (!posts.length) {
      grid.innerHTML = '<p style="color:var(--muted)">No articles in this category yet.</p>';
      return;
    }
    grid.innerHTML = posts.map(function (p) {
      return '<a class="blog-card" href="' + postHref(p) + '">' +
        '<div class="blog-card-media">' + postThumb(p) + "</div>" +
        '<div class="blog-card-body">' +
          '<div class="blog-meta"><span class="blog-cat">' + esc(catName(cats, p.category)) + "</span>" +
          '<span class="blog-date">' + esc(fmtDate(p.date)) + "</span></div>" +
          "<h3>" + esc(p.title) + "</h3>" +
          "<p>" + esc(p.excerpt) + "</p>" +
          '<span class="blog-read">Read More <span aria-hidden="true">→</span></span>' +
        "</div>" +
      "</a>";
    }).join("");
  }
  function renderBlogNavDropdown(blog) {
    var host = document.querySelector("[data-nav-blog]");
    if (!host || !blog) return;
    var cats = blog.categories || [];
    var items = [{ slug: "all", name: "All Posts" }].concat(cats).map(function (c) {
      var href = c.slug === "all" ? "blog.html" : "blog.html?cat=" + encodeURIComponent(c.slug);
      return '<li><a href="' + href + '">' + esc(c.name) + "</a></li>";
    }).join("");
    var menu = document.createElement("div");
    menu.className = "nav-dropdown blog-nav-dropdown";
    menu.innerHTML = '<div class="nav-dropdown-inner" style="--dd-cols:1"><ul>' + items + "</ul></div>";
    host.parentNode.classList.add("nav-blog-parent");
    host.parentNode.appendChild(menu);
  }

  function renderBlogPost(blog) {
    var host = document.getElementById("blogPostContent");
    if (!host || !blog || !blog.posts) return;
    var qs = new URLSearchParams(location.search);
    var slug = qs.get("s") || "";
    var post = blog.posts.filter(function (p) { return p.slug === slug; })[0];
    if (!post) {
      host.innerHTML = '<div class="detail-box" style="padding:40px"><p>Article not found. <a href="blog.html">Back to blog</a></p></div>';
      return;
    }
    var cats = blog.categories || [];
    document.title = post.title + " | SinoPouch Blog";
    var desc = document.querySelector('meta[name="description"]');
    if (desc && post.excerpt) desc.setAttribute("content", post.excerpt);
    var shareUrl = encodeURIComponent(location.href.split("#")[0]);
    var shareText = encodeURIComponent(post.title + " — SinoPouch Blog");
    var shareHtml =
      '<div class="sd-share">' +
        '<a class="sd-share-btn sd-sh-f" href="https://www.facebook.com/sharer/sharer.php?u=' + shareUrl + '" target="_blank" rel="noopener" aria-label="Facebook">f</a>' +
        '<a class="sd-share-btn sd-sh-x" href="https://twitter.com/intent/tweet?url=' + shareUrl + '&text=' + shareText + '" target="_blank" rel="noopener" aria-label="X">X</a>' +
        '<a class="sd-share-btn sd-sh-in" href="https://www.linkedin.com/sharing/share-offsite/?url=' + shareUrl + '" target="_blank" rel="noopener" aria-label="LinkedIn">in</a>' +
        '<a class="sd-share-btn sd-sh-wa" href="https://wa.me/?text=' + shareText + '%20' + shareUrl + '" target="_blank" rel="noopener" aria-label="WhatsApp">W</a>' +
      "</div>";
    var cover = post.image
      ? '<div class="blog-post-cover"><img src="' + esc(imgv(post.image)) + '" alt="' + esc(post.title) + '"></div>'
      : "";
    host.innerHTML =
      '<div class="detail-box blog-post-box">' +
        '<div class="crumb"><a href="index.html">Home</a> / <a href="blog.html">Blog</a> / ' + esc(catName(cats, post.category)) + "</div>" +
        '<article class="blog-post-wrap">' +
          '<div class="blog-post-head">' +
            '<div class="blog-meta"><span class="blog-cat">' + esc(catName(cats, post.category)) + "</span>" +
            '<span class="blog-date">' + esc(fmtDate(post.date)) + "</span></div>" +
            "<h1>" + esc(post.title) + "</h1>" +
            (post.excerpt ? '<p class="blog-post-lead">' + esc(post.excerpt) + "</p>" : "") +
          "</div>" +
          cover +
          '<div class="blog-post-rich">' + md(post.content) + "</div>" +
          shareHtml +
        "</article>" +
        '<div class="detail-back"><a href="blog.html">← Back to all articles</a></div>' +
      "</div>";
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
      renderProductDetail(cache.products.products);
      renderNavDropdown(cache.products.products);
    })
    .catch(function (e) {
      console.warn("SinoPouch data load skipped:", e.message);
    });

  // 博客数据独立加载：即使 blog.json 缺失或出错，也不影响主站其它内容
  load("blog")
    .then(function (b) {
      cache.blog = b;
      renderBlogNavDropdown(cache.blog);
      renderBlogList(cache.blog);
      renderBlogPost(cache.blog);
    })
    .catch(function (e) {
      console.warn("SinoPouch blog load skipped:", e.message);
    });
})();
