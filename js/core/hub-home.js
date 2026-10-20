(function () {
  "use strict";
  var KEY = "rohub-live-ui";
  var stage = document.getElementById("hub-stage");
  if (!stage) return;

  var defaults = {
    kicker: "ĐỀ XUẤT CHO BẠN",
    title: "Đang mở. Đang đọc. Đang chờ.",
    subtitle: "Truyện tranh và truyện chữ luân phiên, giống rạp đề xuất của RoFlix.",
    cta: "Đọc ngay",
    interval: 5600,
    accent: "#f59e0b",
    accent2: "#8b5cf6",
    background: "#080b14",
    card: "#111827",
    text: "#f7f8fc",
    radius: 26,
    showComics: true,
    showNovels: true
  };

  function readLocal() {
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (_) { return Object.assign({}, defaults); }
  }

  function hex(v, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(v || "")) ? v : fallback;
  }

  function applyLook(cfg) {
    var root = document.documentElement;
    root.style.setProperty("--bg", hex(cfg.background, defaults.background));
    root.style.setProperty("--panel", hex(cfg.card, defaults.card));
    root.style.setProperty("--text", hex(cfg.text, defaults.text));
    root.style.setProperty("--accent", hex(cfg.accent, defaults.accent));
    root.style.setProperty("--accent2", hex(cfg.accent2, defaults.accent2));
    root.style.setProperty("--radius", (Number(cfg.radius) || 26) + "px");
    var intro = document.querySelector(".intro h1");
    var sub = document.querySelector(".intro p");
    var eye = document.querySelector(".intro .eyebrow");
    if (eye && cfg.kicker) eye.textContent = cfg.kicker;
    if (intro && cfg.title) intro.textContent = cfg.title;
    if (sub && cfg.subtitle) sub.textContent = cfg.subtitle;
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&", "<": "<", ">": ">", '"': """ }[c];
    });
  }

  function titleOf(m) {
    var t = (m.attributes && m.attributes.title) || {};
    var alts = m.attributes && m.attributes.altTitles || [];
    var vi = alts.map(function (a) { return a.vi; }).filter(Boolean)[0];
    return vi || t.vi || t.en || t["ja-ro"] || Object.values(t)[0] || "Không tên";
  }

  function coverOf(m) {
    var rel = (m.relationships || []).filter(function (r) { return r.type === "cover_art"; })[0];
    var file = rel && rel.attributes && rel.attributes.fileName;
    return file ? "https://uploads.mangadex.org/covers/" + m.id + "/" + file + ".512.jpg" : "";
  }

  async function loadSlides(cfg) {
    var slides = [];
    if (cfg.showComics !== false) {
      var q = new URLSearchParams();
      q.set("limit", "16");
      q.append("includes[]", "cover_art");
      q.append("order[followedCount]", "desc");
      q.append("availableTranslatedLanguage[]", "vi");
      q.append("contentRating[]", "safe");
      q.append("contentRating[]", "suggestive");
      var res = await fetch("/api/mangadex/manga?" + q.toString());
      if (res.ok) {
        var body = await res.json();
        (body.data || []).forEach(function (m) {
          var cover = coverOf(m);
          if (!cover) return;
          slides.push({
            kind: "Truyện tranh",
            title: titleOf(m),
            cover: cover,
            href: "rotruyen.html#manga=" + encodeURIComponent(m.id)
          });
        });
      }
    }
    if (cfg.showNovels !== false) {
      var nv = await fetch("/api/truyenviet");
      if (nv.ok) {
        var novels = await nv.json();
        (novels.items || []).slice(0, 8).forEach(function (it) {
          if (!it.cover || !it.title) return;
          slides.push({
            kind: it.kind || "Truyện chữ",
            title: it.title,
            cover: it.cover,
            href: it.externalUrl || "rotruyen.html"
          });
        });
      }
    }
    var mixed = [];
    var comics = slides.filter(function (s) { return s.kind === "Truyện tranh"; });
    var books = slides.filter(function (s) { return s.kind !== "Truyện tranh"; });
    var n = Math.max(comics.length, books.length);
    for (var i = 0; i < n; i++) {
      if (comics[i]) mixed.push(comics[i]);
      if (books[i]) mixed.push(books[i]);
    }
    return mixed.slice(0, 18);
  }

  function mount(slides, cfg) {
    if (!slides.length) {
      stage.innerHTML = "<p class='hub-empty'>Chưa lấy được truyện đề xuất. Thử tải lại.</p>";
      return;
    }
    var i = 0;
    var timer = null;
    stage.innerHTML =
      "<article class='hub-hero'>" +
      "<a class='hub-hero-link' id='hub-hero-link' href='#'>" +
      "<img id='hub-hero-img' alt=''>" +
      "<div class='hub-hero-copy'><span id='hub-hero-kind'></span><h2 id='hub-hero-title'></h2><b id='hub-hero-cta'></b></div>" +
      "</a><div class='hub-progress'><i id='hub-bar'></i></div></article>" +
      "<div class='hub-rail' id='hub-rail'></div>";
    var img = document.getElementById("hub-hero-img");
    var link = document.getElementById("hub-hero-link");
    var kind = document.getElementById("hub-hero-kind");
    var title = document.getElementById("hub-hero-title");
    var cta = document.getElementById("hub-hero-cta");
    var bar = document.getElementById("hub-bar");
    var rail = document.getElementById("hub-rail");
    cta.textContent = cfg.cta || defaults.cta;

    function show(next) {
      i = (next + slides.length) % slides.length;
      var s = slides[i];
      img.src = s.cover;
      link.href = s.href;
      if (!/^https?:/i.test(s.href) && s.href.indexOf("rotruyen") !== 0) link.target = "_blank";
      else if (/^https?:/i.test(s.href)) { link.target = "_blank"; link.rel = "noopener"; }
      else link.removeAttribute("target");
      kind.textContent = s.kind;
      title.textContent = s.title;
      bar.style.animation = "none";
      void bar.offsetWidth;
      bar.style.animation = "hubbar " + (Number(cfg.interval) || 5600) + "ms linear";
      rail.querySelectorAll("button").forEach(function (b, idx) {
        b.classList.toggle("on", idx === i);
      });
    }

    rail.innerHTML = slides.map(function (s, idx) {
      return "<button type='button' data-i='" + idx + "'><img src='" + esc(s.cover) + "' alt=''><span>" + esc(s.title) + "</span></button>";
    }).join("");
    rail.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      show(Number(b.dataset.i));
      start();
    });

    function start() {
      clearInterval(timer);
      timer = setInterval(function () { show(i + 1); }, Number(cfg.interval) || 5600);
    }
    stage.addEventListener("mouseenter", function () { clearInterval(timer); });
    stage.addEventListener("mouseleave", start);
    show(0);
    start();
  }

  async function boot() {
    var cfg = readLocal();
    applyLook(cfg);
    try {
      var sb = window.rfSupabase;
      if (sb) {
        var res = await sb.from("rohub_theme_versions").select("config,target,version_number").eq("status", "published").in("target", ["both", "roflix"]).order("version_number", { ascending: false }).limit(8);
        var row = (res.data || [])[0];
        if (row && row.config) {
          cfg = Object.assign({}, cfg, row.config.home || {}, {
            accent: row.config.accent || cfg.accent,
            background: row.config.background || cfg.background,
            card: row.config.card || cfg.card,
            radius: row.config.radius || cfg.radius
          });
          applyLook(cfg);
        }
      }
    } catch (_) {}
    try { mount(await loadSlides(cfg), cfg); }
    catch (err) { stage.innerHTML = "<p class='hub-empty'>Không tải được đề xuất.</p>"; }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.rohubSaveLiveUi = function (partial) {
    var next = Object.assign(readLocal(), partial || {});
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  };
})();
