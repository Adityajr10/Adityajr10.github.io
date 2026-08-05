# CLAUDE.md — Aditya Rai · Gaming Portfolio Spec

Read this entire file before writing any code. This is the single source of truth for the site's content, design, and behavior. Build exactly this.

## 1. Who this is for

Aditya Rai — gameplay programmer, 3+ years, Bangalore, India.
Specialties: combat & enemy AI systems, GAS, animation/IK (FABRIK, motion warping), data-driven architecture, C++ and Blueprints.
Platforms shipped/worked on: Windows, PS5, Android, iOS, VR (Meta Quest), AR.
Engines/tech: Unreal Engine 5, custom Vulkan-based game engine, SFML, Raylib, SDL, DirectX.

Contact (footer + hero CTA):
- Email: brodyrai16@gmail.com
- LinkedIn: linkedin.com/in/aditya-rai10
- GitHub: github.com/Adityajr10
- Resume: link to `assets/Aditya_Rai_Resume.pdf` (download button)

## 2. The goal

A single-page, smooth-scrolling portfolio that feels like the main menu of a AAA Souls-like game — cinematic, dark, premium. Award-site quality (Awwwards-tier motion), not a generic developer template. The flagship project **The Last Blood** gets the most screen real estate by far.

## 3. Design system

**Palette (Elden Ring menu vibes):**
- Background near-black: `#0a0a0c` (sections may vary `#0d0d10` / `#111114`)
- Ember orange (primary accent): `#ff6b35`
- Blood crimson (secondary accent): `#8b0000`
- Bone gold (borders, headings, HUD lines): `#c9a961`
- Body text: warm off-white `#e8e4dc`, muted `#9a958c`

**Typography:**
- Display/headings: Cinzel (Google Fonts) — oversized, wide letter-spacing, uppercase for section titles
- Body/UI: Inter or Sora — clean sans

**Motion principles:**
- Everything reveals on scroll (fade + slide up, slight stagger). Headings reveal like Souls area-name announcements: letter-spacing expands as opacity fades in.
- Slow, weighty easing (power2/power3 out). Nothing bouncy or playful — this is somber and cinematic.
- Subtle red vignette pulse when crossing between major sections.

## 4. Tech stack

- Vanilla HTML/CSS/JS (or Vite if a build step helps). No React needed.
- **GSAP + ScrollTrigger** — all scroll animations, pinning, stat counters, parallax.
- **Lenis** — smooth scroll, synced to ScrollTrigger via the standard raf/ticker pattern.
- **Canvas ember particles** — custom lightweight system (~150–250 drifting orange embers) in the hero. No Three.js required for v1.
- **VanillaTilt** — subtle 3D tilt on project cards.
- **Lite YouTube embeds** — thumbnail-first; player loads only on click. Never eagerly load 10+ iframes.
- Deploy target: static hosting (GitHub Pages / Netlify / Vercel).

## 5. Page structure (top → bottom)

### 5.1 Hero
- Full-viewport. Background: dimmed looping gameplay clip of The Last Blood (`assets/hero-loop.mp4`, muted, autoplay, loop; poster image fallback `assets/hero-poster.jpg`) under a dark gradient + ember particle canvas.
- Name "ADITYA RAI" in huge Cinzel, subtitle: "Gameplay Programmer — Combat AI · Custom Engines · C++".
- Platform badges row: Windows · PS5 · Android · iOS · VR · AR.
- Two CTAs: "View Work" (smooth-scrolls to The Last Blood) and "Download Resume".
- Scroll hint at bottom: "SCROLL TO ENTER".

### 5.2 Featured: The Last Blood (flagship — 2–3 screens of scroll)
Souls-like Combat & AI System · Unreal Engine 5 · C++ · Elden Ring-inspired.
Tagline: "Every system Elden Ring taught me, rebuilt from scratch."

Layout: pinned section — the demo video stays pinned on one side while system panels scroll past on the other (ScrollTrigger pin + scrub). Each panel = one system:
1. **The AI Brain** — Layered enemy AI with 3-stage decision-making (stance → action → ability), personality profiles, weighted scoring, priority tiers. A pattern tracker learns the player's dodge/parry habits in real time to bait and punish them.
2. **Boss Attack Director** — Designer-authored Attack Director with reactive combo edges modeled on Elden Ring's follow-up logic; rule-based Skill System replicating boss weapon-arts; multi-phase boss kits (6+ unique skills each); pack AI coordination; adaptive weighting so bosses abandon moves the player has solved.
3. **Player Combat** — One authoritative 14-state machine drives all input: buffered combo chains, i-frame dodges, rage/stamina economies. Impact-timed parry/block resolution with posture meters that make guard-breaking a win condition. Synced animation with motion warping for cinematic finishers, executions, and grabs.
4. **Data-Driven Progression** — Per-weapon skill trees gating a 15+ ability roster, 8-slot loadouts, save persistence. Shipping a new weapon requires zero code changes.

Media: main YouTube embed `TODO_YT_LASTBLOOD`, screenshots `assets/lastblood-1.jpg` … `assets/lastblood-4.jpg`.

### 5.3 Spotlight: Custom Vulkan Engine
Its own full-width block right after The Last Blood ("built my own engine" is a major differentiator — do not bury it in the grid).
Copy: built a custom game engine from scratch on Vulkan; C++ core. `TODO_VULKAN_DESCRIPTION` (owner will supply 2–3 lines on renderer/features). Media: `assets/vulkan-1.jpg`, optional `TODO_YT_VULKAN`.
Also mention: games built in raw C++ frameworks (SFML/Raylib/SDL) — golf game, obstacle shooter — proving engine-independent fundamentals.

### 5.4 Projects grid (filterable)
Filter pills: **All · Unreal · Vulkan/C++ · Raylib/SFML · VR/AR · Mobile · PS5**. Filtering animates (GSAP flip-style reflow). Cards: thumbnail image; on hover → lift, gold border glow, tilt, and swap to muted looping preview if available; click → opens a modal with full write-up + YouTube embed + gallery. Card meta row: engine + platform tags.

Projects (each: title / tags / short card blurb / full modal text / media placeholders):

1. **Arka (PS5)** — Unreal, C++, PS5, Company project (Rickshaw Studio).
   Interface-driven Interaction system (IInteractionInteractable) decoupling GlobalInteractionComponent from all actor types; real-time IK hand-alignment (Two Bone IK, FABRIK, CCDIK). Delegate-driven Inventory (DataTable single source of truth, zero hardcoded C++). Zero-Tick puzzle system. Behaviour Tree enemy AI + RDR2-style InPlaceRotation reusable for creatures and humanoids. Player abilities via GAS; Health, Swimming, Zipline, Resident Evil-style 3D Inspection as self-contained components. Resolved a 6-day team-wide build failure; owned CI/CD; authored architecture standards adopted across a 30-person team. Media: `assets/arka-1.jpg`…
2. **Dragon AI** — Unreal, C++. Personality-driven combat: six personality traits feed a 7-instinct layer that filters abilities before selection; real-time weighted scoring (distance, energy, cooldowns, altitude, courage-vs-health) picks each move; fully data-driven abilities — new moves added via data, not code; every dragon feels unique on one scalable system. Media: `TODO_YT_DRAGON`, `assets/dragon-1.jpg`.
3. **BowlBreaker** — Unreal 5, C++, Windows/Android/iOS. Badge: IN DEVELOPMENT. Innovative bowling game: 10 unique balls with special abilities (split-in-two, time slow, gravity pulse, ricochet). Every throw sets 4 parameters — Position, Angle, Power, Spin — across 2 fluid mouse/touch gesture phases; wrong combinations genuinely miss with no autocorrection. 6 dynamic pin stage modes (oscillating, chaos, inverted gravity) multiply score. Unified C++ codebase across all 3 platforms. Media: `assets/bowl-1.jpg`, `TODO_YT_BOWL` (optional).
4. **Kaliyuga's End** — Mobile (Android/iOS). Badge: IN DEVELOPMENT. Survival-strategy set in Hindu mythology's age of darkness: lead a warband of mythic warriors through combat levels — steering through divine Chakra gates, dodging Corrupting Sigils — and build a fortified ashram base between battles. Collect and upgrade heroes from Indian epics (Arjun, Bhima, Hanuman) to fight asura bosses like Mahishasura. Built on mechanics proven by top-grossing survival titles, in an Indian mythological world no major mobile game has owned. Media: `assets/kaliyug-1.jpg`.
5. **Golf Simulator Automation** — Unreal, C++. Procedurally generates 40,000+ golf courses in one click; 50,000+ lines of C++ for bunkers, fairways, greens, creeks, pathways; JSON → Unreal coordinates → splines/shapes; plugins incl. Dynamic Spawning System and Height Adjuster. Media: `TODO_YT_GOLF_AUTO`.
6. **Cricket VR — "TOK Premier League"** — Unreal, Meta Quest. Precise bat physics, full shot range (blocks, drives, cuts, pulls, sweeps), dynamic footwork, haptics, edge detection, physics-based bowling with swing, AI fielders. Media: `TODO_YT_CRICKET`.
7. **Gym Simulator** — Unreal. Gym ownership (entry control, cleaning, equipment placement); AI gym-goers exercising, resting, recharging, transitioning dynamically. Media: `TODO_YT_GYM`.
8. **The Wolf** — Unreal. Survival game: AI animals form alliances, attack, or coexist; reproduction, aging, growth; dynamic group hunting and leadership. Media: `TODO_YT_WOLF`.
9. **Zombie Shooter** — Unreal. TPS with Buddy AI, Zombie AI, cinematics. Media: `TODO_YT_ZOMBIE`.
10. **VR Cave Bat Shooter** — Unreal, VR. Media: `TODO_YT_VRBAT`.
11. **AR Replica** — Unreal, AR. Playable AR character with adjustable height/speed/rotation and interactive object logic. Media: `TODO_YT_AR`.
12. **First-Person Obstacle Shooting** — Unreal, C++. Progressive dynamic obstacles (zigzag, random axis shifts). Media: `TODO_YT_OBSTACLE`.
13. **Unreal Plugins (Tools & Optimization)** — Plantation System, Advanced Blueprint Helper, Optimized Landscape System. Media: `TODO_YT_PLUGINS`.
14. **Raylib Games (Golf, Obstacle Shooter)** — Raw C++ with Raylib; gameplay fundamentals with no engine assistance. Media: `assets/raylib-1.jpg`.
15. **Vehicle Construction Automation** — Unreal. Media: `TODO_YT_VEHICLE`.

### 5.5 Tech Arsenal strip
Horizontal band, subtle infinite marquee or static grid: Unreal Engine 5 · C++ · Blueprints · Vulkan · GAS · SFML · Raylib · SDL · DirectX · Perforce · Git/GitOps · Jenkins/GitLab CI · AWS · Docker/Kubernetes.

### 5.6 About — Elden Ring-style character stat sheet
Frame the About section as a game character sheet: a dark gold-bordered panel with "class: Gameplay Programmer", "Level 3+ (years)", and stat bars that animate on scroll — e.g. Combat & AI Systems, Gameplay Architecture, C++, Animation/IK, Tools & Automation. Include animated counters for the big numbers: **50,000+** lines (golf automation), **40,000+** generated courses, **6** platforms, **14**-state combat machine, **15+** abilities, **30**-person team standards adopted.

### 5.7 Experience timeline
Vertical timeline, gold line, ember node dots, scroll-revealed:
- **Rickshaw Studio** — Game Systems Programmer (Unreal, C++) — Jun 2025–Present. Puzzle interaction via FABRIK/Two-Bone IK; enemy AI architecture for all enemies; RDR2-style in-place rotation; GAS ability system; interaction/inspection/inventory systems.
- **Teams of Keys** — Game Developer — Mar 2024–May 2025. C++ game classes and automation; Blueprint+C++ integration; client projects; plugin creation.
- **Zapnosys AI** — Unreal Engine Developer — Dec 2023–Mar 2024. Unreal video engine in C++; custom interpreter; functions/emotions/characteristics in C++.
- **Freelance (Unreal)** — Apr 2023–Oct 2023. Games and gameplay mechanisms.

### 5.8 Contact / Footer
Big Cinzel line ("YOUR TURN TO SUMMON"or similar Souls-flavored CTA), email button, LinkedIn, GitHub, resume download. Small footer note.

## 6. Game-like touches (required)

1. **Boss health bar scroll progress** — fixed at the bottom: a thin Souls boss bar labeled "ADITYA RAI" that fills gold/crimson with overall scroll progress.
2. **Achievement toasts** — small toast slides in (with a soft chime optional, muted by default) when the visitor reaches key sections: e.g. "Rune Acquired — The Last Blood", "New Area — The Forge (Vulkan Engine)", "All Regions Explored" at footer. Fire once per section per visit (in-memory only — NO localStorage).
3. **Area-name reveals** — every major section title animates in like a Souls location announcement.
4. Optional easter egg (nice-to-have): Konami code or a hidden interactable that opens a tiny canvas mini-game.

## 7. Media conventions

- All images in `assets/`, named `<project>-<n>.jpg` as referenced above. Build with graceful fallback: if an image is missing, show a styled dark placeholder tile with the project name — never a broken image icon.
- All YouTube links are `TODO_YT_*` placeholders — clearly marked constants at the top of one JS/config file so the owner can paste real links in a single place.
- Hero video: `assets/hero-loop.mp4` with `assets/hero-poster.jpg` fallback; if absent, fall back to ember particles over gradient only.

## 8. Quality bar

- 60fps scrolling on a mid-range laptop; transform/opacity-only animations; will-change used sparingly.
- Lazy-load all below-the-fold images and every YouTube embed.
- Fully responsive (mobile: no pinning if janky — fall back to stacked reveals; hero video may drop to poster).
- `prefers-reduced-motion`: disable smooth scroll, pinning, and particles; keep simple fades.
- Semantic HTML, alt text, keyboard-accessible nav and modals (Esc closes, focus trap).
- No localStorage/sessionStorage anywhere.

## 9. What NOT to do

- No light theme, no generic template look, no default blue links, no emoji.
- Don't autoplay sound. Don't eagerly load a dozen iframes.
- Don't bury The Last Blood — it owns the page.
- Don't invent facts, projects, or numbers beyond what's in this file.

## 10. Suggested build order

1. Skeleton + design tokens + Lenis/GSAP wiring
2. Hero (particles, video bg, badges, CTAs)
3. The Last Blood pinned section
4. Vulkan spotlight
5. Projects grid + filters + modals (data-driven from a single JS array using the content in §5.4)
6. Stat-sheet About + counters
7. Timeline, arsenal strip, footer
8. Game touches (boss bar, toasts, reveals), then polish/perf/responsive pass
