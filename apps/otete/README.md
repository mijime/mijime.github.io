# otete

A tactile toddler toy box for 2–3 year olds, written in **TypeScript** and built with **Vite** into a **static site** (also mounted as `apps/otete` in the `mijime.github.io` monorepo).

## Mission & Architecture

- **Mission**: Replace drill-style flashcard quizzes with a **living, tactile toy box** (文字ゼロ・説明ゼロ・失敗ゼロ) where a toddler's finger causes immediate, joyful responses.
- **Unified Stage Shell (`client/ui.ts`, `styles.css`)**:
  - Every screen shares a single 4-layer structure: **Topbar** (`🏠` · segmented mode pill / badge · actions), **2-line locked Guide Banner** (`createGuideBanner` with phrase-safe wrapping so 1-line and 2-line prompts never shift layout), **Play Stage**, and **Bottom Toy Dock**.
  - **Unified Magnetic Drag & 1-Tap Assist (`bindGrab`)**: `count` and `code` share one magnetic drag-and-drop engine that also flies items into place on a simple tap.
  - **Loose Toy Physics (`client/loose.ts`)**: `feed` and `puzzle` use real table-top objects instead of magnets. A toy stays where it is dropped, shoves its neighbours, and can be swiped across the table with momentum, spinning and bouncing off the edge of the play area. A tap only rocks it (and names it) — nothing flies anywhere on its own.
  - **Unified 2D Particle & Bubble Engine (`client/fx.ts`)**: Shared `burst`, `ring`, `celebrate`, `confetti`, `dissolve`, and `createBubbleField` with zero external WebGL/CDN dependencies.
  - **Tactile feedback conventions**: every touch answers — a tap that lands nowhere still gets a soft squish/ring, a refused grab wiggles (`nope`) instead of staying silent, drag targets light up (`invite` / `glow`) before the finger lifts, long-presses show a pressed state (`holding`), and successes celebrate at the place the child touched.

## Toy Worlds

- **🍎 もぐもぐ (`client/feed.ts`)** — Pretend-play feeding with expressive SVG animal friends (`client/character.ts`) whose eyes track the finger, open wide ("あーん！"), chew ("もぐもぐ"), and celebrate. Food is a loose toy: carry it to the open mouth to be eaten, or flick it away. Teaches vocabulary, colours, and 1-to-1 counting.
- **🫧 あわあわ (`client/peek.ts`)** — Fine-motor scrubbing & peek-a-boo. Rub away fluffy soap foam (and pop floating bubbles) to reveal hidden animals, vehicles, and family photos with a joyful "ばあっ！".
- **🧩 すぽっ！ (`client/puzzle.ts`)** — Wooden shape (`🔺 かたち`), colour (`🎨 いろ`), and size (`🐘 おおきさ`) sorter. Blocks are loose toys: carry one over its matching hole to make it drop in ("スポッ！"), pile them up, or swipe them around the table.
- **🚂 ぽっぽー (`client/trace.ts`)** — Pre-writing finger tracing on a railroad track: drive trains, fire engines, rockets, and animals while collecting treats along the road.
- **🎨 おえかき (`client/draw.ts`)** — Musical pentatonic canvas with a chunky toy palette (rainbow crayon, named colour crayons, soap-bubble brush, star brush, and speaking stamps).
- **📖 ずかん (`client/learn.ts`)** — Talking picture book with parent photos & voice recordings, plus friend-guided discovery (`🔍 さがそう`).
- **🔢 かず (`client/count.ts`)** — 3 number modes (`🍎 1・2・3` harvesting, `🍽️ どうぞ` cardinality plate, `⚖️ シーソー` quantity comparison).
- **🪞 かがみ (`client/camera.ts`)** — Interactive mirror with costumes, motion-popping bubbles, and keepsake photo shutter.
- **🖼️ さくひん (`client/home.ts`)** — Saved artwork & snapshot gallery.

## Commands

```sh
pnpm dev              # start the Vite dev server
pnpm build            # typecheck + build to dist/
pnpm preview          # preview the production build
pnpm run check        # format + typecheck + oxlint
```
