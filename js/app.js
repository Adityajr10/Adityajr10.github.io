/* =============================================================================
   APP — renders everything from window.PORTFOLIO, wires scroll + interactions.
   Libraries (loaded via CDN in index.html): GSAP, ScrollTrigger, Lenis, VanillaTilt.
   All are optional at runtime — the site still works if a CDN fails.
============================================================================= */
(function () {
  const P = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const projPath = (slug, file) => encodeURI(`projects/${slug}/${file}`);

  // Merge the auto-generated media manifest (js/media-manifest.js, built by
  // update-media.ps1) over data.js — whatever files actually exist on disk win.
  const MANIFEST = window.MEDIA_MANIFEST || {};
  function applyManifest(slug, media) {
    const m = MANIFEST[slug];
    if (!m) return media;
    return {
      cover: m.cover || media.cover,
      photos: (m.photos && m.photos.length) ? m.photos : media.photos,
      videos: (m.videos && m.videos.length) ? m.videos : media.videos,
      shorts: (m.shorts && m.shorts.length) ? m.shorts : media.shorts,
    };
  }
  P.featured.media = applyManifest(P.featured.slug, P.featured.media);
  P.projects.forEach((p) => { p.media = applyManifest(p.slug, p.media); });

  // The flagship also appears in the grid — derived from `featured`, no duplication in data.js.
  const featuredCard = {
    slug: P.featured.slug,
    title: P.featured.title,
    tags: ["Unreal"],
    metaTags: ["Unreal 5", "C++", "Souls-like"],
    badge: "FLAGSHIP",
    blurb: P.featured.tagline,
    body: P.featured.description || "",
    systems: P.featured.systems,
    youtube: P.featured.youtube,
    media: P.featured.media,
  };
  const ALL_PROJECTS = [featuredCard, ...P.projects];

  document.addEventListener("DOMContentLoaded", () => {
    renderHero();
    renderFeatured();
    renderGrid();
    renderArsenal();
    renderAbout();
    renderTimeline();
    renderFooter();
    initSmoothScroll();
    initScrollEffects();
    initFilters();
    initModal();
    initBossBar();
    initToasts();
  });

  /* --------------------------------------------------------------- HERO */
  function renderHero() {
    $("#hero-name").textContent = P.owner.name;
    $("#hero-sub").textContent = `${P.owner.role} — ${P.owner.subtitle}`;
    $("#platform-badges").innerHTML = P.owner.platforms
      .map((p) => `<span class="badge">${p}</span>`).join("");
    $("#resume-btn").href = P.owner.resume;
    $("#resume-btn-2").href = P.owner.resume;
  }

  /* ----------------------------------------------------------- FEATURED */
  function renderFeatured() {
    const f = P.featured;
    $("#tlb-kicker").textContent = f.kicker;
    $("#tlb-title").textContent = f.title;
    $("#tlb-tagline").textContent = f.tagline;
    $("#tlb-meta").textContent = f.meta;

    // Pinned media panel: prefer YouTube, else local video, else photo, else placeholder.
    const stage = $("#tlb-stage");
    stage.innerHTML = mediaHero(f.slug, f.media, f.youtube, f.title);

    // Shorts strip (0.4–0.6s autoplay micro-clips)
    $("#tlb-shorts").innerHTML = shortsRow(f.slug, f.media.shorts);

    // System panels
    $("#tlb-systems").innerHTML = f.systems.map((s, i) => `
      <article class="system-panel reveal">
        <span class="system-index">0${i + 1}</span>
        <h3>${s.name}</h3>
        <p>${s.body}</p>
      </article>`).join("");
  }

  /* --------------------------------------------------------------- GRID */
  function renderGrid() {
    $("#project-grid").innerHTML = ALL_PROJECTS.map(cardHTML).join("");
    // Hover: swap cover -> first short micro-clip if one exists.
    $$(".card").forEach((card) => {
      const slug = card.dataset.slug;
      const p = ALL_PROJECTS.find((x) => x.slug === slug);
      const short = p.media.shorts && p.media.shorts[0];
      if (!short) return;
      const media = $(".card-media", card);
      let vid;
      card.addEventListener("mouseenter", () => {
        if (vid) { vid.play().catch(() => {}); return; }
        vid = document.createElement("video");
        vid.src = projPath(slug, short);
        vid.muted = true; vid.loop = true; vid.playsInline = true;
        vid.className = "card-short";
        vid.addEventListener("error", () => vid.remove());
        media.appendChild(vid);
        vid.play().catch(() => {});
      });
      card.addEventListener("mouseleave", () => { if (vid) { vid.pause(); } });
    });

    if (window.VanillaTilt) {
      VanillaTilt.init($$(".card"), { max: 6, speed: 400, glare: true, "max-glare": 0.15, scale: 1.02 });
    }
  }

  function cardHTML(p) {
    const badge = p.badge ? `<span class="card-badge">${p.badge}</span>` : "";
    const tags = (p.metaTags || p.tags).map((t) => `<span class="tag">${t}</span>`).join("");
    return `
      <button class="card reveal" data-slug="${p.slug}" data-tags="${p.tags.join(",")}"
              aria-label="Open ${escapeAttr(p.title)}">
        <div class="card-media">
          ${coverImg(p.slug, p.media.cover, p.title)}
          ${badge}
          <span class="card-open">VIEW ▸</span>
        </div>
        <div class="card-body">
          <h3>${p.title}</h3>
          <p>${p.blurb}</p>
          <div class="tag-row">${tags}</div>
        </div>
      </button>`;
  }

  /* -------------------------------------------------------------- FILTERS */
  function initFilters() {
    const filters = ["All", "Unreal", "Vulkan/C++", "Raylib/SFML", "VR/AR", "Mobile", "PS5"];
    $("#filters").innerHTML = filters.map((f, i) =>
      `<button class="pill ${i === 0 ? "active" : ""}" data-filter="${f}">${f}</button>`).join("");

    $$(".pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        $$(".pill").forEach((x) => x.classList.remove("active"));
        pill.classList.add("active");
        const f = pill.dataset.filter;
        $$(".card").forEach((card) => {
          const show = f === "All" || card.dataset.tags.split(",").includes(f);
          card.classList.toggle("hidden", !show);
        });
        if (window.gsap) {
          gsap.fromTo($$(".card:not(.hidden)"),
            { opacity: 0, y: 24, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.04, ease: "power2.out" });
        }
      });
    });
  }

  /* --------------------------------------------------------------- MODAL */
  function initModal() {
    const modal = $("#modal");
    const body = $("#modal-body");
    let lastFocus = null;

    function open(slug) {
      const p = ALL_PROJECTS.find((x) => x.slug === slug);
      if (!p) return;
      lastFocus = document.activeElement;
      if (window.SFX) SFX.play("confirm");
      areaReveal(p.title); // "AREA DISCOVERED" wipe
      body.innerHTML = modalHTML(p);
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop(); // let the project page scroll natively
      $(".modal-panel", modal).scrollTop = 0;
      $(".modal-close", modal).focus();
      autoplayShorts(body);
    }

    function areaReveal(title) {
      const el = $("#area-reveal");
      if (!el) return;
      $(".area-reveal-title", el).textContent = title;
      el.classList.remove("show");
      void el.offsetWidth; // restart the animation
      el.classList.add("show");
      clearTimeout(areaReveal._t);
      areaReveal._t = setTimeout(() => el.classList.remove("show"), 2000);
    }
    function close() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lenis) lenis.start();
      body.innerHTML = "";
      if (lastFocus) lastFocus.focus();
    }

    window.__openProject = open; // used by the Roundtable Hold hub

    document.addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (card) { open(card.dataset.slug); return; }
      if (e.target.closest(".modal-close") || e.target.classList.contains("modal-backdrop")) close();
      const yt = e.target.closest("[data-yt]");
      if (yt) loadYouTube(yt);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });
  }

  function modalHTML(p) {
    const tags = (p.metaTags || p.tags).map((t) => `<span class="tag">${t}</span>`).join("");
    const badge = p.badge ? `<span class="card-badge inline">${p.badge}</span>` : "";
    const layout = p.layout || P.detailLayout || "magazine";

    // --- text blocks (description paragraph + system panels) ---
    const blocks = [];
    if (p.body) blocks.push(`<p class="flow-para">${p.body}</p>`);
    (p.systems || []).forEach((s, i) => blocks.push(`
      <article class="system-panel">
        <span class="system-index">0${i + 1}</span>
        <h3>${s.name}</h3>
        <p>${s.body}</p>
      </article>`));

    // --- media items woven into the flow (shorts strip first, then photos) ---
    const items = [];
    if (p.media.shorts && p.media.shorts.length) {
      items.push({ kind: "shorts", html: `<div class="flow-shorts">${shortsRow(p.slug, p.media.shorts)}</div>` });
    }
    (p.media.photos || []).forEach((ph) => items.push({
      kind: "photo",
      html: `<img class="flow-photo" src="${projPath(p.slug, ph)}" alt="${escapeAttr(p.title)}" loading="lazy"
               onerror="this.replaceWith(window.__ph('${escapeAttr(p.title)}'))">`,
    }));

    // --- weave text + media according to the chosen layout mode ---
    let flow = "";
    let used = 0;
    let tail = "";

    if (layout === "classic") {
      // The original style: all text first, media collected at the bottom.
      flow = blocks.join("");
      used = items.length;
      const sh = (p.media.shorts && p.media.shorts.length)
        ? `<div class="shorts-block"><h4>Moments</h4><div class="flow-shorts">${shortsRow(p.slug, p.media.shorts)}</div></div>` : "";
      tail = sh + galleryBlock(p.slug, p.media.photos, p.title);

    } else if (layout === "mosaic") {
      // All text first, then every photo + short in one collage wall.
      flow = blocks.join("");
      used = items.length;
      const tiles = [
        ...(p.media.shorts || []).map((s) =>
          `<video class="tile" src="${projPath(p.slug, s)}" muted loop autoplay playsinline onerror="this.remove()"></video>`),
        ...(p.media.photos || []).map((ph) =>
          `<img class="tile" src="${projPath(p.slug, ph)}" alt="${escapeAttr(p.title)}" loading="lazy" onerror="this.remove()">`),
      ];
      tail = tiles.length ? `<div class="mosaic-grid">${tiles.join("")}</div>` : "";

    } else if (layout === "side") {
      // Two equal columns, media alternating left/right.
      blocks.forEach((b, i) => {
        const m = items[used];
        if (m) {
          used++;
          flow += `<div class="detail-row ${i % 2 ? "flip" : ""}">
                     <div class="detail-text">${b}</div>
                     <div class="detail-media">${m.html}</div>
                   </div>`;
        } else {
          flow += `<div class="detail-row solo"><div class="detail-text">${b}</div></div>`;
        }
      });

    } else if (layout === "rails") {
      // Text stays centered; media sits in the empty side margins, alternating.
      blocks.forEach((b, i) => {
        const m = items[used];
        if (m) used++;
        const left = (m && i % 2 === 0) ? m.html : "";
        const right = (m && i % 2 === 1) ? m.html : "";
        flow += `<div class="rail-row">
                   <div class="rail">${left}</div>
                   <div class="rail-text">${b}</div>
                   <div class="rail">${right}</div>
                 </div>`;
      });

    } else if (layout === "cinema") {
      // Full-bleed media banners between text blocks.
      blocks.forEach((b) => {
        flow += b;
        const m = items[used];
        if (m) { used++; flow += `<div class="flow-banner">${m.html}</div>`; }
      });

    } else { // magazine (default)
      blocks.forEach((b) => {
        flow += b;
        const m = items[used];
        if (m) { used++; flow += m.html; }
      });
    }

    // --- whatever wasn't woven in lands at the bottom ---
    const leftover = items.slice(used);
    const extraShorts = leftover.filter((m) => m.kind === "shorts").map((m) => m.html).join("");
    const extraPhotos = leftover.filter((m) => m.kind === "photo").map((m) => m.html).join("");

    return `
      <div class="modal-hero">${mediaHero(p.slug, p.media, p.youtube, p.title)}</div>
      <div class="modal-text layout-${layout}">
        <h2>${p.title} ${badge}</h2>
        <div class="tag-row">${tags}</div>
        <div class="detail-flow">${flow}</div>
        ${extraShorts ? `<div class="shorts-block"><h4>Moments</h4>${extraShorts}</div>` : ""}
        ${extraPhotos ? `<div class="gallery"><h4>Gallery</h4><div class="gallery-grid">${extraPhotos}</div></div>` : ""}
        ${tail}
      </div>`;
  }

  /* ------------------------------------------------------------- ARSENAL */
  function renderArsenal() {
    // Souls-style skill web (skillweb.js); marquee kept as fallback.
    if (window.SkillWeb && $("#skill-web")) { window.SkillWeb.init(); return; }
    const track = $("#arsenal-track");
    if (track) {
      const row = P.arsenal.map((t) => `<span>${t}</span>`).join("<i>◆</i>");
      track.innerHTML = row + "<i>◆</i>" + row;
    }
  }

  /* --------------------------------------------------------------- ABOUT */
  function renderAbout() {
    $("#stat-bars").innerHTML = P.stats.map((s) => `
      <div class="stat reveal">
        <div class="stat-head"><span>${s.label}</span><span class="stat-val">${s.value}</span></div>
        <div class="stat-track"><div class="stat-fill" data-val="${s.value}"></div></div>
      </div>`).join("");
    $("#counters").innerHTML = P.counters.map((c) => `
      <div class="counter reveal">
        <div class="counter-num" data-target="${c.value}" data-suffix="${c.suffix}">0</div>
        <div class="counter-label">${c.label}</div>
      </div>`).join("");
  }

  /* ------------------------------------------------------------ TIMELINE */
  function renderTimeline() {
    $("#timeline").innerHTML = P.timeline.map((t) => `
      <div class="tl-item reveal">
        <span class="tl-dot"></span>
        <div class="tl-card">
          <span class="tl-period">${t.period}</span>
          <h3>${t.company}</h3>
          <h4>${t.role}</h4>
          <p>${t.body}</p>
        </div>
      </div>`).join("");
  }

  /* -------------------------------------------------------------- FOOTER */
  function renderFooter() {
    $("#foot-email").href = `mailto:${P.owner.email}`;
    $("#foot-email").textContent = P.owner.email;
    $("#foot-linkedin").href = P.owner.linkedin;
    $("#foot-github").href = P.owner.github;
    $("#foot-resume").href = P.owner.resume;
    $("#year").textContent = "";
  }

  /* -------------------------------------------------- MEDIA BUILDERS */
  function coverImg(slug, cover, title) {
    if (!cover) return placeholder(title);
    return `<img src="${projPath(slug, cover)}" alt="${escapeAttr(title)}" loading="lazy"
             onerror="this.replaceWith(window.__ph('${escapeAttr(title)}'))">`;
  }

  function mediaHero(slug, media, youtube, title) {
    if (youtube) {
      return `<div class="yt" data-yt="${youtube}">
        <img src="https://i.ytimg.com/vi/${youtube}/hqdefault.jpg" alt="${escapeAttr(title)}" loading="lazy">
        <span class="yt-play">▶</span></div>`;
    }
    if (media.videos && media.videos[0]) {
      return `<video src="${projPath(slug, media.videos[0])}" muted loop playsinline controls
                poster="${media.cover ? projPath(slug, media.cover) : ""}"
                onerror="this.replaceWith(window.__ph('${escapeAttr(title)}'))"></video>`;
    }
    if (media.cover) return coverImg(slug, media.cover, title);
    if (media.photos && media.photos[0]) return coverImg(slug, media.photos[0], title);
    return placeholder(title);
  }

  function shortsRow(slug, shorts) {
    if (!shorts || !shorts.length) return "";
    return shorts.map((s) => `
      <video class="short" src="${projPath(slug, s)}" muted loop autoplay playsinline
             onerror="this.remove()"></video>`).join("");
  }

  function shortsBlock(slug, shorts) {
    if (!shorts || !shorts.length) return "";
    return `<div class="shorts-block"><h4>Moments</h4>
      <div class="shorts-strip">${shortsRow(slug, shorts)}</div></div>`;
  }

  function galleryBlock(slug, photos, title) {
    if (!photos || !photos.length) return "";
    const imgs = photos.map((ph) => `
      <img src="${projPath(slug, ph)}" alt="${escapeAttr(title)}" loading="lazy"
           onerror="this.replaceWith(window.__ph('${escapeAttr(title)}'))">`).join("");
    return `<div class="gallery"><h4>Gallery</h4><div class="gallery-grid">${imgs}</div></div>`;
  }

  function autoplayShorts(scope) {
    $$("video.short, video.tile", scope).forEach((v) => v.play().catch(() => {}));
  }

  function loadYouTube(el) {
    const id = el.dataset.yt;
    el.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0"
      title="YouTube video" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  }

  function placeholder(title) {
    const d = document.createElement("div");
    d.className = "placeholder";
    d.innerHTML = `<span>${title}</span>`;
    return d;
  }
  // exposed for inline onerror handlers
  window.__ph = (title) => placeholder(title);

  /* --------------------------------------------------- SMOOTH SCROLL */
  let lenis = null; // Lenis removed — native wheel scrolling must always just work
  function initSmoothScroll() {
    $$('[data-scroll]').forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = $(a.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }

  /* --------------------------------------------------- SCROLL EFFECTS */
  function initScrollEffects() {
    if (!window.gsap) { $$(".reveal").forEach((e) => e.classList.add("in")); return; }
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Generic reveals
    $$(".reveal").forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });

    // Section title reveals (letter-spacing expands like a Souls area name)
    $$(".area-title").forEach((el) => {
      gsap.fromTo(el, { opacity: 0, letterSpacing: "0.02em" }, {
        opacity: 1, letterSpacing: "0.28em", duration: 1.2, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 82%" },
      });
    });

    // Pin the featured media while system panels scroll (desktop only)
    if (window.ScrollTrigger && !reduced && window.innerWidth > 900) {
      ScrollTrigger.create({
        trigger: "#tlb-section",
        start: "top top",
        end: "bottom bottom",
        pin: "#tlb-pin",
        pinSpacing: false,
      });
    }

    // Stat bars fill on scroll
    $$(".stat-fill").forEach((bar) => {
      gsap.to(bar, {
        width: bar.dataset.val + "%", duration: 1.4, ease: "power2.out",
        scrollTrigger: { trigger: bar, start: "top 90%" },
      });
    });

    // Counters
    $$(".counter-num").forEach((el) => {
      const target = +el.dataset.target;
      const suffix = el.dataset.suffix || "";
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 2, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
        onUpdate: () => { el.textContent = Math.floor(obj.v).toLocaleString() + suffix; },
      });
    });
  }

  /* ---------------------------------------------------- BOSS HEALTH BAR */
  function initBossBar() {
    const fill = $("#boss-fill");
    if (!fill) return;
    const update = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      fill.style.width = Math.max(0, Math.min(1, p)) * 100 + "%";
    };
    window.addEventListener("scroll", update, { passive: true });
    if (lenis) lenis.on("scroll", update);
    update();
  }

  /* ------------------------------------------------------------ TOASTS */
  function initToasts() {
    if (!window.ScrollTrigger) return;
    const fired = new Set(); // in-memory only, per spec — no localStorage
    const toasts = [
      { sel: "#tlb-section", text: "Rune Acquired — The Last Blood" },
      { sel: "#grid-section", text: "New Area — The Armory" },
      { sel: "#about-section", text: "Character Sheet Unlocked" },
      { sel: "#footer", text: "All Regions Explored" },
    ];
    toasts.forEach((t) => {
      const el = $(t.sel);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el, start: "top 60%",
        onEnter: () => { if (!fired.has(t.sel)) { fired.add(t.sel); toast(t.text); } },
      });
    });
  }
  window.__toast = toast; // used by the Roundtable Hold hub
  function toast(text) {
    if (window.SFX) SFX.play("chime");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="toast-icon">◆</span><span>${text}</span>`;
    $("#toast-stack").appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); }, 3600);
  }

  /* ------------------------------------------------------------- UTIL */
  function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }
})();
