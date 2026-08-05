/* =============================================================================
   THE ROUNDTABLE HOLD — walkable 3D hub (Bruno Simon-style centerpiece).
   A knight you control with WASD walks a torch-lit circular hold; every project
   is a gravestone arranged around the central bonfire. Walk close -> the stone
   lock-highlights and a prompt appears; press E -> its project page opens.
   ESC / LEAVE returns to the normal site.

   Optional real assets: drop GLB exports from your games into assets/hub/:
     assets/hub/knight.glb  -> replaces the procedural knight (first anim clip
                               plays if the file has animations)
     assets/hub/statue.glb  -> decorative statue placed beside the bonfire
   Missing files silently fall back to procedural meshes.
============================================================================= */
(function () {
  const canvas = () => document.getElementById("hub-canvas");
  let built = false, active = false, rafId = 0;
  let renderer, scene, camera, knight, mixer;
  let glbModel = null, glbBaseY = 0, rig = null;
  let fireLight, firePts, emberPts;
  let stones = [], colliders = [], labels = [];
  let nearTarget = null, flare = 0;
  let torchLights = [];               // {light, x, z, flame}
  let runes = [], runesGot = 0;       // collectible ember runes
  let chestObj = null, chestOpened = false;
  let sprinting = false, stepPhase = 0;
  let camPitch = 0.46, camDist = 7.2, lastDragT = 0; // manual orbit state
  let mists = [];                     // drifting ground-fog sprites
  let animSpeed = 0;                  // smoothed GLB clip speed (idle ≈ frozen)

  const keys = {};
  const joy = { active: false, x: 0, y: 0 };
  const BOUND = 22.5;

  window.Hub = { enter, exit };
  window.Hub.tick = (now) => loop(now || performance.now()); // manual step (testing/headless)
  window.Hub.teleport = (x, z) => { if (knight) { knight.position.x = x; knight.position.z = z; } };
  const glb = { knight: "not loaded", statue: "not loaded" }; // status for debug
  window.Hub.debug = () => ({
    glb,
    active, built,
    x: knight ? +knight.position.x.toFixed(2) : null,
    z: knight ? +knight.position.z.toFixed(2) : null,
    keys: Object.keys(keys).filter((k) => keys[k]),
    near: nearTarget ? (nearTarget.title || "bonfire") : null,
  });

  /* ============================================================ ENTER / EXIT */
  function enter() {
    if (!window.THREE || !hasWebGL()) return;
    const hub = document.getElementById("hub");
    if (!hub) return;
    if (!built) { build(); built = true; }
    active = true;
    hub.classList.add("show");
    hub.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (window.__lenis) window.__lenis.stop();
    if (window.SFX) SFX.play("rest");
    if (window.__toast) __toast("New Area — Roundtable Hold");
    const reveal = document.getElementById("area-reveal");
    if (reveal) {
      reveal.querySelector(".area-reveal-title").textContent = "Roundtable Hold";
      reveal.classList.remove("show"); void reveal.offsetWidth; reveal.classList.add("show");
      setTimeout(() => reveal.classList.remove("show"), 2000);
    }
    resize();
    last = performance.now();
    loop(last);
  }

  function exit() {
    active = false;
    cancelAnimationFrame(rafId);
    const hub = document.getElementById("hub");
    hub.classList.remove("show");
    hub.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (window.__lenis) window.__lenis.start();
    if (window.SFX) SFX.play("confirm");
  }

  /* ================================================================= BUILD */
  function build() {
    const THREE = window.THREE;
    renderer = new THREE.WebGLRenderer({ canvas: canvas(), antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding; // KayKit assets author in sRGB

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0a12);
    scene.fog = new THREE.Fog(0x0d0b14, 20, 78);

    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 220);

    /* ---- lights: night sky glow + moon + firelight ---- */
    scene.add(new THREE.HemisphereLight(0x4a4468, 0x2a1c12, 1.15));
    scene.add(new THREE.AmbientLight(0x241f2c, 0.9));
    const moon = new THREE.DirectionalLight(0x8493c8, 0.85);
    moon.position.set(-18, 30, -14);
    scene.add(moon);
    fireLight = new THREE.PointLight(0xff7a3c, 3.2, 44, 1.5);
    fireLight.position.set(0, 1.0, 0);
    scene.add(fireLight);

    /* ---- night sky: star dome + moon disc ---- */
    const starN = 500, starPos = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.85); // upper dome
      const R = 150;
      starPos[i * 3] = R * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = R * Math.cos(ph) + 2;
      starPos[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xd8dcf0, size: 0.55, transparent: true, opacity: 0.85, sizeAttenuation: true, fog: false,
    })));
    const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 32),
      new THREE.MeshBasicMaterial({ color: 0xcfd6ee, fog: false }));
    moonDisc.position.set(-70, 78, -95);
    moonDisc.lookAt(0, 0, 0);
    scene.add(moonDisc);
    const moonGlow = new THREE.Mesh(new THREE.CircleGeometry(13, 32),
      new THREE.MeshBasicMaterial({ color: 0x8b96c8, transparent: true, opacity: 0.22, fog: false }));
    moonGlow.position.copy(moonDisc.position);
    moonGlow.lookAt(0, 0, 0);
    moonGlow.translateZ(-0.5);
    scene.add(moonGlow);

    /* ---- ground: procedurally-tiled stone disc + gold rune rings ---- */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(BOUND + 6, 56),
      new THREE.MeshLambertMaterial({ map: makeStoneTexture(), color: 0xbdb6c4 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    for (const [r, op] of [[3.2, 0.35], [10, 0.14], [15, 0.1]]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.06, r + 0.06, 64),
        new THREE.MeshBasicMaterial({ color: 0xc9a961, transparent: true, opacity: op, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      scene.add(ring);
    }

    buildEnvironment(); // KayKit medieval walls, torches, banners, props (async)
    buildBonfire();
    buildStones();
    buildKnight();
    tryLoadGLB();

    /* ---- ambient embers across the hold ---- */
    emberPts = makeEmbers(240, BOUND + 2);
    scene.add(emberPts.points);

    wireInput();
    window.addEventListener("resize", resize);
  }

  /* ---- procedural stone-tile ground texture ---- */
  function makeStoneTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const x = c.getContext("2d");
    x.fillStyle = "#1b1721"; x.fillRect(0, 0, 1024, 1024);
    const TILE = 128;
    for (let ty = 0; ty < 8; ty++) {
      for (let tx = 0; tx < 8; tx++) {
        const shade = 24 + Math.floor(Math.random() * 14);
        x.fillStyle = `rgb(${shade},${shade - 4},${shade + 4})`;
        x.fillRect(tx * TILE + 3, ty * TILE + 3, TILE - 6, TILE - 6);
        // cracks + wear
        x.strokeStyle = "rgba(0,0,0,0.35)";
        x.lineWidth = 1.5;
        if (Math.random() < 0.4) {
          x.beginPath();
          let cx = tx * TILE + Math.random() * TILE, cy = ty * TILE + 8;
          x.moveTo(cx, cy);
          for (let s = 0; s < 4; s++) { cx += (Math.random() - 0.5) * 40; cy += TILE / 4; x.lineTo(cx, cy); }
          x.stroke();
        }
        x.fillStyle = "rgba(255,255,255,0.03)";
        x.fillRect(tx * TILE + 3, ty * TILE + 3, TILE - 6, 5);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    return tex;
  }

  /* ---- KayKit env asset loading (CC0 — see assets/hub/env/CREDITS.md) ---- */
  let envLoader = null;
  const envCache = {};
  function envLoad(name) {
    if (!THREE.GLTFLoader) return Promise.resolve(null);
    if (!envLoader) envLoader = new THREE.GLTFLoader();
    const file = name.includes(".") ? name : name + ".glb"; // .gltf assets keep their extension
    return envCache[name] || (envCache[name] = new Promise((res) =>
      envLoader.load("assets/hub/env/" + file, (g) => res(g.scene), undefined, () => res(null))));
  }

  // envPlace(): clone a loaded model, scale so its largest XZ side = `size`,
  // drop it on the floor at (x,z) facing `ry`, optionally add a collider.
  async function envPlace(name, x, z, ry, size, colR) {
    const src = await envLoad(name);
    if (!src) return null;
    const m = src.clone(true);
    const box = new THREE.Box3().setFromObject(m);
    const dim = new THREE.Vector3(); box.getSize(dim);
    const s = size / Math.max(dim.x, dim.z, 0.001);
    m.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(m);
    m.position.set(x, -box2.min.y, z);
    m.rotation.y = ry;
    scene.add(m);
    if (colR) colliders.push({ x, z, r: colR });
    return m;
  }

  /* ---- the medieval hold: walls, shrines, graveyard, camp, mist ---- */
  function buildEnvironment() {
    if (!THREE.GLTFLoader) return;

    /* -- fortress wall ring: 20 segments, varied, facing inward -- */
    const WR = BOUND + 2.2;
    const segN = 20;
    const chord = 2 * WR * Math.sin(Math.PI / segN) * 1.04;
    const pattern = ["wall", "wall", "wall_cracked", "wall", "wall_window", "wall", "wall_broken", "wall", "wall_arched", "wall_cracked"];
    for (let i = 0; i < segN; i++) {
      const a = (i / segN) * Math.PI * 2;
      const x = Math.cos(a) * WR, z = Math.sin(a) * WR;
      const name = (i === Math.round(segN * 0.75)) ? "wall_doorway" : pattern[i % pattern.length];
      envPlace(name, x, z, -a + Math.PI / 2, chord).then((m) => {
        if (m) m.scale.y *= 0.92 + ((i * 37) % 10) * 0.03; // subtle height variety
      });
      // buttress pillar at every other wall junction for fortress rhythm
      if (i % 2 === 0) {
        const aj = a + Math.PI / segN;
        envPlace("wall_pillar", Math.cos(aj) * (WR - 0.2), Math.sin(aj) * (WR - 0.2), -aj + Math.PI / 2, 1.3);
      }
    }
    // banners hung inside the ring, evenly spaced between stones
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.16;
      const x = Math.cos(a) * (WR - 1.1), z = Math.sin(a) * (WR - 1.1);
      envPlace(["banner_a", "banner_shield", "banner_triple"][i % 3], x, z, -a - Math.PI / 2, 1.6);
    }

    /* -- graveyard dressing: dead trees, fences, paths, crypt relics -- */
    envPlace("tree_dead_large.gltf", -19, -13, 0.7, 6.5, 0.7);
    envPlace("tree_dead_large.gltf", 19.5, 11.5, 2.3, 6.0, 0.7);
    envPlace("tree_dead_medium.gltf", 13.5, -17, 1.1, 4.6, 0.6);
    envPlace("tree_dead_medium.gltf", -20.5, 7.5, 2.9, 4.4, 0.6);
    envPlace("tree_dead_small.gltf", 11.5, 9.8, 0.3, 3.0, 0.5);

    // broken graveyard fence arcs between the outer stones
    for (const [a0, n] of [[0.5, 4], [3.6, 4]]) {
      for (let i = 0; i < n; i++) {
        const a = a0 + i * 0.13;
        const x = Math.cos(a) * 20.6, z = Math.sin(a) * 20.6;
        envPlace(i === 1 ? "fence_broken.gltf" : (i === 3 ? "fence_gate.gltf" : "fence.gltf"),
          x, z, -a + Math.PI / 2, 2.4);
      }
    }

    // stone path leading from the bonfire to the flagship shrine + spawn
    [[0, -3.4], [0.3, -4.7], [-0.2, -5.6], [0.2, 3.6], [-0.3, 4.9]].forEach(([x, z], i) => {
      envPlace(i % 2 ? "path_B.gltf" : "path_A.gltf", x, z, i * 1.7, 1.5);
    });
    // lantern posts flanking the path (join the budgeted light pool)
    for (const [x, z] of [[-1.7, -4.4], [1.7, -4.4], [-1.7, 4.2], [1.7, 4.2]]) {
      envPlace("post_lantern.gltf", x, z, Math.atan2(-x, -z), 0.7, 0.3).then((m) => {
        if (!m) return;
        const light = new THREE.PointLight(0xffb457, 0, 7, 2);
        light.position.set(x, 2.0, z);
        scene.add(light);
        torchLights.push({ light, x, z });
      });
    }

    // relics: coffin under a tree, bones by the crypt, candle plaque at the treasure
    envPlace("coffin.gltf", -16.5, -11, 1.9, 1.9, 1.0);
    envPlace("bone_A.gltf", -1.8, -9.6, 1.2, 0.9);
    envPlace("skull_candle.gltf", 1.9, -9.4, -0.6, 0.55);
    envPlace("plaque_candles.gltf", -9.8, 6.2, 2.1, 1.0, 0.5);
    envPlace("lantern_standing.gltf", 10.9, 6.6, 0, 0.5);
    envPlace("gravemarker_A.gltf", -13, 14.5, 0.9, 1.2, 0.6);

    /* -- the flagship crypt: grand backdrop behind The Last Blood -- */
    envPlace("crypt.gltf", 0, -12.2, Math.PI, 7.0, 3.2);
    envPlace("shrine_candles.gltf", -3.9, -8.6, 0.4, 1.3, 0.7);
    envPlace("shrine_candles.gltf", 3.9, -8.6, -0.4, 1.3, 0.7);

    /* -- drifting ground mist -- */
    const mistTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
      g.addColorStop(0, "rgba(200,205,230,0.55)");
      g.addColorStop(1, "rgba(200,205,230,0)");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mistTex, transparent: true, opacity: 0.10, depthWrite: false,
      }));
      const a = (i / 7) * Math.PI * 2;
      sp.position.set(Math.cos(a) * (7 + (i % 3) * 5), 0.8, Math.sin(a) * (7 + (i % 3) * 5));
      sp.scale.set(13 + (i % 3) * 4, 4.5, 1);
      scene.add(sp);
      mists.push({ sp, ph: i * 1.9 });
    }

    /* -- standing torches lighting the stone rings -- */
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(a) * 13.5, z = Math.sin(a) * 13.5;
      envPlace("torch_lit", x, z, -a, 0.65, 0.35).then((m) => {
        if (!m) return;
        const light = new THREE.PointLight(0xff8a3c, 0, 11, 2); // lit when near (budgeted)
        light.position.set(x, 2.1, z);
        scene.add(light);
        torchLights.push({ light, x, z });
      });
    }

    /* -- inner accents: decorated pillars between the stone rings -- */
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      envPlace("pillar", Math.cos(a) * 19.5, Math.sin(a) * 19.5, -a, 1.6, 0.9);
    }

    /* -- camp near the spawn: table, seats, kegs -- */
    envPlace("table", 6.5, 7.5, -0.5, 2.6, 1.4);
    envPlace("chair", 5.2, 8.6, 2.2, 0.9);
    envPlace("stool", 7.9, 8.7, 0, 0.8);
    envPlace("keg", 8.6, 6.4, 0.4, 1.0, 0.6);
    envPlace("barrel", 9.4, 7.4, 0, 1.0, 0.6);
    envPlace("crates", 10.2, 5.6, 0.9, 1.6, 1.0);

    /* -- treasure nook (interactive chest) + spilled coins -- */
    envPlace("chest_gold", -8.2, 7.6, 2.4, 1.5, 0.9).then((m) => { chestObj = m; });
    envPlace("coin_stack", -7.0, 8.4, 0, 0.55);
    envPlace("coin_stack", -9.3, 8.6, 1.2, 0.4);

    /* -- war trophies flanking the flagship stone -- */
    envPlace("sword_shield_gold", -2.6, -6.2, 0.5, 1.3, 0.5);
    envPlace("sword_shield", 2.6, -6.2, -0.5, 1.3, 0.5);

    /* -- scattered ruin rubble -- */
    envPlace("rubble_large", -14, -9, 1.1, 1.8, 1.0);
    envPlace("rubble_half", 12, -12, 2.6, 1.3, 0.8);
    envPlace("rubble_large", 16, 9, 0.4, 1.5, 0.9);
    envPlace("column", -17, 6, 0.8, 1.2, 0.7);

    /* -- collectible ember runes: 10 floating coins to gather -- */
    const runeSpots = [
      [4, -12], [-11, -3], [14, 3], [-6, 14], [18, -4],
      [-16, -12], [9, 16], [-19, 1], [2, 19], [-13, 12],
    ];
    envLoad("coin").then((src) => {
      if (!src) return;
      runeSpots.forEach(([x, z], i) => {
        const m = src.clone(true);
        m.scale.setScalar(2.2);
        m.position.set(x, 1.0, z);
        m.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xc98a20); o.material.emissiveIntensity = 0.6; } });
        scene.add(m);
        runes.push({ m, x, z, got: false, ph: i * 1.3 });
      });
      updateRunesHUD();
    });
  }

  function updateRunesHUD() {
    const el = document.getElementById("hub-runes");
    if (el) {
      el.textContent = `✦ RUNES ${runesGot} / ${runes.length || 10}`;
      el.classList.add("show");
    }
  }

  /* ---- central bonfire (the hero bonfire, reborn in the hub) ---- */
  function buildBonfire() {
    const THREE = window.THREE;
    const coalGeo = new THREE.IcosahedronGeometry(0.2, 0);
    for (let i = 0; i < 34; i++) {
      const hot = Math.random() < 0.45;
      const m = new THREE.Mesh(coalGeo, new THREE.MeshLambertMaterial({
        color: hot ? 0xff3b10 : 0x14100e,
        emissive: hot ? 0xff3b10 : 0x090301,
        emissiveIntensity: hot ? 1.0 : 0.25,
      }));
      const a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 0.6);
      m.position.set(Math.cos(a) * r, 0.1 + Math.random() * 0.25 * (1.1 - r), Math.sin(a) * r);
      const s = 0.6 + Math.random();
      m.scale.set(s, s * 0.7, s);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      scene.add(m);
    }
    // planted sword
    const steel = new THREE.MeshStandardMaterial({ color: 0xb9bcc6, metalness: 0.9, roughness: 0.32 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a961, metalness: 0.85, roughness: 0.4 });
    const sword = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.3, 0.03), steel); blade.position.y = 1.15;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.13), gold); guard.position.y = 2.28;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.85 })); hilt.position.y = 2.6;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), gold); pom.position.y = 2.92;
    sword.add(blade, guard, hilt, pom);
    sword.rotation.z = -0.08;
    scene.add(sword);
    firePts = makeFire(110);
    scene.add(firePts.points);
    colliders.push({ x: 0, z: 0, r: 1.7 });
  }

  /* ---- one gravestone per project, rings around the fire ---- */
  function buildStones() {
    const THREE = window.THREE;
    const P = window.PORTFOLIO;
    const list = [
      { slug: P.featured.slug, title: P.featured.title, flagship: true },
      ...P.projects.map((p) => ({ slug: p.slug, title: p.title })),
    ];
    const ring1 = list.slice(1, 9), ring2 = list.slice(9);

    placeStone(list[0], 0, -6.4); // flagship: front-and-center, north of the fire
    ring1.forEach((p, i) => {
      const a = Math.PI * 2 * (i / ring1.length) + Math.PI / ring1.length;
      placeStone(p, Math.sin(a) * 11, Math.cos(a) * 11);
    });
    ring2.forEach((p, i) => {
      const a = Math.PI * 2 * (i / ring2.length);
      placeStone(p, Math.sin(a) * 16.5, Math.cos(a) * 16.5);
    });
  }

  function placeStone(p, x, z) {
    const THREE = window.THREE;
    const W = p.flagship ? 2.2 : 1.5, H = p.flagship ? 2.9 : 2.0, D = 0.42;
    const g = new THREE.Group();

    const stoneMat = new THREE.MeshLambertMaterial({ color: p.flagship ? 0x2c2622 : 0x27222b });
    const face = new THREE.MeshLambertMaterial({ map: stoneText(p.title, p.flagship), color: 0xffffff });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D),
      [stoneMat, stoneMat, stoneMat, stoneMat, face, stoneMat]); // +z face carries the name
    body.position.y = H / 2;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(W * 1.12, 0.22, D * 1.3), stoneMat);
    cap.position.y = H + 0.08;
    const base = new THREE.Mesh(new THREE.BoxGeometry(W * 1.25, 0.3, D * 2.2), stoneMat);
    base.position.y = 0.15;
    g.add(body, cap, base);

    if (p.flagship) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(W * 1.16, 0.08, D * 1.35),
        new THREE.MeshStandardMaterial({ color: 0xc9a961, metalness: 0.8, roughness: 0.4 }));
      trim.position.y = H + 0.22;
      g.add(trim);
    }

    g.position.set(x, 0, z);
    g.lookAt(0, 0, 0); // face the bonfire
    g.rotation.y += (Math.random() - 0.5) * 0.12;
    g.rotation.z = (Math.random() - 0.5) * 0.03;
    scene.add(g);

    // EVERY project gets its own shrine gate: an arch right behind the stone,
    // facing the bonfire, with a lantern post beside every other one.
    const rr = Math.hypot(x, z) || 1;
    const bx = x * ((rr + 1.9) / rr), bz = z * ((rr + 1.9) / rr); // just behind
    const faceCenter = Math.atan2(-bx, -bz);
    const archName = p.flagship ? "arch_gate.gltf" : (stones.length % 2 ? "arch.gltf" : "arch_gate.gltf");
    envPlace(archName, bx, bz, faceCenter, p.flagship ? 4.4 : 3.0);
    if (!p.flagship && stones.length % 2 === 0) {
      // tangent offset for the lantern
      const tx = -z / rr, tz = x / rr;
      envPlace("post_lantern.gltf", x + tx * 2.1, z + tz * 2.1, faceCenter, 0.65, 0.3);
    }

    // floating gold label (visible when near)
    const label = makeLabel(p.title);
    label.position.set(x, H + 1.0, z);
    scene.add(label);
    labels.push(label);

    stones.push({ slug: p.slug, title: p.title, x, z, group: g, body, label, baseEmissive: 0 });
    colliders.push({ x, z, r: Math.max(W, D) * 0.75 });
  }

  function stoneText(title, flagship) {
    const THREE = window.THREE;
    const c = document.createElement("canvas");
    c.width = 512; c.height = 680;
    const ctx = c.getContext("2d");
    ctx.fillStyle = flagship ? "#2c2622" : "#27222b";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = flagship ? "rgba(201,169,97,0.7)" : "rgba(201,169,97,0.28)";
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, c.width - 56, c.height - 56);
    ctx.fillStyle = flagship ? "#c9a961" : "#8d8578";
    ctx.textAlign = "center";
    ctx.font = "700 52px Cinzel, Georgia, serif";
    wrap(ctx, title.toUpperCase(), c.width / 2, 150, c.width - 120, 62);
    ctx.font = "36px Georgia, serif";
    ctx.fillStyle = "rgba(201,169,97,0.45)";
    ctx.fillText("✦", c.width / 2, c.height - 90);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }
  function wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      if (ctx.measureText(line + w).width > maxW && line) {
        ctx.fillText(line.trim(), x, y); y += lh; line = "";
      }
      line += w + " ";
    }
    ctx.fillText(line.trim(), x, y);
  }

  function makeLabel(title) {
    const THREE = window.THREE;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 192;
    const ctx = c.getContext("2d");
    ctx.textAlign = "center";
    ctx.font = "700 84px Cinzel, Georgia, serif";
    ctx.shadowColor = "rgba(255,107,53,0.7)"; ctx.shadowBlur = 26;
    ctx.fillStyle = "#e9d9a8";
    ctx.fillText(title.toUpperCase(), 512, 122);
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(4.6, 0.86, 1);
    return s;
  }

  /* ---- procedural low-poly knight ---- */
  function buildKnight() {
    const THREE = window.THREE;
    knight = new THREE.Group();
    const armor = new THREE.MeshStandardMaterial({ color: 0x3d4049, metalness: 0.75, roughness: 0.5 });
    const cloth = new THREE.MeshLambertMaterial({ color: 0x4a1212 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a961, metalness: 0.8, roughness: 0.45 });

    const mesh = new THREE.Group(); mesh.name = "procKnight";
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.32), armor); torso.position.y = 1.03;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.3), cloth); belt.position.y = 0.66;
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.185, 0.3, 10), armor); helm.position.y = 1.55;
    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.22), gold); plume.position.set(0, 1.74, -0.02);
    for (const s of [-1, 1]) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), armor);
      pad.position.set(s * 0.4, 1.3, 0); mesh.add(pad);
    }
    // limbs pivot at their top so they swing from hip/shoulder
    function limb(w, h, d, mat) {
      const geo = new THREE.BoxGeometry(w, h, d);
      geo.translate(0, -h / 2, 0);
      return new THREE.Mesh(geo, mat);
    }
    const legL = limb(0.17, 0.62, 0.2, armor); legL.position.set(-0.15, 0.62, 0);
    const legR = limb(0.17, 0.62, 0.2, armor); legR.position.set(0.15, 0.62, 0);
    const armL = limb(0.13, 0.52, 0.16, armor); armL.position.set(-0.42, 1.32, 0);
    const armR = limb(0.13, 0.52, 0.16, armor); armR.position.set(0.42, 1.32, 0);
    // greatsword on the back
    const swGeo = new THREE.BoxGeometry(0.08, 1.5, 0.025); swGeo.translate(0, 0.3, 0);
    const backSword = new THREE.Mesh(swGeo, new THREE.MeshStandardMaterial({ color: 0xb9bcc6, metalness: 0.9, roughness: 0.35 }));
    backSword.position.set(0.05, 1.0, 0.24); backSword.rotation.z = 0.5;
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.78), new THREE.MeshLambertMaterial({ color: 0x3a0d0d, side: THREE.DoubleSide }));
    cape.position.set(0, 1.28, 0.19); cape.rotation.x = 0.12;
    cape.geometry.translate(0, -0.39, 0);

    mesh.add(torso, belt, helm, plume, legL, legR, armL, armR, backSword, cape);
    mesh.userData = { legL, legR, armL, armR, cape };
    knight.add(mesh);
    knight.position.set(0, 0, 6.5); // spawn south of the bonfire
    knight.rotation.y = Math.PI;    // facing the fire
    scene.add(knight);
  }

  /* ---- optional real game assets ---- */
  function tryLoadGLB() {
    const THREE = window.THREE;
    if (!THREE.GLTFLoader) return;
    const loader = new THREE.GLTFLoader();
    loader.load("assets/hub/knight.glb", (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const h = box.max.y - box.min.y || 1;
      const s = 1.75 / h;
      model.scale.setScalar(s);
      model.position.y = -box.min.y * s;
      const proc = knight.getObjectByName("procKnight");
      if (proc) proc.visible = false;
      knight.add(model);
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
      }
      glbModel = model;
      glbBaseY = model.position.y;
      if (!mixer) rig = buildRig(model); // no baked anims -> drive the skeleton ourselves
      glb.knight = `loaded (${gltf.animations ? gltf.animations.length : 0} anims, height ${h.toFixed(2)}, ` +
        (mixer ? "clip playing" : rig ? "proc rig: " + Object.keys(rig.bones).join("+") : "no bones, body motion only") + ")";
    }, undefined, (err) => { glb.knight = "failed: " + (err && err.message ? err.message : "parse error"); });
    loader.load("assets/hub/statue.glb", (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const h = box.max.y - box.min.y || 1;
      const s = 3.2 / h;
      model.scale.setScalar(s);
      model.position.set(4.5, -box.min.y * s, -4.5);
      scene.add(model);
      colliders.push({ x: 4.5, z: -4.5, r: 1.4 });
      glb.statue = `loaded (height ${h.toFixed(2)})`;
    }, undefined, (err) => { glb.statue = "failed: " + (err && err.message ? err.message : "parse error"); });
  }

  /* ---- procedural rig: find limb bones by name (UE5 / Mixamo / Blender) ---- */
  function buildRig(model) {
    const bones = [];
    model.traverse((o) => { if (o.isBone) bones.push(o); });
    if (!bones.length) return null;

    const sideOf = (n) => {
      if (/(^|[_.\- ])(l|left)([_.\- ]|$)/.test(n) || /(_l|\.l|-l)$/.test(n) || n.includes("left")) return "L";
      if (/(^|[_.\- ])(r|right)([_.\- ]|$)/.test(n) || /(_r|\.r|-r)$/.test(n) || n.includes("right")) return "R";
      return null;
    };
    const kindOf = (n) => {
      if (/thigh|upperleg|upleg|up_leg/.test(n)) return "leg";
      if (/upperarm|upper_arm|uparm/.test(n)) return "arm";
      // mixamo-style plain "LeftArm"/"LeftLeg" (not fore/lower/hand/shoulder)
      if (/arm/.test(n) && !/forearm|lowerarm|lower_arm|hand|shoulder|clavicle/.test(n)) return "arm";
      if (/leg/.test(n) && !/lowerleg|lower_leg|calf|shin|foot/.test(n)) return "leg";
      if (/spine/.test(n)) return "spine";
      return null;
    };

    const found = {};
    for (const b of bones) {
      const n = b.name.toLowerCase();
      const kind = kindOf(n);
      if (!kind) continue;
      if (kind === "spine") { if (!found.spine) found.spine = b; continue; }
      const side = sideOf(n);
      if (!side) continue;
      const key = kind + side; // legL, legR, armL, armR — keep the first (upper-most) match
      if (!found[key]) found[key] = b;
    }
    if (!found.legL || !found.legR) return null; // not enough to fake a walk

    const base = {};
    for (const k of Object.keys(found)) base[k] = found[k].rotation.x;
    return { bones: found, base };
  }

  /* ---- particles ---- */
  function makeFire(count) {
    const THREE = window.THREE;
    const pos = new Float32Array(count * 3);
    const meta = [];
    for (let i = 0; i < count; i++) meta.push(fSpawn(pos, i, true));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xff8a3c, size: 0.3, transparent: true, opacity: 0.85,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    return { points, pos, meta, geo };
  }
  function fSpawn(pos, i, rand) {
    const a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 1.6) * 0.5;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.25 + Math.random() * 0.2; pos[i * 3 + 2] = Math.sin(a) * r;
    const life = 0.5 + Math.random() * 0.8;
    return { vy: 1.2 + Math.random() * 1.4, life, age: rand ? Math.random() * life : 0 };
  }
  function makeEmbers(count, spread) {
    const THREE = window.THREE;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 8; pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xff6b35, size: 0.07, transparent: true, opacity: 0.65,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    return { points, pos, geo, n: count };
  }

  /* ================================================================ INPUT */
  function wireInput() {
    window.addEventListener("keydown", (e) => {
      if (!active) return;
      const modalOpen = document.getElementById("modal")?.classList.contains("open");
      if (modalOpen) return; // project page handles its own keys
      keys[e.key.toLowerCase()] = true;
      if (e.key === "Escape") exit();
      if ((e.key === "e" || e.key === "E" || e.key === "Enter") && nearTarget) interact();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

    document.getElementById("hub-exit")?.addEventListener("click", exit);
    document.getElementById("hub-interact")?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (nearTarget) interact();
    });

    // mouse orbit: drag to rotate, wheel to zoom
    const cv = canvas();
    let dragging = false, dx0 = 0, dy0 = 0;
    cv.addEventListener("pointerdown", (e) => {
      if (!active || e.pointerType !== "mouse") return;
      dragging = true; dx0 = e.clientX; dy0 = e.clientY;
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      camYaw -= (e.clientX - dx0) * 0.0055;
      camPitch = Math.min(1.15, Math.max(0.12, camPitch + (e.clientY - dy0) * 0.004));
      dx0 = e.clientX; dy0 = e.clientY;
      lastDragT = performance.now();
    }, { passive: true });
    window.addEventListener("pointerup", () => { dragging = false; });
    cv.addEventListener("wheel", (e) => {
      if (!active) return;
      e.preventDefault();
      camDist = Math.min(12, Math.max(4.2, camDist + e.deltaY * 0.006));
    }, { passive: false });
    document.getElementById("hub").addEventListener("contextmenu", (e) => e.preventDefault());

    // touch joystick (left side) + touch camera orbit (right side)
    const zone = document.getElementById("hub");
    const stickEl = document.getElementById("hub-joystick");
    let touchId = null, ox = 0, oy = 0;
    let camTouchId = null, cx0 = 0, cy0 = 0;
    zone.addEventListener("touchstart", (e) => {
      if (!active) return;
      for (const t of e.changedTouches) {
        if (t.clientX <= window.innerWidth * 0.55 && touchId === null) {
          touchId = t.identifier; ox = t.clientX; oy = t.clientY;
          joy.active = true;
          stickEl.style.left = ox + "px"; stickEl.style.top = oy + "px";
          stickEl.classList.add("show");
        } else if (t.clientX > window.innerWidth * 0.55 && camTouchId === null) {
          camTouchId = t.identifier; cx0 = t.clientX; cy0 = t.clientY;
        }
      }
    }, { passive: true });
    zone.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) {
          const dx = t.clientX - ox, dy = t.clientY - oy;
          const len = Math.hypot(dx, dy) || 1;
          const cl = Math.min(len, 46);
          joy.x = (dx / len) * (cl / 46);
          joy.y = (dy / len) * (cl / 46);
          stickEl.querySelector(".stick").style.transform = `translate(${(dx / len) * cl}px, ${(dy / len) * cl}px)`;
        } else if (t.identifier === camTouchId) {
          camYaw -= (t.clientX - cx0) * 0.006;
          camPitch = Math.min(1.15, Math.max(0.12, camPitch + (t.clientY - cy0) * 0.005));
          cx0 = t.clientX; cy0 = t.clientY;
          lastDragT = performance.now();
        }
      }
    }, { passive: true });
    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === camTouchId) camTouchId = null;
        if (t.identifier !== touchId) continue;
        touchId = null; joy.active = false; joy.x = joy.y = 0;
        stickEl.classList.remove("show");
        stickEl.querySelector(".stick").style.transform = "";
      }
    };
    zone.addEventListener("touchend", endTouch, { passive: true });
    zone.addEventListener("touchcancel", endTouch, { passive: true });
  }

  function interact() {
    if (!nearTarget) return;
    if (nearTarget.bonfire) {
      if (window.SFX) SFX.play("rest");
      flare = 2.5;
      if (window.__toast) __toast("Bonfire Rested — Runes Restored");
      return;
    }
    if (nearTarget.chest) {
      chestOpened = true;
      flare = 2;
      if (window.SFX) SFX.play("confirm");
      if (window.__toast) __toast("Treasure Claimed — the Golden Chest");
      if (chestObj) chestObj.rotation.x = -0.25; // tip the lid back
      nearTarget = null;
      updatePrompt();
      return;
    }
    if (window.SFX) SFX.play("confirm");
    if (window.__openProject) __openProject(nearTarget.slug);
  }

  /* ================================================================= LOOP */
  let last = 0, camYaw = Math.PI;
  const vel = { x: 0, z: 0 };

  function loop(now) {
    if (!active) return;
    rafId = requestAnimationFrame(loop);
    const modalOpen = document.getElementById("modal")?.classList.contains("open");
    if (modalOpen) { last = now; return; } // pause under the project page
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    /* -- movement input -- */
    let ix = (keys["d"] || keys["arrowright"] ? 1 : 0) - (keys["a"] || keys["arrowleft"] ? 1 : 0);
    let iz = (keys["s"] || keys["arrowdown"] ? 1 : 0) - (keys["w"] || keys["arrowup"] ? 1 : 0);
    if (joy.active) { ix = joy.x; iz = joy.y; }
    const il = Math.hypot(ix, iz);
    if (il > 1) { ix /= il; iz /= il; }

    // camera-relative movement: forward = camera look dir (sin cy, cos cy),
    // right = (-cos cy, sin cy); W is iz=-1 so forward scales by -iz.
    const cy = camYaw;
    const wx = (-iz) * Math.sin(cy) + ix * (-Math.cos(cy));
    const wz = (-iz) * Math.cos(cy) + ix * Math.sin(cy);

    sprinting = !!keys["shift"] && il > 0.1;
    const SPEED = sprinting ? 8.0 : 5.0, ACC = 14;
    vel.x += (wx * SPEED - vel.x) * Math.min(1, ACC * dt);
    vel.z += (wz * SPEED - vel.z) * Math.min(1, ACC * dt);
    knight.position.x += vel.x * dt;
    knight.position.z += vel.z * dt;

    // bounds + colliders
    const kr = Math.hypot(knight.position.x, knight.position.z);
    if (kr > BOUND) {
      knight.position.x *= BOUND / kr;
      knight.position.z *= BOUND / kr;
    }
    for (const c of colliders) {
      const dx = knight.position.x - c.x, dz = knight.position.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + 0.45;
      if (d < min && d > 0.001) {
        knight.position.x = c.x + (dx / d) * min;
        knight.position.z = c.z + (dz / d) * min;
      }
    }

    // facing + walk animation
    const speed = Math.hypot(vel.x, vel.z);
    const moving = speed > 0.4;
    if (moving) {
      const target = Math.atan2(vel.x, vel.z);
      knight.rotation.y = lerpAngle(knight.rotation.y, target, Math.min(1, 12 * dt));
    }
    const ratio = Math.min(1, speed / SPEED);
    const ph = t * 9 * Math.min(1, ratio + 0.15);
    const amp = 0.55 * ratio;

    const proc = knight.getObjectByName("procKnight");
    if (proc && proc.visible) {
      const u = proc.userData;
      u.legL.rotation.x = Math.sin(ph) * amp;
      u.legR.rotation.x = -Math.sin(ph) * amp;
      u.armL.rotation.x = -Math.sin(ph) * amp * 0.8;
      u.armR.rotation.x = Math.sin(ph) * amp * 0.8;
      u.cape.rotation.x = 0.12 + Math.min(0.5, speed * 0.09) + Math.sin(t * 3) * 0.04;
      proc.position.y = Math.abs(Math.sin(ph)) * 0.05 * ratio + Math.sin(t * 1.8) * 0.012;
    }

    if (mixer) {
      // walk clip: full speed walking, 1.45x sprinting, frozen (0.02) at idle
      const targetAnim = moving ? (sprinting ? 1.45 : 1) : 0.02;
      animSpeed += (targetAnim - animSpeed) * Math.min(1, 9 * dt);
      mixer.update(dt * animSpeed);
    } else if (glbModel) {
      // GLB without baked animation: drive it ourselves
      if (rig) {
        const b = rig.bones, base = rig.base;
        b.legL.rotation.x = base.legL + Math.sin(ph) * amp;
        b.legR.rotation.x = base.legR - Math.sin(ph) * amp;
        if (b.armL) b.armL.rotation.x = base.armL - Math.sin(ph) * amp * 0.7;
        if (b.armR) b.armR.rotation.x = base.armR + Math.sin(ph) * amp * 0.7;
        if (b.spine) b.spine.rotation.x = base.spine + ratio * 0.07 + Math.sin(t * 1.8) * 0.015;
      }
      // whole-body locomotion feel: footstep bob + lean into acceleration + idle breathe
      glbModel.position.y = glbBaseY + Math.abs(Math.sin(ph)) * 0.06 * ratio + Math.sin(t * 1.8) * 0.012;
      glbModel.rotation.x = ratio * 0.09;                       // lean forward while running
      glbModel.rotation.z = Math.sin(ph) * 0.03 * ratio;        // subtle step sway
    }

    /* -- camera chase -- */
    // footstep sounds synced to the walk cycle (each footfall = sin crossing)
    if (moving && Math.sin(ph) * Math.sin(stepPhase) < 0 && window.SFX) SFX.play("step");
    stepPhase = ph;

    // auto-align behind the knight only when moving and not recently dragged
    if (moving && performance.now() - lastDragT > 1800) {
      camYaw = lerpAngle(camYaw, Math.atan2(vel.x, vel.z), Math.min(1, 1.6 * dt));
    }
    const targetFov = sprinting ? 62 : 55;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * 0.08;
      camera.updateProjectionMatrix();
    }
    const hd = camDist * Math.cos(camPitch);           // horizontal orbit radius
    const ch = 1.0 + camDist * Math.sin(camPitch);     // camera height from pitch
    const tx = knight.position.x - Math.sin(camYaw) * hd;
    const tz = knight.position.z - Math.cos(camYaw) * hd;
    camera.position.x += (tx - camera.position.x) * Math.min(1, 6 * dt);
    camera.position.z += (tz - camera.position.z) * Math.min(1, 6 * dt);
    camera.position.y += (ch - camera.position.y) * Math.min(1, 6 * dt);
    camera.lookAt(knight.position.x, 1.4, knight.position.z);

    /* -- interactions: nearest stone or the bonfire -- */
    let best = null, bestD = 3.4;
    for (const s of stones) {
      const d = Math.hypot(knight.position.x - s.x, knight.position.z - s.z);
      if (d < bestD) { bestD = d; best = s; }
    }
    if (chestObj && !chestOpened && !best) {
      const d = Math.hypot(knight.position.x + 8.2, knight.position.z - 7.6);
      if (d < 2.6) best = { chest: true, title: "Open the Chest" };
    }
    const fireD = Math.hypot(knight.position.x, knight.position.z);
    if (fireD < 3.0 && !best) best = { bonfire: true, title: "Rest at the Bonfire" };
    const keyOf = (o) => o ? (o.slug || (o.bonfire && "bonfire") || (o.chest && "chest")) : null;
    if (keyOf(best) !== keyOf(nearTarget)) {
      nearTarget = best;
      if (best && window.SFX) SFX.play("tick");
      updatePrompt();
    }

    /* -- collectible runes: bob, spin, gather on touch -- */
    for (const r of runes) {
      if (r.got) continue;
      r.m.rotation.y = t * 2 + r.ph;
      r.m.position.y = 1.0 + Math.sin(t * 2.4 + r.ph) * 0.18;
      const d = Math.hypot(knight.position.x - r.x, knight.position.z - r.z);
      if (d < 1.5) {
        r.got = true;
        scene.remove(r.m);
        runesGot++;
        if (window.SFX) SFX.play("chime");
        updateRunesHUD();
        if (runesGot === runes.length && window.__toast) __toast("All Runes Gathered — True Tarnished");
      }
    }

    /* -- ground mist drifts slowly -- */
    for (const ms of mists) {
      ms.sp.position.x += Math.sin(t * 0.11 + ms.ph) * 0.006;
      ms.sp.position.z += Math.cos(t * 0.09 + ms.ph) * 0.006;
      ms.sp.material.opacity = 0.08 + Math.sin(t * 0.4 + ms.ph) * 0.035;
    }

    /* -- torches: light the nearest few (perf budget) -- */
    let lit = 0;
    for (const tf of torchLights) {
      const d = Math.hypot(knight.position.x - tf.x, knight.position.z - tf.z);
      tf.light.intensity = (d < 26 && lit < 5)
        ? (lit++, 1.15 + Math.sin(t * 9.5 + tf.x * 3.1) * 0.25)
        : 0;
    }

    // stone highlight + labels fade by distance
    for (const s of stones) {
      const d = Math.hypot(knight.position.x - s.x, knight.position.z - s.z);
      const isNear = nearTarget === s;
      s.body.material[4].emissive = s.body.material[4].emissive || new THREE.Color(0);
      const targetGlow = isNear ? 0.55 : 0;
      s.baseEmissive += (targetGlow - s.baseEmissive) * 0.1;
      s.body.material[4].emissive.setRGB(s.baseEmissive * 1.0, s.baseEmissive * 0.55, s.baseEmissive * 0.2);
      s.label.material.opacity += ((d < 7 ? (isNear ? 1 : 0.55) : 0) - s.label.material.opacity) * 0.08;
    }

    /* -- fire + embers -- */
    flare = Math.max(0, flare - dt * 2);
    fireLight.intensity = 2.2 + Math.sin(t * 9.3) * 0.3 + Math.random() * 0.15 + flare;
    for (let i = 0; i < firePts.meta.length; i++) {
      const m = firePts.meta[i];
      m.age += dt;
      if (m.age >= m.life) { firePts.meta[i] = fSpawn(firePts.pos, i, false); continue; }
      firePts.pos[i * 3 + 1] += m.vy * dt;
    }
    firePts.geo.attributes.position.needsUpdate = true;
    for (let i = 0; i < emberPts.n; i++) {
      emberPts.pos[i * 3 + 1] += dt * 0.3;
      if (emberPts.pos[i * 3 + 1] > 8) emberPts.pos[i * 3 + 1] = 0;
    }
    emberPts.geo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  function updatePrompt() {
    const wrap = document.getElementById("hub-prompt");
    const text = document.getElementById("hub-prompt-text");
    const btn = document.getElementById("hub-interact");
    if (!wrap) return;
    if (nearTarget) {
      text.textContent = (nearTarget.bonfire || nearTarget.chest) ? nearTarget.title : `Examine — ${nearTarget.title}`;
      wrap.classList.add("show");
      btn?.classList.add("show");
    } else {
      wrap.classList.remove("show");
      btn?.classList.remove("show");
    }
  }

  /* ---------------------------------------------------------------- utils */
  function lerpAngle(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  function resize() {
    if (!renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function hasWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  /* ---- entry button ---- */
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("enter-hold")?.addEventListener("click", (e) => {
      e.preventDefault();
      enter();
    });
  });
})();
