# User Interface

Rules and conventions for the SteamGirl UI. All styling lives in a single stylesheet (`src/style.css`) with CSS custom properties for theming. Components are React functional components.

## Steampunk Theme

The visual identity is built from brass, copper, and iron metallics against dark backgrounds with parchment-coloured text. Every UI element should feel like part of a Victorian mechanical device.

Key materials:
- **Brass** -- borders, buttons, highlights, active states
- **Copper** -- secondary accents, hover states, soft backgrounds
- **Iron** -- muted/disabled elements
- **Parchment** -- text colours, warm off-whites

Avoid introducing colours outside this palette unless they serve a specific semantic purpose (status indicators, NPC speech colours, effect colours).

## Design Tokens

All spacing, colours, fonts, and radii are defined as CSS custom properties in `:root`. Use these variables rather than hard-coded values.

### Colour Palette

```css
/* Metallic palette */
--brass-light: #d4a853;    --brass-mid: #b8860b;    --brass-dark: #8b6914;
--copper-light: #b87333;   --copper-mid: #8b4513;   --copper-dark: #5c3317;
--iron-light: #8a8a8a;     --iron-mid: #5a5a5a;     --iron-dark: #3a3a3a;

/* Backgrounds */
--bg-main: #0e0b09;                    /* Deep soot / iron */
--bg-panel: rgba(34, 24, 16);          /* Dark brass panel */
--bg-panel-soft: rgba(88, 57, 33, 0.25); /* Soft copper wash */
--bg-overlay: rgba(20, 20, 20, 0.6);

/* Borders */
--border-subtle: rgba(212, 168, 83, 0.4);  /* Brass at 40% */
--border-dashed: rgba(212, 168, 83, 0.6);  /* Brass at 60% */
--border-main: var(--brass-mid);

/* Text */
--text-main: #f4e4c4;   /* Parchment */
--text-muted: #d0b691;   /* Aged parchment */
```

### Spacing

```css
--space-xs: 0.375rem;
--space-sm: 0.75rem;
--space-md: 1.25rem;
--space-lg: 1.875rem;
--space-xl: 3.125rem;
```

### Typography

```css
--font-xs: 0.6rem;   --font-sm: 0.8rem;   --font-md: 1rem;
--font-lg: 1.5rem;   --font-xl: 2rem;
--font-sans: 'Open Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
```

The base font size uses `clamp()` for viewport scaling:
```css
--font-size-base: clamp(1rem, calc(0.7rem + 0.6vw), 2rem);
```

### Border Radius

```css
--radius-lg: 1rem;   --radius-md: 0.75rem;   --radius-sm: 0.625rem;   --radius-xs: 0.25rem;
```

### Shadows & Gradients

```css
--gradient-brass: linear-gradient(180deg, var(--brass-light), var(--brass-mid), var(--brass-dark));
--gradient-copper: linear-gradient(180deg, rgba(92,51,23,0.8), rgba(70,40,20,0.9));
--shadow-brass: inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3);
--shadow-strong: 0 26px 60px rgba(0, 0, 0, 0.7);
--shadow-inner: inset 0 1px 0 rgba(255, 214, 170, 0.12);
```

## Styling Conventions

- **Use rem units** for sizes that should scale with the base font. Avoid px except for borders and fine details.
- **Use CSS variables** for all colours, spacing, radii, and font sizes. No magic numbers.
- **Re-use existing styles** as far as possible. The single stylesheet is intentionally compact -- prefer extending existing classes over creating new ones.
- **CSS class naming**: Semantic layout classes (`.game-screen`, `.scene-overlay`) plus visual utility classes (`.panel-elevated`, `.text-muted`). Component classes use the pattern `.component-name` with modifiers like `.component-name.active` or `.component-name.selected`.
- **No media queries**: The layout adapts fluidly via `clamp()`, flex wrapping, and grid auto-fill. Avoid introducing breakpoints.
- **Layered shadows**: Use multiple shadow layers for depth (inset highlights + drop shadows).

### Status Colours

These semantic colours are used consistently across the UI for status indicators:

| Colour | Hex | Usage |
|--------|-----|-------|
| Blue | `#3b82f6` | Ongoing quests, informational |
| Green | `#10b981` | Completed quests, success |
| Red | `#ef4444` | Failed quests, errors |
| Purple | `#a855f7` | Effects |

## Screen System

The game uses a screen switcher pattern. `GameScreen` manages the current screen via `game.uiScreen`:

| Screen ID | Component | Purpose |
|-----------|-----------|---------|
| `game` | `LocationView` | Main gameplay -- location background, overlays, navigation |
| `character` | `CharacterScreen` | Skills, stats, active effects |
| `inventory` | `InventoryView` | Items, clothing, outfits |
| `quests` | `QuestsScreen` | Quest cards with status |
| `info` | `InfoScreen` | Lore and help |
| `settings` | *(placeholder)* | Settings |

The `ScreenSwitcher` component renders circular icon buttons on a decorative brass rail. Clicking the active screen returns to `game`. Most non-game screens wrap their content in a `Frame` component.

## Layout Structure

The main game layout is a three-column flex row:

```
.game-screen (flex row)
├─ .player-panel (sidebar)
│  ├─ AvatarPanel (character image + effect tags)
│  ├─ Clock (analogue clock + date + wait buttons)
│  ├─ StatsPanel (stat grid + meter gauges)
│  └─ ScreenSwitcher (navigation buttons)
├─ main (flex: 1)
│  └─ LocationView or screen content
└─ DevControls (debug, top-right)
```

The `LocationView` layers overlays on top of a full-bleed background image:

```
.location-view (flex column, background image)
├─ flex: 1 (image area)
├─ .overlays-container (centred)
│  ├─ SceneOverlay (narrative text + action buttons)
│  └─ ShopOverlay (items for sale)
└─ .bottom-overlays (flex space-between)
   ├─ ActivityOverlay (location activities)
   ├─ NPCOverlay (present characters)
   └─ NavOverlay (travel links)
```

Bottom overlays are hidden during scenes and shops to keep focus on the active interaction.

## Key Components

### Frame

Reusable steampunk panel with brass border and optional corner rivets. Accepts a `size` prop (`'sm'`, `'md'`, `'lg'`, `'auto'`) that sets `min-height`.

### Button / BrassButton

Two button variants:
- **BrassButton**: Primary (bright brass gradient) or secondary (copper gradient). Used for prominent actions.
- **Button**: Dynamic colour button -- accepts a `color` prop, auto-darkens for background. Optional `'small'` size.

Both support `disabled` state with greyed-out styling.

### Thumbnail

Square clickable tile (5rem image + label) used for locations, NPCs, and activities. Supports `disabled` state with grayscale filter and reduced opacity. Shows optional `subtitle` text.

### Card

Playing-card-style display (8rem x 10rem) for quests and effects on the character/quests screens. Shows image, name, description. Quest cards display a colour-coded status badge. Effect card titles render in the effect's `color`.

### EffectTag

Compact coloured label for the avatar overlay. Displays the effect name in the effect's `color` property. Shows description as tooltip on hover.

### ItemIcon

Small item image with overlay badges:
- **Count badge** (bottom-right): Item quantity
- **Worn badge**: "w" indicator for worn items
- **Locked badge**: Lock icon for locked items

Falls back to a letter placeholder when no image is available.

### Overlay Groups

Bottom overlays (activities, NPCs, navigation) use `.overlay-group` -- a dark semi-transparent container with brass border and backdrop blur. Each group has a small uppercase title and a flex-wrapped content area of thumbnails.

## Scene & Text Rendering

Story content is rendered by `Content.tsx` which maps an array of content blocks to React elements:

| Content Type | Rendering | Styling |
|-------------|-----------|---------|
| `text` | `<p>` with optional colour | Default parchment text |
| `paragraph` | Container for inline parts | Supports coloured/bold text with hover tooltips |
| `speech` | `<p>` with left border accent | NPC `speechColor` or explicit colour override |

Speech text uses a 3px left border in the NPC's colour, with left padding for indentation.

### NPC Speech Colours

Each NPC definition can have a `speechColor` property. When rendering speech content, the colour priority is:
1. Explicit colour on the content block
2. NPC definition's `speechColor`
3. Default parchment colour

## Image & Asset Handling

All image paths go through `assetUrl(path)` which prepends the Vite base URL for GitHub Pages compatibility. Use this for all `src` attributes and `backgroundImage` styles.

Key image dimensions:
- Avatar: 16rem x 16rem
- Thumbnails: 5rem x 5rem
- Scene NPC images: max 32em x 32em, `object-fit: contain`
- Item icons: 2rem x 2rem
- Clothing grid items: 1.2rem x 1.2rem

## Responsive Design

The UI scales fluidly without media queries:
- **Base font**: `clamp(1rem, calc(0.7rem + 0.6vw), 2rem)` scales with viewport
- **Layouts**: Flex and grid with wrapping and auto-fill
- **Constraints**: Overlays capped at `max-width: 37.5rem` to stay readable on large screens
- **Overflow**: Body is `overflow: hidden`; individual panels use `overflow-y: auto` with `min-height: 0` for flex containers

## Context & Refresh

`GameContext` provides the game instance and a `refresh()` function to all components. The refresh mechanism uses a counter state to force re-renders without mutating the game object reference.

The `runScript(name, params)` function handles the full action cycle:
1. Execute via `game.takeAction()`
2. Run side effects via `game.afterAction()`
3. Increment refresh counter
4. Auto-save to localStorage

## Key Source Files

| File | Purpose |
|------|---------|
| `src/style.css` | Single stylesheet with all design tokens and component styles |
| `src/screens/GameScreen.tsx` | Screen routing and main layout |
| `src/screens/StartScreen.tsx` | Main menu with hero background |
| `src/components/ScreenSwitcher.tsx` | Screen navigation buttons |
| `src/components/Frame.tsx` | Steampunk panel container |
| `src/components/Button.tsx` | Dynamic colour button |
| `src/components/BrassButton.tsx` | Metallic button (primary/secondary) |
| `src/components/Thumbnail.tsx` | Square icon button for navigation |
| `src/components/Card.tsx` | Quest/effect card display |
| `src/components/EffectTag.tsx` | Compact effect indicator |
| `src/components/ItemIcon.tsx` | Item icon with badges |
| `src/components/Content.tsx` | Scene text rendering |
| `src/components/LocationView.tsx` | Main game view with overlays |
| `src/components/SceneOverlay.tsx` | Narrative text and action buttons |
| `src/components/ShopOverlay.tsx` | Shop purchase interface |
| `src/components/PlayerPanel.tsx` | Sidebar with avatar, clock, stats |
| `src/components/AvatarPanel.tsx` | Character image with effect overlay |
| `src/components/StatsPanel.tsx` | Stat grid and meters |
| `src/components/ClothingGrid.tsx` | Body position x layer grid |
| `src/context/GameContext.tsx` | Game state, refresh, auto-save |
| `src/utils/assetUrl.ts` | GitHub Pages path resolution |
