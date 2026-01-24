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

## Core Architecture

### Object model

Key model objects:
- Game describes the full game state (can be serialised for snapshot)
- Player represents the player (stats, cards, invetory etc.)
- NPC
- Item
- Location

NPCs, Items, Locations etc. Have template definitions that contain static data. This *can* contain functions as they are recreated on game load / reload, which enables scripts / behaviour to be modified without invalidating saved data.


### Script-Based Narrative System

**See [SCRIPTING.md](./SCRIPTING.md) for complete scripting documentation.**

The game uses a two-layer scripting system:
1. **Imperative Scripts** - TypeScript functions for complex logic
2. **Declarative DSL** - JSON-serializable instructions for narrative content

Key principle: The DSL produces `[scriptName, params]` tuples that are fully JSON-serializable. This enables save/load, hot-reloading, and data-driven content.

```typescript
// Imperative (for complex logic)
makeScript('scriptName', (game, params) => {
  game.add('Story text')
  game.addOption('nextScript', {}, 'Button Label')
})

// Declarative DSL (for narrative content)
const scene: Instruction[] = [
  text('You enter the room.'),
  when(hasItem('key'), text('The door unlocks!')),
  option('leave', {}, 'Leave')
]
```

Script processing may be conditional:
- Many things shouldn't happen if already in a scene (i.e. scene options available)
- Many things may be gated on stats or item possession

### Content Registration Pattern

Game content registers via these functions:
- `registerLocation(id, definition)` - Locations
- `registerNPC(id, definition)` - NPCs
- `registerCardDefinition(id, definition)` - Cards (quests, effects, traits)
- `registerItemDefinition(id, definition)` - Items
- `makeScript(name, script)` or `makeScripts({...})` - Scripts

All story modules must be imported in `src/story/World.ts` in dependency order.

### Game Loop

1. `beforeAction()` - Prepare transient state
2. `takeAction(scriptName, params)` - Execute player action
3. `afterAction()` - Run side effects (card effects, NPC movement)

### State Persistence

- Game state serializes via `Game.toJSON()` / `Game.fromJSON()`
- Auto-saves to localStorage after each action
- Save keys defined in `src/constants/storage.ts`
- State includes options for next action so exact position can be restored, but this means that all choosable actions must be pure JSON

## Adding Content

### New Story Module

1. Create file in `src/story/` (e.g., `NewArea.ts`)
2. Register locations, NPCs, cards, and scripts
3. Import in `src/story/World.ts` (respect dependency order)

## Naming Conventions

- **IDs**: kebab-case (`npc-merchant`, `location-tavern`)
- **Classes/Types**: PascalCase (`Player`, `LocationDefinition`)
- **Functions/Properties**: camelCase (`onApproach`, `speechColor`)
- **Script names**: camelCase (`talkToMerchant`, `enterTavern`)

## Testing

Tests live alongside source files as `*.test.ts`:
- `model/Game.test.ts` - Game serialization and state
- `model/Player.test.ts` - Player mechanics
- `model/Item.test.ts` - Inventory system

Tests import `story/World` to load all registered content.

## Key Classes

- **Game**: Central state container with fluent API (`game.add().addOption()`)
- **Player**: Character stats, inventory, cards, skill tests
- **Location**: Places with descriptions, links, activities
- **NPC**: Characters with dialogue, schedules, relationship stats
- **Card**: Generic container for quests/effects/traits/tasks

## Time System

- Game time in Unix timestamps (seconds)
- Setting: January 1902 (steampunk era)
- Time advances via `timeLapse(minutes)` script
- By default, NPCs move when the hour changes

## Stats

- **Main Stats** (0-100): Agility, Perception, Wits, Charm, Willpower, Strength
- **Skills**: Aetherics, Dancing, Fitness, Etiquette, Mechanics, Flirtation, Haggling
- **Meters** (dynamic): Energy, Arousal, Composure, Stress, Pain, Mood

## Build Notes

- Production builds target GitHub Pages at `/steamgirl/`
- Dev server runs at `localhost:3000`
- Strict TypeScript with no unused locals/parameters allowed
