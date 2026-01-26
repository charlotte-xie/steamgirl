# NPC System

NPCs are non-player characters the player can encounter, talk to, and build relationships with. Each NPC has a static **definition** (personality, scripts, speech colour) and a mutable **instance** (location, stats). Only instance data is serialised; definitions are rebuilt on load.

## Architecture

NPCs follow the same template/instance pattern as the rest of the game model (see [GAME.md](./GAME.md)).

```
NPCDefinition   (static, registered via registerNPC())
  name, uname, description, image, speechColor
  generate, onFirstApproach, onApproach, onMove, onWait
  scripts: Record<string, Script>

NPC              (mutable instance, serialised)
  id, location, stats (Map<string, number>)
```

### Registration

```typescript
import { registerNPC } from '../model/NPC'

registerNPC('npc-id', {
  name: 'Display Name',
  uname: 'generic description',     // shown when name is unknown
  description: 'Full description.',
  image: '/images/npcs/npc.jpg',
  speechColor: '#c4a35a',
  generate: (game, npc) => { ... }, // called once on first instantiation
  onMove: (game) => { ... },        // called each hour change
  onFirstApproach: ...,             // script for first meeting
  onApproach: ...,                  // script for subsequent meetings
  scripts: { ... },                 // named interaction scripts
})
```

NPC definitions are registered from story modules and imported via `World.ts`.

### Instantiation

NPCs are **lazily instantiated** via `game.getNPC(id)`. The first call:

1. Creates a new `NPC` instance
2. Calls `definition.generate()` (if defined) to set initial state
3. Calls `definition.onMove()` (if defined) to position the NPC
4. Adds the instance to `game.npcs`

Subsequent calls return the existing instance. Location `onArrive` hooks typically call `getNPC()` to ensure NPCs at that location exist.

## Stats

NPCs track numeric stats via a `Map<string, number>`. Three standard stats have convenience getters/setters on the NPC class:

| Stat | Default | Purpose |
|------|---------|---------|
| `approachCount` | 0 | Number of times the player has approached this NPC |
| `nameKnown` | 0 | Whether the player knows the NPC's name (>0 = known) |
| `affection` | 0 | Affection level toward the player |

Custom stats can be added freely as string keys: `npc.stats.set('trust', 5)`.

### Name Reveal

When `nameKnown` is 0, the UI shows the NPC's `uname` (e.g. "barkeeper"). Once `nameKnown > 0`, the real `name` is displayed. Scripts typically set `npc.nameKnown = 1` during a first-meeting scene.

## Movement and Schedules

NPCs have a nullable `location` property. When set, the NPC appears at that location and is listed in `game.npcsPresent` (recalculated each action).

### onMove Hook

The `onMove` hook fires each time the game hour changes (during `timeLapse`). It is the standard place to implement NPC schedules.

### followSchedule

The `followSchedule` helper sets the NPC's location based on the current hour:

```typescript
npc.followSchedule(game, [
  [10, 18, 'market'],      // 10am--6pm at the market
  [19, 23, 'tavern'],      // 7pm--11pm at the tavern
])
```

Format: `[startHour, endHour, locationId]`. Hours are 0--23 integers (floor of `hourOfDay`). Supports midnight wrap-around (e.g. `[22, 2, 'tavern']`). If no entry matches, location is set to `null` (NPC is offscreen).

## Interaction

### Approaching an NPC

The `approach` core script is the standard way to start a conversation:

```typescript
game.run('approach', { npc: 'npc-id' })
```

This:
1. Increments `approachCount`
2. Sets `scene.npc` (enables NPC portrait and speech colour)
3. Runs `onFirstApproach` (if first meeting) or `onApproach`

### NPC Scripts

Named scripts on the definition are run via the `interact` core script:

```typescript
game.run('interact', { npc: 'npc-id', script: 'buyDrink' })
```

Or from within an NPC conversation using the fluent API:

```typescript
npc.option('Buy a drink', 'buyDrink')   // adds a button that calls interact
npc.chat()                               // runs the onGeneralChat script
npc.leaveOption('Goodbye.', 'See you.') // adds an end-conversation button
```

Each `interact` call costs 1 minute of game time.

### Fluent NPC API

The `NPC` class provides fluent methods for building conversation scenes:

| Method | Purpose |
|--------|---------|
| `npc.say(text)` | NPC speaks in their speech colour |
| `npc.option(label, scriptName, params?)` | Add an interaction button |
| `npc.chat()` | Run `onGeneralChat` script |
| `npc.leaveOption(text?, reply?, label?)` | Add conversation exit button |
| `npc.addOption(scriptName, params?, label?)` | Add a generic (non-NPC) option |

All methods return `this` for chaining.

## Wait Encounters

The `onWait` hook fires each 10-minute chunk when the player waits at a location where the NPC is present. It can create a scene to interrupt the wait -- useful for ambient encounters and one-shot events.

```typescript
onWait: (game: Game) => {
  const npc = game.getNPC('tour-guide')
  if (npc.nameKnown === 0) {
    game.run('approach', { npc: 'tour-guide' })
  }
}
```

NPC `onWait` hooks fire before the location's own `onWait` hook.

## Serialisation

Only mutable state is serialised:

```typescript
{ id: string, stats: Record<string, number>, location: string | null }
```

Definitions are never serialised -- they are rebuilt from `registerNPC()` calls on load. This allows NPC content (dialogue, scripts, images) to change between versions without breaking saves.

## Adding a New NPC

1. Register the NPC definition in the appropriate story module:

```typescript
registerNPC('my-npc', {
  name: 'Name',
  uname: 'description when unknown',
  speechColor: '#aabbcc',
  generate: (_game, npc) => { npc.location = 'some-location' },
  onMove: (game) => {
    game.getNPC('my-npc').followSchedule(game, [[9, 17, 'some-location']])
  },
  onApproach: (game) => { ... },
  scripts: { onGeneralChat: (g) => { ... } },
})
```

2. Ensure the NPC is instantiated by calling `game.getNPC('my-npc')` somewhere -- typically in the location's `onArrive` hook.

3. Import the module in `World.ts`.
