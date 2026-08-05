/* =============================================================================
   HERO — Interactive Three.js bonfire.
   A sword planted in a mound of glowing coals; fire + smoke + ember particles,
   flickering firelight, mouse-orbit parallax. Hover the sword: it glows and a
   "REST" prompt appears. Click: rest sound + scroll into the work.
   Degrades: WebGL fail -> 2D ember canvas. Reduced motion -> static frame.
============================================================================= */
(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (window.THREE && hasWebGL()) {
    try { initBonfire(); return; } catch (e) { /* fall through */ }
  }
  init2D();

  /* soft round sprite so particles don't render as squares */
  var dotTex = null; // var: hoisted — softDot() runs before this line executes
  function softDot() {
    const THREE = window.THREE;
    if (dotTex) return dotTex;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    dotTex = new THREE.CanvasTexture(c);
    return dotTex;
  }

  /* ================================================================ BONFIRE */
  function initBonfire() {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.set(0, 1.1, 8);

    const EMBER = 0xff6b35, COAL = 0xff3b10, GOLD = 0xc9a961;

    /* ---- lighting ---- */
    scene.add(new THREE.AmbientLight(0x1a1418, 1.2));
    const fire = new THREE.PointLight(EMBER, 2.2, 30, 1.6);
    fire.position.set(0, -0.4, 0.6);
    scene.add(fire);
    const rim = new THREE.DirectionalLight(0x30364a, 0.7); // cold moon rim
    rim.position.set(-4, 6, -6);
    scene.add(rim);

    /* ---- ground: stone disc + gold rune ring ---- */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(16, 48),
      new THREE.MeshLambertMaterial({ color: 0x151218 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.55;
    scene.add(ground);
    const runeRing = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 2.72, 64),
      new THREE.MeshBasicMaterial({ color: 0xc9a961, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
    );
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = -1.53;
    scene.add(runeRing);

    /* ---- night sky: stars behind everything ---- */
    const starN = 260, starPos = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.8);
      const R = 70;
      starPos[i * 3] = R * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = R * Math.cos(ph) - 4;
      starPos[i * 3 + 2] = -Math.abs(R * Math.sin(ph) * Math.sin(th)) - 6; // behind the fire
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xcfd4ea, size: 0.32, transparent: true, opacity: 0.75, sizeAttenuation: true,
    })));

    /* ---- warm glow halo behind the bonfire ---- */
    const glowTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(128, 128, 6, 128, 128, 128);
      g.addColorStop(0, "rgba(255,140,60,0.55)");
      g.addColorStop(0.5, "rgba(255,90,30,0.16)");
      g.addColorStop(1, "rgba(255,80,20,0)");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    fireGlow.position.set(0, -0.5, -0.5);
    fireGlow.scale.set(9, 9, 1);
    scene.add(fireGlow);

    /* ---- drifting ground mist ---- */
    const mistTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
      g.addColorStop(0, "rgba(190,195,220,0.4)");
      g.addColorStop(1, "rgba(190,195,220,0)");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    const mists = [];
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mistTex, transparent: true, opacity: 0.08, depthWrite: false,
      }));
      sp.position.set((i - 1.5) * 4.2, -1.1, -1 - (i % 2) * 2);
      sp.scale.set(8 + (i % 2) * 3, 2.6, 1);
      scene.add(sp);
      mists.push({ sp, ph: i * 2.1 });
    }

    /* ---- medieval set dressing: ruins flanking the fire (KayKit CC0) ---- */
    if (THREE.GLTFLoader) {
      const gl = new THREE.GLTFLoader();
      const dress = (file, x, z, ry, size) => gl.load("assets/hub/env/" + file, (g) => {
        const m = g.scene;
        const b = new THREE.Box3().setFromObject(m);
        const d = new THREE.Vector3(); b.getSize(d);
        const s = size / Math.max(d.x, d.y, d.z, 0.001);
        m.scale.setScalar(s);
        const b2 = new THREE.Box3().setFromObject(m);
        m.position.set(x, -1.55 - b2.min.y, z);
        m.rotation.y = ry;
        scene.add(m);
      }, undefined, () => {});
      dress("tree_dead_large.gltf", -6.2, -3.4, 0.6, 7.5);
      dress("arch_gate.gltf", 5.8, -3.8, -0.5, 5.2);
      dress("gravemarker_A.gltf", -3.9, -1.2, 0.9, 1.4);
      dress("lantern_standing.gltf", 3.4, -0.8, 0, 0.9);
    }

    /* ---- coal mound: cluster of glowing rocks ---- */
    const mound = new THREE.Group();
    const coalGeo = new THREE.IcosahedronGeometry(0.22, 0);
    for (let i = 0; i < 46; i++) {
      const hot = Math.random() < 0.45;
      const m = new THREE.Mesh(coalGeo, new THREE.MeshLambertMaterial({
        color: hot ? COAL : 0x14100e,
        emissive: hot ? COAL : 0x090301,
        emissiveIntensity: hot ? 0.9 + Math.random() * 0.6 : 0.25,
      }));
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.6) * 1.15;
      m.position.set(Math.cos(a) * r, -1.45 + Math.random() * 0.34 * (1.2 - r), Math.sin(a) * r);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      const s = 0.5 + Math.random() * 1.1;
      m.scale.set(s, s * 0.7, s);
      mound.add(m);
    }
    scene.add(mound);

    /* ---- the sword (coiled-sword stand-in: blade, guard, hilt) ---- */
    const sword = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xb9bcc6, metalness: 0.9, roughness: 0.32, emissive: 0x000000 });
    const goldMat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.85, roughness: 0.4 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.13, 2.7, 0.035), steel);
    blade.position.y = 1.35;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.3, 4), steel);
    tip.rotation.y = Math.PI / 4; tip.position.y = 2.85;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.14), goldMat);
    guard.position.y = 2.72; // guard near top since blade is planted downward
    // build planted: hilt above, blade goes down into coals
    sword.add(blade, tip, guard);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.62, 10),
      new THREE.MeshStandardMaterial({ color: 0x241a12, metalness: 0.2, roughness: 0.8 }));
    hilt.position.y = 3.08;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), goldMat);
    pommel.position.y = 3.44;
    sword.add(hilt, pommel);
    sword.position.set(0, -2.15, 0);      // plant into the mound
    sword.rotation.z = -0.09;
    sword.rotation.x = 0.04;
    scene.add(sword);

    /* ---- particles: fire, smoke, drifting embers ---- */
    const fireP = makeParticles(140, { color: 0xff8a3c, size: 34, spread: 0.55, rise: [0.9, 2.0], life: [0.5, 1.1], y0: -1.35 });
    const smokeP = makeParticles(60, { color: 0x555555, size: 60, spread: 0.8, rise: [0.35, 0.8], life: [2.2, 4.2], y0: -0.9, alpha: 0.16, normalBlend: true });
    const driftP = makeParticles(reduced ? 60 : 260, { color: EMBER, size: 16, spread: 12, rise: [0.12, 0.5], life: [4, 9], y0: -1.5, wide: true });
    scene.add(fireP.points, smokeP.points, driftP.points);

    function makeParticles(count, cfg) {
      const pos = new Float32Array(count * 3);
      const meta = []; // per-particle: vel, life, age
      for (let i = 0; i < count; i++) meta.push(spawnP(pos, i, cfg, true));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        map: softDot(), color: cfg.color, size: cfg.size * 0.013, transparent: true,
        opacity: cfg.alpha ?? 0.9, depthWrite: false,
        blending: cfg.normalBlend ? THREE.NormalBlending : THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      return { points: new THREE.Points(geo, mat), pos, meta, cfg, geo };
    }
    function spawnP(pos, i, cfg, randomAge) {
      const a = Math.random() * Math.PI * 2;
      const r = cfg.wide ? Math.random() * cfg.spread : Math.pow(Math.random(), 1.6) * cfg.spread;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = cfg.y0 + (cfg.wide ? Math.random() * 6 : Math.random() * 0.2);
      pos[i * 3 + 2] = Math.sin(a) * r;
      const life = cfg.life[0] + Math.random() * (cfg.life[1] - cfg.life[0]);
      return { vy: cfg.rise[0] + Math.random() * (cfg.rise[1] - cfg.rise[0]), life, age: randomAge ? Math.random() * life : 0, wob: Math.random() * 10 };
    }
    function stepParticles(P, dt, t) {
      for (let i = 0; i < P.meta.length; i++) {
        const m = P.meta[i];
        m.age += dt;
        if (m.age >= m.life) { P.meta[i] = spawnP(P.pos, i, P.cfg, false); continue; }
        P.pos[i * 3 + 1] += m.vy * dt;
        P.pos[i * 3] += Math.sin(t * 1.7 + m.wob) * 0.15 * dt;
        P.pos[i * 3 + 2] += Math.cos(t * 1.3 + m.wob) * 0.12 * dt;
      }
      P.geo.attributes.position.needsUpdate = true;
    }

    /* ---- interaction: hover + click the sword ---- */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoveringSword = false;
    const hint = document.getElementById("rest-hint");

    function pick(e) {
      const r = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      return ray.intersectObject(sword, true).length > 0;
    }
    canvas.addEventListener("pointermove", (e) => {
      const hit = pick(e);
      if (hit !== hoveringSword) {
        hoveringSword = hit;
        canvas.classList.toggle("sword-hover", hit);
        if (hint) hint.classList.toggle("show", hit);
        if (hit && window.SFX) SFX.play("tick");
      }
    }, { passive: true });
    canvas.addEventListener("click", (e) => {
      if (!pick(e)) return;
      if (window.SFX) SFX.play("rest");
      flare = 2.6; // firelight surge
      const target = document.getElementById("tlb-section");
      if (target) {
        if (window.__lenis) window.__lenis.scrollTo(target, { offset: -10 });
        else target.scrollIntoView({ behavior: "smooth" });
      }
    });

    /* ---- mouse parallax ---- */
    let pmx = 0, pmy = 0;
    window.addEventListener("pointermove", (e) => {
      pmx = e.clientX / window.innerWidth - 0.5;
      pmy = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    /* ---- resize + loop ---- */
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);
    resize();

    let flare = 0;
    let last = performance.now();
    let frames = 0;
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      // firelight flicker (+ flare surge on rest)
      flare = Math.max(0, flare - dt * 2.2);
      fire.intensity = 2.0 + Math.sin(t * 9.3) * 0.25 + Math.sin(t * 23.7) * 0.18 + Math.random() * 0.12 + flare;

      // sword glow on hover
      const targetE = hoveringSword ? 0.5 : 0.0;
      steel.emissive.setHex(EMBER);
      steel.emissiveIntensity += (targetE - (steel.emissiveIntensity || 0)) * 0.12;

      // coal pulse
      mound.children.forEach((c, i) => {
        if (c.material.emissiveIntensity > 0.5) {
          c.material.emissiveIntensity = 0.9 + Math.sin(t * 2.2 + i * 1.7) * 0.35;
        }
      });

      fireGlow.material.opacity = 0.75 + Math.sin(t * 8.2) * 0.08 + flare * 0.12;
      for (const ms of mists) {
        ms.sp.position.x += Math.sin(t * 0.13 + ms.ph) * 0.004;
        ms.sp.material.opacity = 0.07 + Math.sin(t * 0.5 + ms.ph) * 0.03;
      }

      stepParticles(fireP, dt, t);
      stepParticles(smokeP, dt, t);
      stepParticles(driftP, dt, t);

      // parallax orbit
      camera.position.x += ((pmx * 1.6) - camera.position.x) * 0.04;
      camera.position.y += ((1.1 - pmy * 0.8) - camera.position.y) * 0.04;
      camera.lookAt(0, 0.2, 0);

      renderer.render(scene, camera);
      frames++;
      if (!reduced || frames < 5) requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ============================================================ 2D fallback */
  function init2D() {
    const ctx2 = canvas.getContext("2d");
    let embers = [];
    function resize() {
      canvas.width = canvas.clientWidth * Math.min(window.devicePixelRatio, 2);
      canvas.height = canvas.clientHeight * Math.min(window.devicePixelRatio, 2);
      const n = canvas.clientWidth < 700 ? 120 : 220;
      embers = Array.from({ length: n }, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5, s: Math.random() * 0.6 + 0.2, a: Math.random() * 0.6 + 0.2,
      }));
    }
    function frame() {
      ctx2.clearRect(0, 0, canvas.width, canvas.height);
      for (const e of embers) {
        e.y -= e.s; e.x += Math.sin(e.y * 0.01) * 0.3;
        if (e.y < -5) { e.y = canvas.height + 5; e.x = Math.random() * canvas.width; }
        ctx2.beginPath();
        ctx2.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(255,107,53,${e.a})`;
        ctx2.fill();
      }
      if (!reduced) requestAnimationFrame(frame);
    }
    window.addEventListener("resize", resize);
    resize();
    frame();
  }

  function hasWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }
})();
