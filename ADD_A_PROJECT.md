# How to add a new project (2 steps)

The whole site rebuilds itself from **`js/data.js`**. You never touch HTML or CSS.

## Step 1 — Create the folder + drop media

Create a folder under `projects/` named with a **slug** (lowercase, dashes):

```
projects/
  my-new-game/
    cover.jpg          ← card thumbnail (16:10 looks best)
    photos/
      1.jpg
      2.jpg
    videos/
      demo.mp4         ← full clip (muted, plays with controls in the modal)
    shorts/
      1.mp4            ← 0.4–0.6s micro-clip, autoplays + loops (hover + modal)
      2.mp4
```

Every file is **optional**. Anything missing shows a styled placeholder — never a broken image.

> **Filenames don't matter!** After adding/removing media, double-click **`update-media.bat`**
> in the portfolio root. It scans every project folder and regenerates `js/media-manifest.js`,
> so the site shows whatever files actually exist. The `media:` lists in `data.js` are only a
> fallback used when a project has no scanned files.

**Media tips**
- `cover.jpg` — the card image. If absent, the first `photos/` image is used, else a placeholder.
- `shorts/*.mp4` — keep them tiny (0.4–0.6s), muted, no audio track needed. The **first short** auto-plays when someone hovers the card; **all** shorts play in the modal's "Moments" strip.
- `videos/*.mp4` — longer demo(s). Shown big at the top of the modal with playback controls.
- Prefer web-friendly encodes: H.264 MP4, ~720p, short shorts under ~1 MB.

## Step 2 — Add one entry to `js/data.js`

Copy this block into the `projects: [ ... ]` array:

```js
{
  slug: "my-new-game",                 // MUST match the folder name
  title: "My New Game",
  tags: ["Unreal"],                    // filter pills — see vocabulary below
  metaTags: ["Unreal 5", "C++"],       // small tags shown on card/modal (free text)
  badge: null,                         // or "IN DEVELOPMENT"
  blurb: "One punchy line for the card.",
  body: "The full write-up shown inside the modal. A few sentences.",
  youtube: null,                       // or "dQw4w9WgXcQ" (the id after v=)
  media: {
    cover: "cover.jpg",
    photos: ["photos/1.jpg", "photos/2.jpg"],
    videos: ["videos/demo.mp4"],
    shorts: ["shorts/1.mp4", "shorts/2.mp4"],
  },
},
```

Reload the page. Done.

### Filter tag vocabulary (`tags`)
Use only these so the filter pills work:
`"Unreal"` · `"Vulkan/C++"` · `"Raylib/SFML"` · `"VR/AR"` · `"Mobile"` · `"PS5"`
A project can have several (e.g. `["Unreal", "PS5"]`). `metaTags` is free-text and only cosmetic.

---

## The flagship (The Last Blood)
It lives in the `featured: { ... }` object at the top of `data.js` and renders in its own
pinned section — not the grid. Its media lives in `projects/the-last-blood/`.

## Running locally
Open `index.html` directly, or serve the folder for best results (video/YouTube behave better over http):

```bash
npx serve .
```

Then open the printed `http://localhost:3000`.
