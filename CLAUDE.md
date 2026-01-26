# CLAUDE.md

This file provides guidance for Claude Code when working with the SteamGirl codebase.

## Project Overview

SteamGirl is a steampunk-inspired life simulator game featuring Elise, a young woman arriving as a student in the fictional city of Aetheria. It's a browser-based narrative game combining storytelling with stat-based mechanics.

**Demo**: https://charlotte-xie.github.io/steamgirl

## Vision

The game is an immersive, rich, story driven game with complex characters and themes. The theme mixes steampunk glamour and beauty with dark fantasy and psychological elements.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Vitest** for testing
- **pnpm** as package manager

## Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Start dev server at localhost:3000
pnpm build        # TypeScript check + production build
pnpm test         # Run tests
pnpm test:ui      # Run tests with interactive UI
pnpm preview      # Preview production build
```

## Project Structure

```
docs/              # Design documentation for game systems
src/
├── components/     # React UI components (PlayerPanel, LocationView, etc.)
├── context/        # React context providers (GameContext, GameLoaderContext)
├── screens/        # Full-screen views (GameScreen, StartScreen)
├── model/          # Game logic & data structures
│   ├── Game.ts     # Main game state container
│   ├── Player.ts   # Player character stats and inventory
│   ├── Card.ts     # Quests, effects, traits, tasks
│   ├── Item.ts     # Inventory items
│   ├── Location.ts # Locations and navigation
│   ├── NPC.ts      # NPC entities
│   ├── Stats.ts    # Stat definitions
│   └── Scripts.ts  # Script registry system
├── story/          # Narrative content & game world
│   ├── World.ts    # Central registration (imports all story modules)
│   ├── Start.ts    # Initial setup & station NPCs
│   ├── Effects.ts  # Status effect definitions
│   └── [Area].ts   # Location-specific content (City, Tavern, School, etc.)
├── constants/      # Constants (storage keys)
└── utils/          # Utility functions
```

## Design Documentation

Detailed documentation for each system lives in `docs/`. Each doc below includes a brief summary of the key ideas.

### [GAME.md](./docs/GAME.md) -- Game Model Architecture

The architecture is built on a **template/instance** pattern: every entity (Location, NPC, Item, Card) has an immutable **definition** in a global registry and a mutable **instance** per game. Only instance data is serialised -- definitions are rebuilt on load, so content can change without breaking saves. The `Game` class is the central state container with a fluent scene API, a three-phase action loop (`beforeAction` → `takeAction` → `afterAction`), and lazy loading of locations and NPCs.

### [AUTHORING.md](./docs/AUTHORING.md) -- Content Authoring

All game content (locations, NPCs, items, quests) is defined in `src/story/` modules that register themselves at import time via `src/story/World.ts`. Content can be gated on stats, items, time, quest state, or NPC relationships. The DSL provides 40+ helpers for composing scenes, dialogue, branching, and skill checks. New areas follow a simple pattern: register locations/NPCs/scripts, import in World.ts in dependency order.

### [SCRIPTING.md](./docs/SCRIPTING.md) -- Script System

Two-layer scripting: imperative TypeScript functions for complex logic, and a declarative DSL that compiles to JSON-serialisable `[scriptName, params]` tuples. This enables save/load, hot-reloading, and data-driven content. Core scripts handle time, movement, inventory, stats, and the wait system with interruptible event hooks.

### [CARDS.md](./docs/CARDS.md) -- Card System

Cards are the primary mechanism for ongoing player effects. Quests, status effects, traits, and tasks are all cards with lifecycle hooks: `afterUpdate` (post-action checks), `onTime` (time-based decay/expiry), and `calcStats` (transient stat modifiers). Card instances carry arbitrary custom properties that serialise automatically, enabling per-instance state like alcohol level or completion flags.

### [CLOTHING.md](./docs/CLOTHING.md) -- Clothing System

Clothing uses a position + layer grid (12 body positions x 5 layers). Items can span multiple positions at one layer (e.g. a dress covers chest through legs). Only one item per slot; wearing a new item swaps the old one. Worn items modify stats via `calcStats` callbacks. Items extend base templates to inherit slot configuration. Players can save/load named outfits.

### [USER_INTERFACE.md](./docs/USER_INTERFACE.md) -- UI Conventions

Single stylesheet with CSS custom properties for all theming. Steampunk visual identity: brass/copper metallics, dark backgrounds, parchment text. Fluid layout via `clamp()` and flex/grid -- no media queries. Screen switcher pattern for game, character, inventory, quests, info, and settings views. All image paths go through `assetUrl()` for GitHub Pages compatibility.

### [TRAVEL.md](./docs/TRAVEL.md) -- Travel & Navigation

Location links connect areas and split into Travel (main-to-main) and Places. The `go` script handles the full travel flow: access check, `onFollow` hook (can interrupt), time passage, move, auto-discover, and arrival hooks. Secret locations start undiscovered and must be found through exploration (`discoverLocation`) or the city tour. The subway uses fare-gated `onFollow` hooks with interruptible waits. Links with `alwaysShow` bypass discovery filtering (e.g. subway entrances).

## Naming Conventions

- **IDs**: kebab-case (`npc-merchant`, `location-tavern`)
- **Classes/Types**: PascalCase (`Player`, `LocationDefinition`)
- **Functions/Properties**: camelCase (`onApproach`, `speechColor`)
- **Script names**: camelCase (`talkToMerchant`, `enterTavern`)

Text and names should be in British / International English to maintain Victorian vibe

## Testing

Tests live alongside source files as `*.test.ts`:
- `model/Game.test.ts` - Game serialization and state
- `model/Player.test.ts` - Player mechanics
- `model/Item.test.ts` - Inventory system

Tests import `story/World` to load all registered content.

## Build Notes

- Production builds target GitHub Pages at `/steamgirl/`
- Dev server runs at `localhost:3000`
- Strict TypeScript with no unused locals/parameters allowed
