# NPC System

NPCs are non-player characters the player can encounter, talk to, and build relationships with. Each NPC has a static **definition** (personality, scripts, speech colour) and a mutable **instance** (location, stats). Only instance data is serialised; definitions are rebuilt on load.

## Architecture

NPCs follow the same template/instance pattern as the rest of the game model (see [GAME.md](./GAME.md)).

```
NPCDefinition   (static, registered via registerNPC())
  name, uname, description, image, speechColor
  generate, onFirstApproach, onApproach, planner
  scripts: Record<string, Script>

NPC              (mutable instance, serialised)
  id, location, stats (Map<string, number>)
  plan (Instruction | null)
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
  planner: schedulePlanner([...]),   // AI behaviour (movement, schedules)
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
3. Sets up the plan structure if the NPC has a `planner`
4. Adds the instance to `game.npcs`

Subsequent calls return the existing instance. NPCs are positioned by `tickNPCs()` which runs their planners. Location `onArrive` hooks may call `getNPC()` to ensure NPCs at that location exist.

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

## AI and Behaviour

NPC behaviour is driven by a **plan-based AI system**. Each NPC has a `plan` field (a serialisable instruction that runs each tick) and a `planner` on its definition that provides new plans when the current one completes.

### Planners

A planner is a stateless function `(game, npc) => Instruction | null`. It examines game state and returns a plan. Planners are defined on `NPCDefinition` and never serialised — only their output is.

```typescript
import { schedulePlanner, priority } from '../model/Planner'

registerNPC('barkeeper', {
  planner: priority(
    datePlanner('barkeeper'),                    // highest priority: attend dates
    schedulePlanner([[10, 18, 'market']]),        // default: follow timetable
  ),
})
```

**Built-in planners:**
- `schedulePlanner(entries)` — follow a timetable. String targets become `beAt(location)`. No match → go offscreen. Only manages NPCs at scheduled locations — NPCs at unscheduled locations (e.g. the player's room) are left alone until the schedule has somewhere to send them.
- `bedroomStayPlanner({ before })` — stay in a bedroom with the player (e.g. until morning)
- `datePlanner(npcId)` — attend dates at the meeting location during the wait window
- `actionPlanner(entries)` — rate-driven NPC actions: interactions, ambient behaviour, independent plans (see below)
- `idlePlanner(reactions)` — simple ambient reactions when co-located (use `actionPlanner` for new NPCs)
- `approachPlayerPlanner(condition)` — approach the player when a condition is met

**Compositors:**
- `priority(...planners)` — try in order, return first non-null
- `randomPick(...planners)` — shuffle then try in order
- `weighted([weight, planner], ...)` — weighted random selection

### Tick Rate

`tickNPCs()` runs after every player action and during travel. NPCs at the player's location tick every action. Non-present NPCs only tick when a 15-minute game-time boundary is crossed.

### Movement

NPCs have a nullable `location` property. When set, the NPC appears at that location and is listed in `game.npcsPresent`. The `beAt` script handles movement with arrival/departure text:
- Departure text when leaving the player's location (uses `onLeavePlayer` if defined)
- Arrival text when entering the player's location (suppressed on initial placement)

### Legacy Hooks

> `onMove`, `onWait`, `onWaitAway`, and `maybeApproach` are legacy hooks superseded by the planner system. They still function for NPCs that haven't been migrated but should not be used for new NPCs.

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

## Impressions

NPCs should react to the player's appearance using **impressions** (`decency`, `appearance`, `attraction`) rather than checking clothing directly. Impressions are 0--100 scores computed from clothing coverage, grooming, and item modifiers, then adjusted per-NPC via `modifyImpression`. See [AUTHORING.md](./AUTHORING.md#impressions) for DSL usage.

```typescript
// Gate dialogue on the NPC's impression of the player
when(impression('decency', { max: 59 }),
  say('You might want to put some proper clothes on.'),
)

// In imperative scripts
import { impression } from '../model/Impression'
const score = impression(game, 'appearance', 'gerald-ashworth')
```

NPCs can define `modifyImpression` to express personal preferences (e.g. Gerald values modesty, so his decency impression is harsher):

```typescript
registerNPC('gerald-ashworth', {
  modifyImpression: (npc, name, score) => {
    if (name === 'decency') return score - 10  // stricter standards
    return score
  },
})
```

### Impression Gating: NPC Action, Not Player Choice

Impressions gate **what the NPC does**, not what the player can attempt. The player should always see their options and be free to try; the NPC's reaction changes based on how the player looks.

**Rule:** Never hide or disable a player option based on an impression score. Instead, branch the NPC's response:

```typescript
// WRONG — removes player agency
when(impression('appearance', { min: 50 }),
  option('Flirt', npcInteract('flirt')),   // hidden if appearance < 50
)

// RIGHT — player can always try; NPC reacts differently
option('Flirt', npcInteract('flirt')),     // always visible

// Inside the flirt script:
cond(
  impression('appearance', { min: 50 }),
  // He's receptive — run skill check for execution quality
  skillCheck('Flirtation', 20, charmSuccess, awkwardFail),
  // He's not interested — polite brush-off
  seq(say('Charming. If you\'ll excuse me.'), npcLeaveOption()),
)
```

This gives the player clear feedback ("he wasn't interested — I need to look better") without silently removing choices. The player learns the rules of the world by attempting things and observing NPC reactions, not by noticing missing buttons.

**Exceptions:**
- **Decency gates on locations** (staff ejecting you) are fine — these are NPC-initiated and happen on arrival, not as disabled options.
- **Skill gates** (`gatedBranch(hasStat(...))`) on player actions are fine — these represent the player's own ability, not NPC perception. You can't attempt a backflip if you've never trained gymnastics.

## NPC Actions

Use `actionPlanner` for rate-driven NPC actions — interactions, ambient behaviour, independent plans. Each entry has a `rate` (average seconds between occurrences) and a `script` to run. Probability follows a Poisson model: `p = 1 - e^(-elapsed/rate)`, so actions feel natural rather than clockwork.

```typescript
import { actionPlanner, priority, schedulePlanner } from '../model/Planner'

registerNPC('barkeeper', {
  planner: priority(
    actionPlanner([
      { rate: 1800, script: random(                    // ~every 30 min
        'Martha polishes a glass, watching the room.',
        'Martha refills your drink without being asked.',
      )},
      { rate: 3600, condition: npcStat('affection', { min: 20 }),
        script: say('You know, you\'re one of my favourite regulars.'),
      },
      // Boyfriend evening visit — fires when NPC is elsewhere
      { rate: 3600, away: true,
        condition: and(hasRelationship('boyfriend'), inBedroom(), hourBetween(18, 22)),
        script: run('approach', { npc: 'barkeeper' }),
      },
    ]),
    schedulePlanner([[10, 23, 'tavern']]),
  ),
})
```

Entries default to **co-located** (fires when NPC is at the player's location). Set `away: true` for actions when the NPC is elsewhere (e.g. boyfriend visits, independent plans).

Conditions can be applied at three levels:
- **Per-entry** — `condition` field on each entry (checked after the probability roll)
- **Whole planner** — wrap `actionPlanner` in a conditional planner or `priority()` gating
- **In-script** — the script itself handles gating (fires but may do nothing)

The NPC's `_lastTick` stat tracks timing automatically. The first tick sets a baseline without firing.

> **Legacy:** `idlePlanner`, `approachPlayerPlanner`, `onWait`, `onWaitAway`, and `maybeApproach` are legacy hooks superseded by `actionPlanner`. They still function for unmigrated NPCs but should not be used for new NPCs.

## Serialisation

Only mutable state is serialised:

```typescript
{ id: string, stats: Record<string, number>, location: string | null, plan?: Instruction | null }
```

Definitions are never serialised -- they are rebuilt from `registerNPC()` calls on load. This allows NPC content (dialogue, scripts, images) to change between versions without breaking saves.

## Adding a New NPC

1. Register the NPC definition in the appropriate story module:

```typescript
import { schedulePlanner } from '../model/Planner'

registerNPC('my-npc', {
  name: 'Name',
  uname: 'description when unknown',
  speechColor: '#aabbcc',
  planner: schedulePlanner([[9, 17, 'some-location']]),
  onApproach: seq(
    say('Hello there.'),
    option('Chat', run('npc:onChat')),
    npcLeaveOption(),
  ),
  scripts: {
    onChat: seq(
      say('Nice weather, isn\'t it?'),
      npcLeaveOption(),
    ),
  },
})
```

2. Ensure the NPC is instantiated by calling `game.getNPC('my-npc')` somewhere — typically in the location's `onArrive` hook.

3. Import the module in `World.ts`.
