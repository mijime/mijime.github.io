# @mijime/theme

Shared design tokens and UI primitives.

## Entry points

| Import                          | Use                                                             |
| ------------------------------- | --------------------------------------------------------------- |
| `@mijime/theme/index.css`       | Tokens + base/site styles + UI component CSS (default for apps) |
| `@mijime/theme/tokens.css`      | Tokens only (for app shells that bring their own base CSS)      |
| `@mijime/theme/themes/sumi.css` | Optional example palette preset                                 |
| `@mijime/theme/ui`              | React primitives (Button, Modal, Card, Tabs, ...)               |
| `@mijime/theme/palette`         | TS colour values for Canvas / WebGL / computed styles           |

## Colour architecture

`tokens.css` has two layers:

1. **Palette layer** — `--palette-*`. This is the only thing a theme needs to override.
2. **Semantic layer** — `--primary`, `--secondary`, `--accent`, `--highlight`,
   `--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--success`, ...
   Components consume these names, never the palette directly.

Legacy names (`--paper`, `--ink`, `--mid`, `--terra`, `--accent`) remain as aliases
so existing app CSS keeps working while it migrates.

### Switching a theme

```js
document.documentElement.dataset.palette = "sumi"; // default: kaga
document.documentElement.dataset.theme = "dark"; // light / dark
localStorage.setItem("palette", "sumi");
```

Or use the hook (persists and syncs `data-palette`):

```tsx
import { usePalette } from "@mijime/theme/usePalette";

const { palette, setPalette } = usePalette();
setPalette("sumi");
```

Import the preset CSS once (the default `tokens.css` / `index.css` already imports `sumi`):

```css
@import "@mijime/theme/themes/sumi.css";
```

### Adding a theme

Create `src/themes/<name>.css` and override `--palette-*` for both modes:

```css
:root[data-palette="sakura"] {
  --palette-primary: #b04e52;
  --palette-bg: #fdf7f7;
  /* ... */
}

:root[data-palette="sakura"][data-theme="dark"] {
  --palette-primary: #e6a0a4;
  /* ... */
}

@media (prefers-color-scheme: dark) {
  :root[data-palette="sakura"]:not([data-theme="light"]) {
    /* same dark values */
  }
}
```

Export the file from `package.json` and import it where the theme should be
selectable. No component CSS changes are required.

## UI primitives

`@mijime/theme/ui` exports:

- `Button`, `IconButton`
- `Badge`
- `Field`, `Input`, `Select`, `Textarea`
- `Modal`, `ConfirmDialog`
- `Card`, `Panel`
- `Toolbar`
- `Tabs`
- `Toast`, `ToastStack`
- `EmptyState`
- `SegmentedControl`
- `SectionLabel`
- `StatChip`

Prefer these over app-local buttons, inputs and dialogs so colors, spacing,
focus rings and keyboard behaviour stay consistent.

## App-specific UI

Two apps intentionally keep custom controls:

- `otete` — toddler toy controls (large tactile buttons, drag targets) only share tokens.
- `lords-of-the-stigmata` — the game HUD and choice modal share palette/tokens but keep their fantasy styling.

Share these apps' dialogs/buttons only where the shared component matches the
interaction (e.g. a settings confirm), not for gameplay surfaces.
