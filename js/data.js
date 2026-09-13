/* =============================================================================
   PORTFOLIO CONTENT — single source of truth
   -----------------------------------------------------------------------------
   To add a NEW project:
     1. Create a folder  projects/<slug>/  with subfolders  photos/ videos/ shorts/
     2. Drop your media in (see ADD_A_PROJECT.md for naming).
     3. Add ONE object to the PROJECTS array below.
   Nothing else needs to change. The grid, filters, and modal rebuild themselves.

   Media paths are RELATIVE to  projects/<slug>/  — just the filename.
     cover   : one thumbnail image for the card               ("cover.jpg")
     photos  : gallery stills shown in the modal              ["photos/1.jpg"]
     videos  : full-length local clips (muted, click-to-play) ["videos/demo.mp4"]
     shorts  : 0.4–0.6s micro-clips, autoplay + loop + muted  ["shorts/1.mp4"]
     youtube : YouTube video ID (the part after v=), or null
   Any missing file degrades gracefully to a styled placeholder — never a broken icon.

   FILTER TAGS (used by the pill row): keep to this vocabulary so filtering works:
     "Unreal" · "Vulkan/C++" · "Raylib/SFML" · "VR/AR" · "Mobile" · "PS5"
============================================================================= */

window.PORTFOLIO = {

  /* ---------------------------------------------------------------------------
     PROJECT PAGE LAYOUT — how photos/shorts mix with the description text.
       "magazine" : text block → full-width photo → text → shorts strip → ...
       "side"     : two columns — text one side, media the other, alternating.
       "classic"  : the original style — all text first, then Moments + Gallery.
       "rails"    : text stays centered like classic, media fills the empty
                    left/right margins beside each paragraph (smaller sizes).
       "cinema"   : full-bleed edge-to-edge media banners between text blocks.
       "mosaic"   : all text first, then every photo/short in a collage wall
                    of mixed tile sizes.
     Switch the default here. Override per-project with  layout: "rails"
     (any mode name) on any entry in the projects array below.
  --------------------------------------------------------------------------- */
  detailLayout: "cinema",

  owner: {
    name: "ADITYA RAI",
    role: "Gameplay Programmer",
    subtitle: "Combat AI · Custom Engines · C++",
    location: "Bangalore, India",
    email: "brodyrai16@gmail.com",
    linkedin: "https://linkedin.com/in/aditya-rai10",
    github: "https://github.com/Adityajr10",
    resume: "assets/Aditya_Rai_Resume.pdf",
    platforms: ["Windows", "PS5", "Android", "iOS", "VR", "AR"],
  },

  /* The flagship. Rendered in its own big pinned section, NOT in the grid. */
  featured: {
    slug: "the-last-blood",
    title: "The Last Blood",
    kicker: "Souls-like Combat & AI System",
    tagline: "Every system Elden Ring taught me, rebuilt from scratch.",
    meta: "Unreal Engine 5 · C++ · Elden Ring-inspired",
    /* Optional intro paragraph shown at the top of its project page,
       before the four system panels. Leave "" to skip. */
    description: "",
    youtube: "365G_JaJ80o",
    media: {
      cover: "cover.jpg",
      photos: ["photos/1.jpg", "photos/2.jpg", "photos/3.jpg", "photos/4.jpg"],
      videos: ["videos/demo.mp4"],
      shorts: ["shorts/1.mp4", "shorts/2.mp4", "shorts/3.mp4"],
    },
    systems: [
      {
        name: "The AI Brain",
        body: "Layered enemy AI with 3-stage decision-making (stance → action → ability), personality profiles, weighted scoring, and priority tiers. A pattern tracker learns the player's dodge/parry habits in real time to bait and punish them.",
      },
      {
        name: "Boss Attack Director",
        body: "Designer-authored Attack Director with reactive combo edges modeled on Elden Ring's follow-up logic; a rule-based Skill System replicating boss weapon-arts; multi-phase boss kits (6+ unique skills each); pack AI coordination; adaptive weighting so bosses abandon moves the player has solved.",
      },
      {
        name: "Player Combat",
        body: "One authoritative 14-state machine drives all input: buffered combo chains, i-frame dodges, rage/stamina economies. Impact-timed parry/block resolution with posture meters that make guard-breaking a win condition. Synced animation with motion warping for cinematic finishers, executions, and grabs.",
      },
      {
        name: "Data-Driven Progression",
        body: "Per-weapon skill trees gating a 15+ ability roster, 8-slot loadouts, and save persistence. Shipping a new weapon requires zero code changes.",
      },
    ],
  },

  /* Everything below renders into the filterable grid. Add new projects here. */
  projects: [
    {
      slug: "custom-vulkan-engine",
      title: "Custom Vulkan Engine",
      tags: ["Vulkan/C++"],
      metaTags: ["Vulkan", "C++", "Custom Engine"],
      badge: null,
      blurb: "A game engine built from scratch on Vulkan — C++ core, hand-rolled renderer.",
      body: "Built a custom game engine from the ground up on Vulkan with a modern C++ core. TODO_VULKAN_DESCRIPTION — 2–3 lines on the renderer/features. Alongside it, games built in raw C++ frameworks (SFML / Raylib / SDL) — a golf game and an obstacle shooter — prove engine-independent fundamentals.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "arka",
      title: "Arka (PS5)",
      tags: ["Unreal", "PS5"],
      metaTags: ["Unreal", "C++", "PS5", "Rickshaw Studio"],
      badge: null,
      blurb: "Company PS5 title — interface-driven interaction, real-time IK, delegate-driven inventory.",
      body: "Interface-driven Interaction system (IInteractionInteractable) decoupling a GlobalInteractionComponent from all actor types; real-time IK hand-alignment (Two Bone IK, FABRIK, CCDIK). Delegate-driven Inventory with a DataTable as single source of truth (zero hardcoded C++). Zero-Tick puzzle system. Behaviour Tree enemy AI + RDR2-style InPlaceRotation reusable for creatures and humanoids. Player abilities via GAS; Health, Swimming, Zipline, and Resident Evil-style 3D Inspection as self-contained components. Resolved a 6-day team-wide build failure; owned CI/CD; authored architecture standards adopted across a 30-person team.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
   {
  slug: "dragon-ai",
  title: "Dragon AI",
  tags: ["Unreal"],
  metaTags: ["Unreal Engine 5", "C++", "AI", "Behavior Trees", "Blackboard"],
  badge: null,
  blurb: "Personality-driven combat AI where every dragon adapts and fights uniquely on a modular, data-driven architecture.",
  body: "Architected a modular C++ AI framework in Unreal Engine 5 powered by Behavior Trees, Blackboards, and AI Perception. Six personality traits drive a seven-instinct decision layer that dynamically selects from 20+ combat abilities using weighted evaluation of distance, health, energy, cooldowns, altitude, and territorial awareness. Built reusable systems for behavior, flight, abilities, stimuli, and fire-breath attacks, enabling designers to create new dragon variants and abilities through data with minimal code changes while keeping combat adaptive and scalable.",
  youtube: "ai3WyW9Xsi8",
  media: {
    cover: "cover.jpg",
    photos: ["photos/1.jpg"],
    videos: [],
    shorts: [],
  },
},
    {
      slug: "bowlbreaker",
      title: "BowlBreaker",
      tags: ["Unreal", "Mobile"],
      metaTags: ["Unreal 5", "C++", "Windows/Android/iOS"],
      badge: "IN DEVELOPMENT",
      blurb: "Bowling reimagined — 10 special-ability balls, 4-parameter throws, 6 chaotic pin modes.",
      body: "Innovative bowling game: 10 unique balls with special abilities (split-in-two, time slow, gravity pulse, ricochet). Every throw sets 4 parameters — Position, Angle, Power, Spin — across two fluid mouse/touch gesture phases; wrong combinations genuinely miss with no autocorrection. 6 dynamic pin stage modes (oscillating, chaos, inverted gravity) multiply score. A unified C++ codebase runs across all three platforms.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "kaliyugas-end",
      title: "Kaliyuga's End",
      tags: ["Mobile"],
      metaTags: ["Android/iOS", "Survival-Strategy"],
      badge: "IN DEVELOPMENT",
      blurb: "Mobile lane-shooter for Android in UE 5.6 — data-driven waves, 80-enemy crowds, C++/Blueprint hybrid.",
      body: "Mobile Lane-Shooter in Unreal Engine 5.6 (C++/Blueprint hybrid). Built a portrait-orientation survival shooter for Android from the ground up, architecting gameplay across modular C++ subsystems (world, game-instance, and FX subsystems) with Blueprint-exposed tuning so designers could iterate without touching code.",
      youtube: "FyTUMieb1Ac",
      systems: [
        { name: "Data-Driven Enemy & Wave System", body: "Designed a nested 'personality' data-asset framework where a single asset holds multiple enemy archetypes and attack profiles (identity, behaviour, projectile, tuning, presentation), letting waves be authored entirely through the editor via dropdown selection instead of duplicating dozens of assets." },
        { name: "Varied Enemy AI Behaviours", body: "Implemented and tuned 8+ distinct, visibly different enemy behaviours — Speeder, ZigZag, Jumper, Teleport, Kamikaze and more — using track-axis approach logic and combat stand-off distances so crowds engage from range and spread naturally instead of clumping at a single point." },
        { name: "Mobile Performance Optimization for 80-Enemy Crowds", body: "Optimized modular skeletal-mesh characters (15–21 components each) using leader-pose sharing, update-rate optimization, shadow culling, and distance-based tick throttling; cut texture memory from ~1 GB to under 200 MB and added a global projectile cap to keep frame times stable under heavy load." },
        { name: "Custom In-Engine Profiling Tool", body: "Wrote a world-subsystem profiler that auto-captures timed scene snapshots (actor classes, skeletal/static meshes, textures, draw-call estimates) and writes readable reports, turning 'the game feels slow' into concrete, measurable optimization targets." },
        { name: "Android Packaging & Shipping Pipeline", body: "Handled the full Android build/config pipeline — Vulkan-only ARM64 packaging, ASTC textures, portrait orientation, and a custom UPL (Unreal Plugin Language) manifest patch that strips unnecessary runtime permissions to deliver a clean, popup-free install experience for client testing." },
        { name: "Editor Tooling via Python + Custom C++ Module", body: "Built a C++ editor helper module exposing protected UMG internals (widget tree, root widget, GUID fixup) so HUD, main menu, game-over and victory screens could be generated programmatically through Python scripts — turning tedious manual Blueprint layout into repeatable, version-friendly automation." },
        { name: "Responsive Touch Combat HUD", body: "Designed a portrait-friendly combat HUD with hold-to-fire Light/Heavy/Ability buttons, per-button cooldown visualization, and an on-screen player health bar — replacing default virtual joysticks with a custom smooth hold-to-move lateral control scheme." },
        { name: "Dynamic Level Generation (Plugin-Driven Themes)", body: "Integrated a LevelThemeSystem plugin so every level spawns dynamically through a shared spawner interface, keeping spawner indices persistent across levels while only the wave definition changes per level — a scalable content pipeline for adding new stages with minimal setup." },
        { name: "Projectile & Collision Combat Systems", body: "Engineered a fireball projectile system with friendly-fire prevention (tag-based team filtering), lane-aware collision channels that let shots travel down the lane past environment geometry, and de-synced enemy attack timing so large crowds fire in staggered volleys instead of one overwhelming burst." },
        { name: "Interactive Reward Pickup Mechanic", body: "Created a destructible health-crate pickup that advances toward the player and must be hit multiple times to break for a reward — with direction-configurable movement, timed impact VFX that self-clean after 1 second, and collision tuned so only player projectiles (not enemy fire) can break it." },
      ],
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "golf-simulator-automation",
      title: "Golf Simulator Automation",
      tags: ["Unreal"],
      metaTags: ["Unreal", "C++", "Procedural"],
      badge: null,
      blurb: "Generates 40,000+ golf courses in one click — 50,000+ lines of procedural C++.",
      body: "Procedurally generates 40,000+ golf courses in one click; 50,000+ lines of C++ for bunkers, fairways, greens, creeks, and pathways; JSON → Unreal coordinates → splines/shapes. Plugins include a Dynamic Spawning System and a Height Adjuster.",
      youtube: "lRc3bVrbTjc",
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "cricket-vr",
      title: 'Cricket VR — "TOK Premier League"',
      tags: ["VR/AR"],
      metaTags: ["Unreal", "Meta Quest", "VR"],
      badge: null,
      blurb: "Physics-driven VR cricket — full shot range, dynamic footwork, haptics, edge detection.",
      body: "Precise bat physics with the full shot range (blocks, drives, cuts, pulls, sweeps), dynamic footwork, haptics, edge detection, physics-based bowling with swing, and AI fielders.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "gym-simulator",
      title: "Gym Simulator",
      tags: ["Unreal"],
      metaTags: ["Unreal", "Simulation", "AI"],
      badge: null,
      blurb: "Own and run a gym — AI gym-goers exercise, rest, recharge, and transition dynamically.",
      body: "Gym ownership (entry control, cleaning, equipment placement) with AI gym-goers that exercise, rest, recharge, and transition between activities dynamically.",
      youtube: "ChwjeR0IPmE",
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "the-wolf",
      title: "The Wolf",
      tags: ["Unreal"],
      metaTags: ["Unreal", "AI", "Survival"],
      badge: null,
      blurb: "Survival sim where AI animals form alliances, hunt in packs, age, and reproduce.",
      body: "A survival game where AI animals form alliances, attack, or coexist; features reproduction, aging, and growth, plus dynamic group hunting and leadership.",
      youtube: "ebH4yQ78Dv0",
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "zombie-shooter",
      title: "Zombie Shooter",
      tags: ["Unreal"],
      metaTags: ["Unreal", "TPS", "AI"],
      badge: null,
      blurb: "Third-person shooter with Buddy AI, Zombie AI, and cinematics.",
      body: "A third-person shooter featuring Buddy AI, Zombie AI, and cinematics.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "vr-cave-bat-shooter",
      title: "VR Cave Bat Shooter",
      tags: ["VR/AR"],
      metaTags: ["Unreal", "VR"],
      badge: null,
      blurb: "VR cave shooter — swarming bats in an enclosed arena.",
      body: "A VR cave shooter set in an enclosed arena of swarming bats.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "ar-replica",
      title: "AR Replica",
      tags: ["VR/AR"],
      metaTags: ["Unreal", "AR"],
      badge: null,
      blurb: "Playable AR character with adjustable height/speed/rotation and interactive objects.",
      body: "A playable AR character brought into the real world through the device camera — the character is placed into the user's own physical space and controlled live in augmented reality, blending a game character with the surrounding environment.</p><p class='flow-para'>In AR mode the character is fully adjustable in real time: its height, movement speed, and rotation can each be tuned on the fly, letting the user change how the character looks and moves within the scene without leaving the experience.</p><p class='flow-para'>Interactable logic lets the character engage with objects placed in the environment, so the AR scene reacts to the player rather than staying static — the character can approach and act on the things around it.",
      youtube: "TONi_H-SGJA",
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "fps-obstacle-shooting",
      title: "First-Person Obstacle Shooting",
      tags: ["Unreal"],
      metaTags: ["Unreal", "C++"],
      badge: null,
      blurb: "First-person ball shooter — knock down height-varied pins by controlling launch angle and speed.",
      body: "A first-person ball-shooter built around precision aiming: instead of run-and-gun combat, the player fires balls from a shooting position at a set of targets, making every shot a physics-driven aiming challenge.</p><p class='flow-para'>The targets are pins placed at different heights across the play space. Because they sit at varying elevations, the player has to read each layout and work out which pins to hit and how to reach the higher or further ones.</p><p class='flow-para'>The core mechanic is full control over the shot itself — the player sets both the launch angle and the throw speed before firing, so landing a high or distant pin comes down to dialing in the right arc and the right amount of power.</p><p class='flow-para'>Since every hit depends on that combination of angle and speed, the game rewards precision and timing: misjudge the arc and the ball sails over or falls short, turning each stage into a satisfying aim-and-adjust puzzle.",
      youtube: "S0OanmTmcMU",
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "unreal-plugins",
      title: "Unreal Plugins (Tools & Optimization)",
      tags: ["Unreal"],
      metaTags: ["Unreal", "Tools", "Optimization"],
      badge: null,
      blurb: "Editor tooling — Plantation System, Advanced Blueprint Helper, Optimized Landscape System.",
      body: "A suite of editor plugins: a Plantation System, an Advanced Blueprint Helper, and an Optimized Landscape System.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "raylib-games",
      title: "Raylib Games (Golf, Obstacle Shooter)",
      tags: ["Raylib/SFML"],
      metaTags: ["Raylib", "C++"],
      badge: null,
      blurb: "Raw C++ with Raylib — gameplay fundamentals with no engine assistance.",
      body: "Games built in raw C++ with Raylib (a golf game and an obstacle shooter), demonstrating gameplay fundamentals with no engine assistance.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "vehicle-construction-automation",
      title: "Vehicle Construction Automation",
      tags: ["Unreal"],
      metaTags: ["Unreal", "Automation"],
      badge: null,
      blurb: "Automated vehicle construction pipeline in Unreal.",
      body: "An automated vehicle construction pipeline built in Unreal.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
  ],

  /* Tech Arsenal — rendered as a clickable Souls-style skill web */
  arsenal: [
    "Unreal Engine 5", "C++", "Blueprints", "Vulkan", "GAS", "SFML", "Raylib",
    "SDL", "DirectX", "Perforce", "Git/GitOps", "Jenkins/GitLab CI", "AWS", "Docker/Kubernetes",
  ],
  /* One line shown when a skill node is clicked. Add/edit freely. */
  arsenalNotes: {
    "Unreal Engine 5": "Primary engine — combat, enemy AI, GAS, animation and IK systems across most projects.",
    "C++": "The core language. 50,000+ lines in the golf automation alone; every gameplay system ships in it.",
    "Blueprints": "Rapid-iteration layer over C++ architectures — clean Blueprint/C++ integration on client work.",
    "Vulkan": "Built a custom game engine on it from scratch — C++ core, hand-rolled renderer.",
    "GAS": "Gameplay Ability System — player abilities in Arka (PS5) and The Last Blood's 15+ ability roster.",
    "SFML": "Raw C++ games with no engine assistance — fundamentals proven outside any editor.",
    "Raylib": "Golf game and obstacle shooter built in raw C++ — gameplay logic with zero engine help.",
    "SDL": "Low-level windowing/input work in raw C++ framework games.",
    "DirectX": "Graphics-API fundamentals behind the custom engine work.",
    "Perforce": "Studio version control on team productions.",
    "Git/GitOps": "Day-to-day version control and GitOps workflows.",
    "Jenkins/GitLab CI": "Owned CI/CD; resolved a 6-day team-wide build failure at a 30-person studio.",
    "AWS": "Cloud infrastructure for build and deployment pipelines.",
    "Docker/Kubernetes": "Containerized build/deploy tooling.",
  },

  /* About — animated stat bars + counters */
  stats: [
    { label: "Combat & AI Systems", value: 95 },
    { label: "Gameplay Architecture", value: 90 },
    { label: "C++", value: 92 },
    { label: "Animation / IK", value: 85 },
    { label: "Tools & Automation", value: 88 },
  ],
  counters: [
    { value: 50000, suffix: "+", label: "Lines of C++ (golf automation)" },
    { value: 6, suffix: "+", label: "Unique skills per boss — The Last Blood" },
    { value: 6, suffix: "", label: "Platforms shipped on" },
    { value: 2, suffix: "", label: "Shipped games" },
    { value: 15, suffix: "+", label: "Abilities (data-driven)" },
    { value: 30, suffix: "", label: "Person team standards adopted" },
  ],

  /* Experience timeline */
  timeline: [
    {
      company: "Rickshaw Studio",
      role: "Senior Gameplay Programmer — Unreal, C++",
      period: "Jun 2025 – Present",
      body: "Puzzle interaction via FABRIK / Two-Bone IK; enemy AI architecture for all enemies; RDR2-style in-place rotation; GAS ability system; interaction / inspection / inventory systems.",
    },
    {
      company: "Teams of Keys",
      role: "Gameplay Programmer",
      period: "Mar 2024 – May 2025",
      body: "C++ game classes and automation; Blueprint + C++ integration; client projects; plugin creation.",
    },
    {
      company: "Zapnosys AI",
      role: "Unreal Engine Developer",
      period: "Dec 2023 – Mar 2024",
      body: "Unreal video engine in C++; custom interpreter; functions / emotions / characteristics in C++.",
    },
    {
      company: "Freelance (Unreal)",
      role: "Gameplay Programmer",
      period: "Apr 2023 – Oct 2023",
      body: "Games and gameplay mechanisms across a range of client briefs.",
    },
  ],
};
