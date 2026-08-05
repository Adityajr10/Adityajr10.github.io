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
    youtube: null, // TODO: paste YouTube ID
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
      metaTags: ["Unreal", "C++", "AI"],
      badge: null,
      blurb: "Personality-driven combat AI — every dragon feels unique on one scalable system.",
      body: "Six personality traits feed a 7-instinct layer that filters abilities before selection; real-time weighted scoring (distance, energy, cooldowns, altitude, courage-vs-health) picks each move. Fully data-driven abilities — new moves are added via data, not code — so every dragon feels unique on a single scalable system.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
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
      blurb: "Survival-strategy in Hindu mythology's age of darkness — lead a warband of mythic heroes.",
      body: "Lead a warband of mythic warriors through combat levels — steering through divine Chakra gates, dodging Corrupting Sigils — and build a fortified ashram base between battles. Collect and upgrade heroes from Indian epics (Arjun, Bhima, Hanuman) to fight asura bosses like Mahishasura. Built on mechanics proven by top-grossing survival titles, set in an Indian mythological world no major mobile game has owned.",
      youtube: null,
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
      youtube: null,
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
      youtube: null,
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
      youtube: null,
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
      body: "A playable AR character with adjustable height, speed, and rotation, plus interactive object logic.",
      youtube: null,
      media: { cover: "cover.jpg", photos: ["photos/1.jpg"], videos: [], shorts: [] },
    },
    {
      slug: "fps-obstacle-shooting",
      title: "First-Person Obstacle Shooting",
      tags: ["Unreal"],
      metaTags: ["Unreal", "C++"],
      badge: null,
      blurb: "FPS with progressive dynamic obstacles — zigzag paths, random axis shifts.",
      body: "A first-person shooter with progressive dynamic obstacles: zigzag paths and random axis shifts that escalate over time.",
      youtube: null,
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
    { value: 40000, suffix: "+", label: "Procedurally generated courses" },
    { value: 6, suffix: "", label: "Platforms shipped on" },
    { value: 14, suffix: "", label: "State combat machine" },
    { value: 15, suffix: "+", label: "Abilities (data-driven)" },
    { value: 30, suffix: "", label: "Person team standards adopted" },
  ],

  /* Experience timeline */
  timeline: [
    {
      company: "Rickshaw Studio",
      role: "Game Systems Programmer — Unreal, C++",
      period: "Jun 2025 – Present",
      body: "Puzzle interaction via FABRIK / Two-Bone IK; enemy AI architecture for all enemies; RDR2-style in-place rotation; GAS ability system; interaction / inspection / inventory systems.",
    },
    {
      company: "Teams of Keys",
      role: "Game Developer",
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
