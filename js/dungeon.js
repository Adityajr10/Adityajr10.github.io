/* =============================================================================
   DUNGEON — scroll-driven 3D corridor behind the page (Jesse Zhou-style).
   A fixed WebGL layer renders a torch-lit stone corridor; the camera advances
   along it with scroll progress, so the whole page feels like walking deeper
   into a castle. Sections sit above it with slightly-translucent backgrounds.
   Skipped on mobile, reduced-motion, or missing WebGL.
============================================================================= */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || window.innerWidth < 900 || !window.THREE) return;

  const canvas = document.getElementById("dungeon-canvas");
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  } catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0c);
  scene.fog = new THREE.Fog(0x0a0a0c, 3, 42);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 120);

  const LEN = 170;              // corridor length in world units
  const SEG = 13;               // pillar pairs

  /* ---- lighting: dim ambient + a lantern that travels with the camera ---- */
  scene.add(new THREE.AmbientLight(0x14100e, 1.6));
  const lantern = new THREE.PointLight(0xff8a3c, 1.6, 26, 1.8);
  scene.add(lantern);

  /* ---- floor + walls ---- */
  const stone = new THREE.MeshLambertMaterial({ color: 0x191519 });
  const darkStone = new THREE.MeshLambertMaterial({ color: 0x121014 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, LEN + 40), stone);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -2.6, -LEN / 2);
  scene.add(floor);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 40, 16), darkStone);
    wall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    wall.position.set(side * 7, 3, -LEN / 2);
    scene.add(wall);
  }

  /* ---- pillars, crossbeams, torches ---- */
  const pillarGeo = new THREE.CylinderGeometry(0.55, 0.7, 11, 8);
  const beamGeo = new THREE.BoxGeometry(11.4, 0.8, 1.1);
  const torchFlames = [];
  const flameGeo = new THREE.ConeGeometry(0.22, 0.7, 6);

  for (let i = 0; i < SEG; i++) {
    const z = -6 - i * (LEN / SEG);
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(pillarGeo, stone);
      p.position.set(side * 5.6, 2.9, z);
      scene.add(p);

      if (i % 2 === 0) { // torch on every other pair
        const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({
          color: 0xff8a3c, transparent: true, opacity: 0.95,
        }));
        flame.position.set(side * 5.0, 2.4, z + 0.3);
        scene.add(flame);
        const glow = new THREE.PointLight(0xff6b35, 0.0, 9, 2); // lit only when near (perf)
        glow.position.copy(flame.position);
        scene.add(glow);
        torchFlames.push({ flame, glow, z });
      }
    }
    // crossbeam arch
    const beam = new THREE.Mesh(beamGeo, darkStone);
    beam.position.set(0, 8.2, z);
    scene.add(beam);
  }

  /* ---- gold rune strip on the floor (leads the eye forward) ---- */
  const runeStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, LEN + 20),
    new THREE.MeshBasicMaterial({ color: 0xc9a961, transparent: true, opacity: 0.16 })
  );
  runeStrip.rotation.x = -Math.PI / 2;
  runeStrip.position.set(0, -2.58, -LEN / 2);
  scene.add(runeStrip);

  /* ---- drifting dungeon embers ---- */
  const N = 300;
  const pPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 13;
    pPos[i * 3 + 1] = -2 + Math.random() * 10;
    pPos[i * 3 + 2] = -Math.random() * LEN;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0xff6b35, size: 0.06, transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(points);

  /* ---- scroll → camera travel ---- */
  let progress = 0;
  function readScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight || 1;
    progress = Math.min(1, Math.max(0, h.scrollTop / max));
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  let mx = 0;
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX / window.innerWidth - 0.5;
  }, { passive: true });

  let camZ = 2;
  let last = performance.now();
  let hidden = false;
  document.addEventListener("visibilitychange", () => { hidden = document.hidden; });

  function loop(now) {
    requestAnimationFrame(loop);
    if (hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    // ease toward scroll target depth
    const targetZ = 2 - progress * (LEN - 14);
    camZ += (targetZ - camZ) * 0.06;
    camera.position.set(mx * 1.2, 0.6 + Math.sin(t * 0.8) * 0.08, camZ);
    camera.lookAt(mx * 2.4, 0.4, camZ - 10);

    lantern.position.set(0, 1.6, camZ - 2.5);
    lantern.intensity = 1.5 + Math.sin(t * 8.7) * 0.18 + Math.random() * 0.1;

    // animate + budget torch lights: only the 4 nearest are lit
    let lit = 0;
    for (const tf of torchFlames) {
      const d = Math.abs(tf.z - camZ);
      const near = d < 22 && lit < 4;
      tf.glow.intensity = near ? (lit++, 0.9 + Math.sin(t * 10 + tf.z) * 0.3) : 0;
      tf.flame.scale.y = 1 + Math.sin(t * 12 + tf.z * 3.1) * 0.18;
      tf.flame.rotation.y = t * 2 + tf.z;
    }

    // embers drift up, recycle
    for (let i = 0; i < N; i++) {
      pPos[i * 3 + 1] += dt * 0.35;
      if (pPos[i * 3 + 1] > 9) pPos[i * 3 + 1] = -2;
    }
    pGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
})();
