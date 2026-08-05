/* =============================================================================
   SKILL WEB — Tech Arsenal as a Souls-style constellation.
   Nodes connected by gold lines; click a node to read what was built with it.
   Data comes from PORTFOLIO.arsenal (+ optional PORTFOLIO.arsenalNotes).
============================================================================= */
(function () {
  window.SkillWeb = { init };

  function init() {
    const P = window.PORTFOLIO;
    const host = document.getElementById("skill-web");
    const detail = document.getElementById("skill-detail");
    if (!host || !P) return;

    const items = P.arsenal;
    const notes = P.arsenalNotes || {};
    const W = 1000, H = 420;

    // Deterministic constellation layout: nodes along two interleaved waves.
    const pts = items.map((name, i) => {
      const x = 70 + (i / (items.length - 1)) * (W - 140);
      const wave = Math.sin(i * 1.35) * 105;
      const y = H / 2 + wave + (i % 2 ? 48 : -48) * Math.sin(i * 0.7 + 2);
      return { name, x, y: Math.max(52, Math.min(H - 64, y)) };
    });

    // Edges: chain neighbors + a few long cross-links for the "web" look.
    const edges = [];
    for (let i = 0; i < pts.length - 1; i++) edges.push([i, i + 1]);
    for (let i = 0; i < pts.length - 3; i += 3) edges.push([i, i + 3]);
    edges.push([1, 5], [4, 9]);

    const lines = edges
      .filter(([a, b]) => pts[a] && pts[b])
      .map(([a, b]) =>
        `<line class="sw-line" x1="${pts[a].x}" y1="${pts[a].y}" x2="${pts[b].x}" y2="${pts[b].y}"/>`
      ).join("");

    const nodes = pts.map((p, i) => `
      <g class="skill-node" data-i="${i}" transform="translate(${p.x}, ${p.y})" tabindex="0"
         role="button" aria-label="${esc(p.name)}">
        <circle class="sw-halo" r="16"/>
        <circle class="sw-core" r="5.5"/>
        <text class="sw-label" y="${i % 2 ? 34 : -24}" text-anchor="middle">${esc(p.name)}</text>
      </g>`).join("");

    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
        aria-label="Tech arsenal skill web">${lines}${nodes}</svg>`;

    function select(i) {
      const name = items[i];
      host.querySelectorAll(".skill-node").forEach((n) => n.classList.toggle("active", +n.dataset.i === i));
      if (detail) {
        detail.innerHTML = `<b>${esc(name)}</b><span>${esc(notes[name] || "Part of the day-to-day toolkit.")}</span>`;
        detail.classList.add("show");
      }
      if (window.SFX) SFX.play("confirm");
    }

    host.addEventListener("click", (e) => {
      const n = e.target.closest(".skill-node");
      if (n) select(+n.dataset.i);
    });
    host.addEventListener("keydown", (e) => {
      const n = e.target.closest(".skill-node");
      if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); select(+n.dataset.i); }
    });

    select(0); // start with the first node highlighted
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
})();
