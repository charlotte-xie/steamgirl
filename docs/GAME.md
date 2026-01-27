# Game Model Architecture

The game model is built on a **template/instance** pattern. Every entity type (Location, NPC, Item, Card) has a static **definition** registered in a global registry and a mutable **instance** that stores per-game state. Definitions can contain functions and scripts because they are recreated on every load; only instance data is serialised. This separation means game content can be updated without invalidating saved games.

## Core Objects

| Class | Definition Type | Instance State | Registry |
|-------|----------------|----------------|----------|
| `Game` | -- | Score, time, scene, current location | -- |
| `Player` | -- | Stats, inventory, cards, outfits, timers | -- |
| `Location` | `LocationDefinition` | `numVisits`, `discovered` | `registerLocation()` |
| `NPC` | `NPCDefinition` | `location`, `stats` (affection, approachCount, nameKnown) | `registerNPC()` |
| `Item` | `ItemDefinition` | `number`, `worn`, `locked` | `registerItemDefinition()` |
| `Card` | `CardDefinition` | `type`, custom properties (completed, failed, etc.) | `registerCardDefinition()` |

Instances access their definition via a `template` getter that looks up the registry by ID. Definitions are never serialised.

## Game Class

`Game` is the central state container. It owns the player, all location and NPC instances, the current scene, and the game clock.

### Key Properties

```typescript
class Game {
  version: number              // Schema version
  score: number
  player: Player
  time: number                 // Unix timestamp (seconds), starts Jan 5 1902 noon
  currentLocation: string      // Location ID
  scene: SceneData             // Current narrative content and action buttons
  locations: Map<string, Location>   // Lazy-loaded
  npcs: Map<string, NPC>             // Lazy-loaded
  npcsPresent: string[]              // NPC IDs at current location
  uiScreen: string                   // Transient, not serialised
}
```

### Scene System

The scene holds everything the player currently sees -- narrative text, NPC dialogue, and action buttons:

```typescript
type SceneData = {
  type: 'story'
  content: Content[]           // Text blocks, speech, paragraphs
  options: SceneOptionItem[]   // Clickable action buttons → [scriptName, params]
  stack: Instruction[]         // Pending scene pages for multi-page sequences
  npc?: string                 // Scene's NPC (affects speech colour)
  hideNpcImage?: boolean
  shop?: ActiveShop            // When set, renders as shop interface
}
```

`game.inScene` returns `true` when there are options or a shop active. Many things (navigation overlays, activities) are hidden while in a scene.

#### Scene Stack

The `stack` stores pending pages for multi-page sequences created by `scenes()`. When `advanceScene` fires, it pops the next page from the stack and runs it. If the popped page has no options of its own, a Continue button is injected to advance to the next page. Non-`advanceScene` actions (like navigation) clear the stack via `takeAction`. The stack is serialised to JSON for save/load.

### Fluent Scene API

The Game class provides a fluent API for building scenes. All methods return `this` for chaining:

```typescript
game.add('You enter the room.')          // Add text
game.add({ type: 'speech', text: '...', color: '#abc' })  // Add speech
game.addOption('scriptName', {}, 'Button Label')           // Add action button
game.addQuest('quest-id')                // Add quest card
game.completeQuest('quest-id')           // Mark quest complete
game.addEffect('effect-id', { alcohol: 60 })  // Add effect with custom state
game.clearScene()                        // Clear content and options
```

### Script Execution

`game.run(script, params)` is the universal script runner. It accepts any script form:

- `null` / `undefined` -- no-op
- Function `(game, params) => result` -- called directly
- Instruction tuple `[scriptName, params]` -- recursively resolved
- String `scriptName` -- looked up in the script registry

### Lazy Loading

Locations and NPCs are created on first access via `game.getLocation(id)` and `game.getNPC(id)`. This avoids creating entities the player never encounters. NPCs call their `generate()` and `onMove()` hooks on first creation.

### Time System

- `game.time` -- Unix timestamp in seconds (January 1902)
- `game.date` -- JavaScript `Date` derived from timestamp
- `game.hourOfDay` -- Fractional hour (0--23.99), used for NPC scheduling
- `game.calcTicks(secondsElapsed, interval)` -- Number of interval boundaries crossed, useful for periodic effects
- `game.timeLapse(minutes)` -- Advances time via the `timeLapse` script

When an hour boundary is crossed during time advancement, all NPCs' `onMove` hooks fire and `npcsPresent` is updated.

## Game Loop

Every player action follows a three-phase cycle:

### 1. `beforeAction()`

Prepares transient state. Currently calls `updateNPCsPresent()` to sync NPC locations. Idempotent -- safe to call multiple times.

### 2. `takeAction(scriptName, params)`

Clears the scene, looks up the named script, and executes it. The script populates the scene with new content and options. Errors are caught and displayed gracefully as in-game text.

### 3. `afterAction()`

Runs `afterUpdate` hooks on all player cards (used by quests to check completion conditions). Clears the scene NPC reference when no options remain.

### Wait System

The `wait` script advances time in 10-minute chunks. After each chunk it fires `onWait` hooks on present NPCs (first) then the current location. If any hook creates a scene (adds options), the wait stops immediately. This enables ambient encounters during time passage.

### Navigation

The `go` script handles travel between locations:

1. Find the link from the current location to the destination
2. Check access via `link.checkAccess()` -- returns a reason string if denied
3. Run `link.onFollow()` -- can create a scene to cancel travel
4. Advance time by `link.time` minutes
5. Move to destination, mark as discovered
6. Fire `onFirstArrive` (first visit) then `onArrive`

## Player

The player owns stats, inventory, cards, outfits, and timers.

### Stats

Three categories, all on a 0--100 scale:

- **Main Stats** (6): Agility, Perception, Wits, Charm, Willpower, Strength
- **Skills** (7): Aetherics, Dancing, Fitness, Etiquette, Mechanics, Flirtation, Haggling -- each based on a main stat
- **Meters** (6): Energy, Arousal, Composure, Stress, Pain, Mood -- dynamic gauges

`player.calcStats()` recomputes stats from `basestats` by applying modifiers from worn clothing and active cards, then clamping to 0--100. Called after any change to items, cards, or base stats.

### Skill Tests

```typescript
player.skillTest(statName, difficulty): boolean
```

Rolls d100 against `basestat + skill - difficulty` (or `basestat - difficulty` for main stats). Roll of 1 always succeeds; roll of 100 always fails.

### Inventory

- `addItem(spec, count)` -- Stacks if stackable, otherwise adds new instance
- `removeItem(spec, count)` -- Reduces stack or removes entirely
- `countItem(id)` / `hasItem(id)` -- Query by ID

### Timers

Named timestamps (`lastSleep`, `lastEat`, etc.) recorded via `player.timers.set(name, game.time)`. Used by predicates like `timeElapsed(timer, minutes)` to gate content on cooldowns.

## Location

A location has a definition (name, image, links, activities, hooks) and mutable instance state (visit count, discovered flag).

### Links

Links connect locations and define travel time, access restrictions, and pre-travel scripts:

```typescript
interface LocationLink {
  dest: LocationId
  time: number                 // Minutes to travel
  label?: string               // Override nav label
  travel?: boolean             // Show under "Travel" vs "Places"
  cost?: number                // Krona cost (display)
  checkAccess?: (game) => string | null   // Access denial reason
  onFollow?: Script            // Pre-travel hook (can cancel with scene)
}
```

### Activities

Clickable actions available at a location, with optional visibility conditions:

```typescript
interface LocationActivity {
  name: string
  script: Script               // What happens when clicked
  condition?: Script           // When to show (predicate)
  image?: string
  symbol?: string
  label?: string
}
```

### Event Hooks

- `onFirstArrive` -- First visit only
- `onArrive` -- Every visit
- `onRelax` -- When player rests here
- `onWait` -- Each 10-minute chunk during wait (can interrupt with scene)

## NPC

NPCs have a definition (name, portrait, dialogue scripts, schedule) and mutable instance state (location, relationship stats).

### Key Stats

- `approachCount` -- Times the player has talked to this NPC
- `nameKnown` -- Whether the player knows the NPC's name (0 = unknown)
- `affection` -- Relationship value

### Scheduling

```typescript
npc.followSchedule(game, [
  [8, 18, 'market'],     // 8am--6pm at market
  [20, 2, 'tavern'],     // 8pm--2am at tavern (wraps midnight)
])
```

Called from the NPC's `onMove` hook when the hour changes.

### Dialogue Hooks

- `onFirstApproach` -- First conversation with player
- `onApproach` -- Subsequent conversations
- `onWait` -- When NPC is present and player is waiting
- `scripts` -- Named NPC-specific scripts, accessed via the `interact` system

### NPC Fluent API

```typescript
npc.say('Hello!')                        // Add NPC speech in their colour
   .option('Chat', 'onGeneralChat')      // Add interaction option
   .leaveOption('Goodbye.', 'See you!')  // Standard exit button
```

## Serialisation

### What's Saved

`Game.toJSON()` produces a `GameData` object containing:

- `version`, `score`, `time`, `currentLocation`
- `player` -- basestats, inventory (with worn/locked state), cards (with custom properties), outfits, timers
- `locations` -- only `numVisits` and `discovered` per location
- `npcs` -- only `stats` and `location` per NPC
- `scene` -- full scene content, options, and stack (enables exact position restore including multi-page sequences)

### What's Not Saved

Definitions (names, descriptions, scripts, hooks, calcStats callbacks) live in the registries and are rebuilt on load. `uiScreen` is transient.

### Restoration

`Game.fromJSON()` recreates instances from saved data, re-links them to their definitions via the `template` getter, calls `player.calcStats()`, and updates `npcsPresent`. Backward-compatible with older save formats.

## Key Source Files

| File | Purpose |
|------|---------|
| `src/model/Game.ts` | Game class, scene system, action cycle, serialisation |
| `src/model/Player.ts` | Stats, inventory, clothing, skill tests, outfits |
| `src/model/Location.ts` | LocationDefinition, links, activities, event hooks |
| `src/model/NPC.ts` | NPCDefinition, scheduling, dialogue, relationship stats |
| `src/model/Card.ts` | CardDefinition, Card class, quest/effect/trait types |
| `src/model/Item.ts` | ItemDefinition, Item class, clothing types, registry |
| `src/model/Stats.ts` | Stat/skill/meter definitions and metadata |
| `src/model/Scripts.ts` | Script registry, core scripts (timeLapse, wait, go, etc.) |
| `src/model/ScriptDSL.ts` | Declarative DSL helpers for content authoring |
| `src/model/Format.ts` | Content types (text, paragraph, speech, options) |
