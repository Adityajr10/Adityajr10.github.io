/* =============================================================================
   LOCK-ON CURSOR — 3D sword edition.
   A GLB sword (assets/sword.glb) follows the mouse everywhere on the site,
   tilting with movement and swinging on click. Hovering anything interactive
   snaps four gold lock-on brackets around it (Souls targeting).
   No sword file / no WebGL -> falls back to the ember dot + gold ring.
   Desktop pointer devices only.
============================================================================= */
(function () {
  const fine = window.matchMedia("(pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine) return;

  const INTERACTIVE = "a, button, .card, .pill, .skill-node, input, textarea, [role='button']";

  const root = document.createElement("div");
  root.id = "cursor";
  root.innerHTML = `
    <div class="cur-dot"></div>
    <div class="cur-ring"></div>
    <div class="cur-box">
      <span class="b tl"></span><span class="b tr"></span>
      <span class="b bl"></span><span class="b br"></span>
    </div>`;
  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(root);
    document.body.classList.add("custom-cursor");
    initSword();
  });

  const dot = root.querySelector(".cur-dot");
  const ring = root.querySelector(".cur-ring");
  const box = root.querySelector(".cur-box");

  let mx = -100, my = -100;           // mouse
  let rx = -100, ry = -100;           // trailing (ring / sword)
  let target = null;                  // locked element
  let bx = 0, by = 0, bw = 0, bh = 0; // bracket rect (lerped)
  let swing = 0;                      // click swing impulse

  /* ------------------------------------------------------------ 3D sword */
  let sw = null; // { renderer, scene, camera, group }
  function initSword() {
    if (!window.THREE || !THREE.GLTFLoader) return;
    try {
      new THREE.GLTFLoader().load("assets/sword.glb", (gltf) => {
        const cv = document.createElement("canvas");
        cv.id = "cursor-3d";
        document.body.appendChild(cv);
        const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -400, 400); // px units
        scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const key = new THREE.DirectionalLight(0xfff2dd, 1.1);
        key.position.set(-120, 200, 160);
        scene.add(key);
        const ember = new THREE.PointLight(0xff6b35, 0.9, 0, 2);
        ember.position.set(60, -80, 120);
        scene.add(ember);

        // normalize: blade along +Y inside an inner group, sized ~72px
        const model = gltf.scene;
        const box3 = new THREE.Box3().setFromObject(model);
        const dim = new THREE.Vector3(); box3.getSize(dim);
        const ctr = new THREE.Vector3(); box3.getCenter(ctr);
        model.position.sub(ctr); // center on origin
        const inner = new THREE.Group();
        inner.add(model);
        if (dim.x >= dim.y && dim.x >= dim.z) inner.rotation.z = -Math.PI / 2;      // length on X -> Y
        else if (dim.z >= dim.x && dim.z >= dim.y) inner.rotation.x = -Math.PI / 2; // length on Z -> Y
        const len = Math.max(dim.x, dim.y, dim.z) || 1;
        inner.scale.setScalar(72 / len);

        const group = new THREE.Group();
        group.add(inner);
        group.rotation.z = -0.55; // resting pose: tip up-left, like a cursor arrow
        scene.add(group);

        sw = { renderer, scene, camera, group };
        root.classList.add("has-sword"); // hides the fallback ring
        resize();
        window.addEventListener("resize", resize);
      }, undefined, () => { /* no sword.glb — ring fallback stays */ });
    } catch (e) { /* keep fallback */ }
  }
  function resize() {
    if (!sw) return;
    const w = window.innerWidth, h = window.innerHeight;
    sw.renderer.setSize(w, h, false);
    sw.camera.left = 0; sw.camera.right = w;
    sw.camera.top = h; sw.camera.bottom = 0;
    sw.camera.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------- events */
  document.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest(INTERACTIVE);
    if (el !== target) {
      target = el;
      root.classList.toggle("locked", !!target);
      if (target && bw === 0) { bx = mx; by = my; bw = 10; bh = 10; }
    }
  }, { passive: true });
  document.addEventListener("mouseout", (e) => {
    if (target && !e.relatedTarget?.closest?.(INTERACTIVE)) {
      target = null;
      root.classList.remove("locked");
    }
  }, { passive: true });
  document.addEventListener("mousedown", () => { root.classList.add("down"); swing = 1; });
  document.addEventListener("mouseup", () => root.classList.remove("down"));

  /* --------------------------------------------------------------- loop */
  const LERP = reduced ? 1 : 0.22;
  let prevRx = 0;
  function frame(now) {
    const t = (now || 0) / 1000;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    rx += (mx - rx) * LERP; ry += (my - ry) * LERP;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;

    if (sw) {
      const vx = rx - prevRx; prevRx = rx;
      swing = Math.max(0, swing - 0.06);
      const g = sw.group;
      // hilt sits a little below-right of the hotspot so the tip tracks the dot
      g.position.set(rx + 14, window.innerHeight - ry - 26, 0);
      g.rotation.z = -0.55
        - Math.min(0.5, Math.max(-0.5, vx * 0.02))     // lean into motion
        - Math.sin(swing * Math.PI) * 0.9              // click swing
        + (reduced ? 0 : Math.sin(t * 1.6) * 0.04);    // idle sway
      g.rotation.y = reduced ? 0 : Math.sin(t * 0.9) * 0.35; // slow show-off turn
      sw.renderer.render(sw.scene, sw.camera);
    }

    if (target && target.isConnected) {
      const r = target.getBoundingClientRect();
      const pad = Math.min(10, Math.max(4, r.width * 0.03));
      bx += (r.left - pad - bx) * LERP;
      by += (r.top - pad - by) * LERP;
      bw += (r.width + pad * 2 - bw) * LERP;
      bh += (r.height + pad * 2 - bh) * LERP;
      box.style.transform = `translate(${bx}px, ${by}px)`;
      box.style.width = bw + "px";
      box.style.height = bh + "px";
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
