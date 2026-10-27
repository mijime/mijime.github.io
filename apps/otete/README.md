# otete

A tactile toddler toy box for 2–3 year olds, written in **TypeScript** and built with **Vite** into a **static site** (also mounted as `apps/otete` in the `mijime.github.io` monorepo).

## Mission & Architecture

- **Mission**: Replace drill-style flashcard quizzes with a **living, tactile toy box** (文字ゼロ・説明ゼロ・失敗ゼロ) where a toddler's finger causes immediate, joyful responses.
- **Unified Stage Shell (`client/ui.ts`, `styles.css`)**:
  - Every screen shares a single 4-layer structure: **Topbar** (`🏠` · segmented mode pill / badge · actions), **2-line locked Guide Banner** (`createGuideBanner` with phrase-safe wrapping so 1-line and 2-line prompts never shift layout), **Play Stage**, and **Bottom Toy Dock**.
  - **Unified Magnetic Drag & 1-Tap Assist (`bindGrab`)**: All draggable items (`feed`, `puzzle`, `count`) share one magnetic drag-and-drop engine that also flies items into place on a simple tap.
  - **Unified 2D Particle & Bubble Engine (`client/fx.ts`)**: Shared `burst`, `ring`, `celebrate`, `confetti`, `dissolve`, and `createBubbleField` with zero external WebGL/CDN dependencies.

## Toy Worlds

- **🍎 もぐもぐ (`client/feed.ts`)** — Pretend-play feeding with expressive SVG animal friends (`client/character.ts`) whose eyes track the finger, open wide ("あーん！"), chew ("もぐもぐ"), and celebrate. Teaches vocabulary, colours, and 1-to-1 counting.
- **🫧 あわあわ (`client/peek.ts`)** — Fine-motor scrubbing & peek-a-boo. Rub away fluffy soap foam (and pop floating bubbles) to reveal hidden animals, vehicles, and family photos with a joyful "ばあっ！".
- **🧩 すぽっ！ (`client/puzzle.ts`)** — Wooden shape (`🔺 かたち`), colour (`🎨 いろ`), and size (`🐘 おおきさ`) sorter with magnetic snap-in physics and tap-assist.
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
