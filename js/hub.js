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
  let bound = 22.5;                   // walkable radius of the current world
  let worlds = {};                    // world name -> saved scene state
  let worldName = "";
  let portals = [];                   // travel gates in the current world
  let extras = [];                    // animated world objects (skeletons, ...)
  let hintShown = false;

  /* soft round particle sprite (fixes square-looking fire) */
  let dotTexCache = null;
  function softDotTexture() {
    if (dotTexCache) return dotTexCache;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    dotTexCache = new THREE.CanvasTexture(c);
    return dotTexCache;
  }

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
    showReveal(worldName === "battlefield" ? "The Ashen Battlefield" : "Roundtable Hold");
    if (!hintShown) {
      hintShown = true;
      setTimeout(() => { if (active && window.__toast) __toast("A golden gate shimmers by the eastern wall…"); }, 7000);
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
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 340);
    buildKnight();
    tryLoadGLB(); // player model — world-independent
    wireInput();
    window.addEventListener("resize", resize);
    enterWorld("hold", [0, 6.5]);
  }

  /* ======================================================= WORLD MANAGEMENT */
  function saveWorld() {
    if (!scene) return;
    worlds[worldName] = {
      scene, colliders, stones, torchLights, runes, runesGot,
      chestObj, chestOpened, mists, portals, extras, fireLight, firePts, emberPts, bound,
    };
  }

  function enterWorld(name, spawn) {
    saveWorld();
    nearTarget = null;
    worldName = name;
    const w = worlds[name];
    if (w) {
      ({ scene, colliders, stones, torchLights, runes, runesGot,
         chestObj, chestOpened, mists, portals, extras, fireLight, firePts, emberPts, bound } = w);
    } else {
      scene = new THREE.Scene();
      colliders = []; stones = []; torchLights = []; runes = []; runesGot = 0;
      chestObj = null; chestOpened = false; mists = []; portals = []; extras = [];
      fireLight = null; firePts = null; emberPts = null;
      if (name === "battlefield") buildBattlefield(); else buildHold();
    }
    scene.add(knight);
    knight.position.set(spawn[0], 0, spawn[1]);
    const face = Math.atan2(-spawn[0], -spawn[1]);
    knight.rotation.y = face;
    camYaw = face;
    vel.x = vel.z = 0;
    updatePrompt();
    updateRunesHUD();
  }

  function showReveal(title) {
    const reveal = document.getElementById("area-reveal");
    if (!reveal) return;
    reveal.querySelector(".area-reveal-title").textContent = title;
    reveal.classList.remove("show"); void reveal.offsetWidth; reveal.classList.add("show");
    setTimeout(() => reveal.classList.remove("show"), 2000);
  }

  /* ============================================== WORLD 1: ROUNDTABLE HOLD */
  function buildHold() {
    bound = 22.5;
    scene.background = new THREE.Color(0x0b0a12);
    scene.fog = new THREE.Fog(0x0d0b14, 20, 96);

    scene.add(new THREE.HemisphereLight(0x4a4468, 0x2a1c12, 1.15));
    scene.add(new THREE.AmbientLight(0x241f2c, 0.9));
    const moon = new THREE.DirectionalLight(0x8493c8, 0.85);
    moon.position.set(-18, 30, -14);
    scene.add(moon);
    fireLight = new THREE.PointLight(0xff7a3c, 3.2, 44, 1.5);
    fireLight.position.set(0, 1.0, 0);
    scene.add(fireLight);

    addSky(150, 500, 7);

    /* ground: stone tiles + gold rune rings */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(bound + 6, 56),
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

    buildEnvironment(); // walls, shrines, graveyard, camp, mist, runes
    buildBonfire();
    buildStones({ flagship: [0, -6.4], r1: 11, r2: 16.5 });

    emberPts = makeEmbers(240, bound + 2);
    scene.add(emberPts.points);

    /* mountain silhouettes beyond the walls — the world no longer ends there */
    const MT = ["mountain_A.gltf", "mountain_B.gltf", "mountain_C.gltf"];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.45;
      envPlace(MT[i % 3], Math.cos(a) * 58, Math.sin(a) * 58, a + 2, 34);
    }

    /* the user-supplied statue */
    if (THREE.GLTFLoader) {
      const sc = scene, cols = colliders;
      new THREE.GLTFLoader().load("assets/hub/statue.glb", (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const h = box.max.y - box.min.y || 1;
        const s = 3.2 / h;
        model.scale.setScalar(s);
        model.position.set(4.5, -box.min.y * s, -4.5);
        sc.add(model);
        cols.push({ x: 4.5, z: -4.5, r: 1.4 });
      }, undefined, () => {});
    }

    /* travel gate to the battlefield — eastern wall, in the gap between stones */
    addPortal(18.3, 7.6, "battlefield", [0, 32], "The Ashen Battlefield");
  }

  /* shared night sky: star dome + moon */
  function addSky(radius, starCount, moonSize) {
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.85);
      starPos[i * 3] = radius * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = radius * Math.cos(ph) + 2;
      starPos[i * 3 + 2] = radius * Math.sin(ph) * Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      map: softDotTexture(), color: 0xd8dcf0, size: radius * 0.004, transparent: true,
      opacity: 0.85, sizeAttenuation: true, fog: false, depthWrite: false,
    })));
    const mx = -radius * 0.47, my = radius * 0.52, mz = -radius * 0.63;
    const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(moonSize, 32),
      new THREE.MeshBasicMaterial({ color: 0xcfd6ee, fog: false }));
    moonDisc.position.set(mx, my, mz);
    moonDisc.lookAt(0, 0, 0);
    scene.add(moonDisc);
    const moonGlow = new THREE.Mesh(new THREE.CircleGeometry(moonSize * 1.85, 32),
      new THREE.MeshBasicMaterial({ color: 0x8b96c8, transparent: true, opacity: 0.22, fog: false }));
    moonGlow.position.set(mx, my, mz);
    moonGlow.lookAt(0, 0, 0);
    moonGlow.translateZ(-0.5);
    scene.add(moonGlow);
  }

  /* golden travel portal + arch */
  let portalTexCache = null;
  function portalTexture() {
    if (portalTexCache) return portalTexCache;
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 8, 128, 128, 128);
    g.addColorStop(0, "rgba(255,220,150,0.95)");
    g.addColorStop(0.45, "rgba(255,150,60,0.4)");
    g.addColorStop(1, "rgba(255,120,40,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    portalTexCache = new THREE.CanvasTexture(c);
    return portalTexCache;
  }
  function addPortal(x, z, dest, spawn, title) {
    const sc = scene;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.4), new THREE.MeshBasicMaterial({
      map: portalTexture(), transparent: true, opacity: 0.75, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    mesh.position.set(x, 1.9, z);
    mesh.lookAt(0, 1.9, 0);
    sc.add(mesh);
    const light = new THREE.PointLight(0xffb86b, 1.4, 12, 2);
    light.position.set(x, 2.2, z);
    sc.add(light);
    const rr = Math.hypot(x, z) || 1;
    envPlace("arch_gate.gltf", x * ((rr + 1.3) / rr), z * ((rr + 1.3) / rr), Math.atan2(-x, -z), 4.4);
    portals.push({ x, z, dest, spawn, title, mesh, light });
  }

  /* ======================================== WORLD 2: THE ASHEN BATTLEFIELD */
  function buildBattlefield() {
    bound = 38;
    scene.background = new THREE.Color(0x0a0910);
    scene.fog = new THREE.Fog(0x0c0a12, 30, 165);

    scene.add(new THREE.HemisphereLight(0x504a6e, 0x2c1c10, 1.25));
    scene.add(new THREE.AmbientLight(0x262032, 0.95));
    const moon = new THREE.DirectionalLight(0x8a97cc, 1.0);
    moon.position.set(26, 44, -22);
    scene.add(moon);
    fireLight = new THREE.PointLight(0xff7a3c, 3.0, 42, 1.5);
    fireLight.position.set(0, 1.0, 0);
    scene.add(fireLight);

    addSky(240, 800, 12);

    /* scorched-earth ground */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(bound + 40, 64),
      new THREE.MeshLambertMaterial({ map: makeScorchedTexture(), color: 0xb8afa6 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    buildBonfire(); // the war pyre
    buildStones({ flagship: [0, -15], r1: 19, r2: 28 });

    /* ---- the red castle looms north ---- */
    envPlace("building_castle_red.gltf", 0, -34, 0, 22, 8);
    envPlace("building_tower_A_red.gltf", -14, -30, 0.15, 7.5, 2.4);
    envPlace("building_tower_B_red.gltf", 14, -30, -0.15, 7.5, 2.4);
    envPlace("wall_straight.gltf", -8, -27.5, 0, 9, 3.2);
    envPlace("wall_straight.gltf", 8, -27.5, 0, 9, 3.2);
    envPlace("wall_straight_gate.gltf", 0, -27.5, 0, 8);
    envPlace("flag_red.gltf", -3.6, -24.8, 0.3, 1.5);
    envPlace("flag_red.gltf", 3.6, -24.8, -0.3, 1.5);

    /* ---- village ruins east and west ---- */
    envPlace("building_destroyed.gltf", 25, 11, -0.9, 9, 3.4);
    envPlace("building_home_A_red.gltf", 29, 3, -1.2, 6, 2.4);
    envPlace("building_church_red.gltf", 27, -9, -1.4, 10, 3.4);
    envPlace("building_destroyed.gltf", -26, 7, 1.1, 8, 3.2);
    envPlace("building_home_B_red.gltf", -29, -3, 1.4, 6, 2.4);
    envPlace("building_barracks_red.gltf", -24, 13, 0.9, 7.5, 2.8);

    /* ---- horizon: mountain ring + wooded hills (the world feels vast) ---- */
    const MT = ["mountain_A.gltf", "mountain_B.gltf", "mountain_C.gltf"];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2;
      envPlace(MT[i % 3], Math.cos(a) * 105, Math.sin(a) * 105, a + 1.2, 60);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.85;
      envPlace("hills_A_trees.gltf", Math.cos(a) * 66, Math.sin(a) * 66, a, 30);
    }

    /* ---- trees + rocks scattered inside ---- */
    const veg = [
      ["trees_A_large.gltf", -16, -20, 7, 1.4], ["trees_B_medium.gltf", 20, 20, 5.5, 1.2],
      ["trees_A_large.gltf", 30, -18, 7, 1.4], ["tree_single_A.gltf", -12, 22, 4, 0.7],
      ["trees_B_medium.gltf", -31, 14, 5.5, 1.2], ["tree_single_A.gltf", 11, 30, 4.5, 0.7],
      ["rock_single_A.gltf", 7, 21, 2.2, 1.0], ["rock_single_B.gltf", -19, 3, 2.4, 1.1],
      ["rock_single_C.gltf", 15, -12, 2.0, 0.9], ["rock_single_A.gltf", -8, 27, 2.6, 1.2],
    ];
    for (const [n, x, z, s, c] of veg) envPlace(n, x, z, Math.random() * 6.28, s, c);

    /* ---- battlefield litter: planted swords, flags, supplies ---- */
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 16;
      envPlace(i % 3 ? "sword_shield.glb" : "sword_shield_gold.glb",
        Math.cos(a) * r, Math.sin(a) * r, Math.random() * 6.28, 1.15)
        .then((m) => { if (m) { m.rotation.z = (Math.random() - 0.5) * 0.5; m.rotation.x = (Math.random() - 0.5) * 0.3; } });
    }
    envPlace("bucket_arrows.gltf", 4.5, -23, 0.4, 1.1, 0.5);
    envPlace("crate_A_big.gltf", -4.8, -22.6, 0.9, 1.6, 0.9);
    envPlace("rubble_large", 10, 8, 1.2, 2.0, 1.1);
    envPlace("rubble_large", -13, -10, 2.4, 1.7, 1.0);
    envPlace("chest_gold.glb", 23, 15, -2.2, 1.5, 0.9).then((m) => { chestObj = m; });
    envPlace("coin_stack.glb", 21.8, 16.2, 0, 0.5);

    /* ---- fallen legion: animated skeletons that collapse when you charge them ---- */
    const SK = ["Skeleton_Warrior.glb", "Skeleton_Minion.glb", "Skeleton_Rogue.glb", "Skeleton_Mage.glb"];
    const skSpots = [[5, -8], [-9, -4], [12, 4], [-15, 10], [8, 15], [-6, 19], [17, -9], [-19, -12]];
    skSpots.forEach(([x, z], i) => {
      envPlace(SK[i % 4], x, z, Math.random() * 6.28, 1.65, 0.5, true).then((m) => {
        if (!m) return;
        const ex = { type: "skeleton", obj: m, x, z, falling: false, fallen: 0 };
        const anims = m.userData.animations || [];
        if (anims.length) {
          const idle = anims.find((a) => /idle/i.test(a.name)) || anims[0];
          ex.mixer = new THREE.AnimationMixer(m);
          ex.mixer.clipAction(idle).play();
        }
        extras.push(ex);
      });
    });

    addRunes([[6, -19], [-14, -18], [22, -2], [-23, 2], [16, 24],
              [-17, 24], [31, 8], [-32, -8], [3, 33], [-4, -25]]);
    addMists(11, 26);
    emberPts = makeEmbers(420, bound + 4);
    scene.add(emberPts.points);

    /* return gate, south — where you arrive */
    addPortal(0, 35.2, "hold", [15.8, 6.6], "Roundtable Hold");
  }

  /* scorched battlefield ground texture */
  function makeScorchedTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const x = c.getContext("2d");
    x.fillStyle = "#181310"; x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 260; i++) { // earth mottling
      const g = 18 + Math.floor(Math.random() * 16);
      x.fillStyle = `rgba(${g + 8},${g},${g - 4},0.5)`;
      x.beginPath();
      x.ellipse(Math.random() * 1024, Math.random() * 1024, 20 + Math.random() * 70, 12 + Math.random() * 40, Math.random() * 3, 0, 7);
      x.fill();
    }
    for (let i = 0; i < 26; i++) { // ash-grey scorch patches
      x.fillStyle = "rgba(60,58,62,0.25)";
      x.beginPath();
      x.ellipse(Math.random() * 1024, Math.random() * 1024, 26 + Math.random() * 60, 18 + Math.random() * 40, Math.random() * 3, 0, 7);
      x.fill();
    }
    for (let i = 0; i < 12; i++) { // dried blood stains
      x.fillStyle = "rgba(80,16,10,0.18)";
      x.beginPath();
      x.ellipse(Math.random() * 1024, Math.random() * 1024, 14 + Math.random() * 30, 10 + Math.random() * 22, Math.random() * 3, 0, 7);
      x.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }

  /* drifting ground mist for the current world */
  let mistTexCache = null;
  function addMists(count, spread) {
    if (!mistTexCache) {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
      g.addColorStop(0, "rgba(200,205,230,0.55)");
      g.addColorStop(1, "rgba(200,205,230,0)");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      mistTexCache = new THREE.CanvasTexture(c);
    }
    for (let i = 0; i < count; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mistTexCache, transparent: true, opacity: 0.10, depthWrite: false,
      }));
      const a = (i / count) * Math.PI * 2;
      const r = spread * (0.35 + (i % 3) * 0.3);
      sp.position.set(Math.cos(a) * r, 0.8, Math.sin(a) * r);
      sp.scale.set(14 + (i % 3) * 5, 4.8, 1);
      scene.add(sp);
      mists.push({ sp, ph: i * 1.9 });
    }
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
      envLoader.load("assets/hub/env/" + file,
        (g) => res({ scene: g.scene, animations: g.animations || [] }),
        undefined, () => res(null))));
  }

  // envPlace(): clone a loaded model, scale so its largest XZ side = `size`
  // (or its height if byHeight), drop it on the floor at (x,z) facing `ry`.
  async function envPlace(name, x, z, ry, size, colR, byHeight) {
    const sc = scene, cols = colliders; // capture — async load may finish after a world switch
    const asset = await envLoad(name);
    if (!asset) return null;
    let skinned = false;
    asset.scene.traverse((o) => { if (o.isSkinnedMesh) skinned = true; });
    const m = (skinned && THREE.SkeletonUtils)
      ? THREE.SkeletonUtils.clone(asset.scene)
      : asset.scene.clone(true);
    const box = new THREE.Box3().setFromObject(m);
    const dim = new THREE.Vector3(); box.getSize(dim);
    const s = size / Math.max(byHeight ? dim.y : Math.max(dim.x, dim.z), 0.001);
    m.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(m);
    m.position.set(x, -box2.min.y, z);
    m.rotation.y = ry;
    m.userData.animations = asset.animations;
    sc.add(m);
    if (colR) cols.push({ x, z, r: colR });
    return m;
  }

  /* ---- the medieval hold: walls, shrines, graveyard, camp, mist ---- */
  function buildEnvironment() {
    if (!THREE.GLTFLoader) return;

    /* -- fortress wall ring: 20 segments, varied, facing inward -- */
    const WR = bound + 2.2;
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
    addRunes(runeSpots);
  }

  /* collectible rune coins — usable by any world */
  function addRunes(spots) {
    const sc = scene, rn = runes; // capture for the async load
    envLoad("coin").then((asset) => {
      if (!asset) return;
      const src = asset.scene;
      spots.forEach(([x, z], i) => {
        const m = src.clone(true);
        m.scale.setScalar(2.2);
        m.position.set(x, 1.0, z);
        m.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xc98a20); o.material.emissiveIntensity = 0.6; } });
        sc.add(m);
        rn.push({ m, x, z, got: false, ph: i * 1.3 });
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
  function buildStones(cfg) {
    const P = window.PORTFOLIO;
    const list = [
      { slug: P.featured.slug, title: P.featured.title, flagship: true },
      ...P.projects.map((p) => ({ slug: p.slug, title: p.title })),
    ];
    const ring1 = list.slice(1, 9), ring2 = list.slice(9);

    placeStone(list[0], cfg.flagship[0], cfg.flagship[1]); // flagship front-and-center
    ring1.forEach((p, i) => {
      const a = Math.PI * 2 * (i / ring1.length) + Math.PI / ring1.length;
      placeStone(p, Math.sin(a) * cfg.r1, Math.cos(a) * cfg.r1);
    });
    ring2.forEach((p, i) => {
      const a = Math.PI * 2 * (i / ring2.length);
      placeStone(p, Math.sin(a) * cfg.r2, Math.cos(a) * cfg.r2);
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
    // added to the active scene by enterWorld()
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
    glb.statue = "moved to buildHold";
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
      map: softDotTexture(), color: 0xff8a3c, size: 0.42, transparent: true, opacity: 0.9,
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
      map: softDotTexture(), color: 0xff6b35, size: 0.1, transparent: true, opacity: 0.7,
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
    if (nearTarget.portal) {
      const { dest, spawn } = nearTarget;
      const title = dest === "battlefield" ? "The Ashen Battlefield" : "Roundtable Hold";
      if (window.SFX) SFX.play("rest");
      showReveal(title);
      enterWorld(dest, spawn);
      if (window.__toast) __toast("New Area — " + title);
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
    if (kr > bound) {
      knight.position.x *= bound / kr;
      knight.position.z *= bound / kr;
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
      const d = Math.hypot(knight.position.x - chestObj.position.x, knight.position.z - chestObj.position.z);
      if (d < 2.6) best = { chest: true, title: "Open the Chest" };
    }
    if (!best) {
      for (const p of portals) {
        const d = Math.hypot(knight.position.x - p.x, knight.position.z - p.z);
        if (d < 3.0) { best = { portal: true, dest: p.dest, spawn: p.spawn, title: "Travel — " + p.title }; break; }
      }
    }
    const fireD = Math.hypot(knight.position.x, knight.position.z);
    if (fireD < 3.0 && !best) best = { bonfire: true, title: "Rest at the Bonfire" };
    const keyOf = (o) => o ? (o.slug || (o.bonfire && "bonfire") || (o.chest && "chest") || (o.portal && "portal:" + o.dest)) : null;
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

    /* -- portals shimmer -- */
    for (const p of portals) {
      p.mesh.scale.setScalar(1 + Math.sin(t * 2.3) * 0.06);
      p.mesh.material.opacity = 0.6 + Math.sin(t * 3.1) * 0.18;
      p.light.intensity = 1.2 + Math.sin(t * 5.7) * 0.35;
    }

    /* -- skeletons: idle animation; collapse when charged into -- */
    for (const ex of extras) {
      if (ex.type !== "skeleton") continue;
      if (!ex.falling) {
        if (ex.mixer) ex.mixer.update(dt);
        const d = Math.hypot(knight.position.x - ex.x, knight.position.z - ex.z);
        if (d < 1.25 && speed > 2.2) {
          ex.falling = true;
          ex.obj.rotation.y = Math.atan2(ex.x - knight.position.x, ex.z - knight.position.z); // fall away
          if (window.SFX) SFX.play("step");
        }
      } else if (ex.fallen < 1) {
        ex.fallen = Math.min(1, ex.fallen + dt * 2.6);
        const e = 1 - Math.pow(1 - ex.fallen, 2);
        ex.obj.rotation.x = -e * (Math.PI / 2 - 0.06);
      }
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
    if (fireLight) fireLight.intensity = 2.2 + Math.sin(t * 9.3) * 0.3 + Math.random() * 0.15 + flare;
    if (firePts) {
      for (let i = 0; i < firePts.meta.length; i++) {
        const m = firePts.meta[i];
        m.age += dt;
        if (m.age >= m.life) { firePts.meta[i] = fSpawn(firePts.pos, i, false); continue; }
        firePts.pos[i * 3 + 1] += m.vy * dt;
      }
      firePts.geo.attributes.position.needsUpdate = true;
    }
    if (emberPts) {
      for (let i = 0; i < emberPts.n; i++) {
        emberPts.pos[i * 3 + 1] += dt * 0.3;
        if (emberPts.pos[i * 3 + 1] > 8) emberPts.pos[i * 3 + 1] = 0;
      }
      emberPts.geo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  function updatePrompt() {
    const wrap = document.getElementById("hub-prompt");
    const text = document.getElementById("hub-prompt-text");
    const btn = document.getElementById("hub-interact");
    if (!wrap) return;
    if (nearTarget) {
      text.textContent = (nearTarget.bonfire || nearTarget.chest || nearTarget.portal)
        ? nearTarget.title : `Examine — ${nearTarget.title}`;
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
