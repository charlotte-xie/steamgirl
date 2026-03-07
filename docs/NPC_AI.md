# NPC AI — Plan-Based Behaviour System

NPCs are driven by a generic plan/planner architecture that replaces all ad-hoc hooks (`onMove`, `onWait`, `maybeApproach`, etc.) with a single unified behaviour loop.

## Core Concepts

### Plans

A **Plan** is a script that represents what an NPC is currently doing. It executes with side effects and returns:

- **`null`** — the plan is complete. The planner is invoked to choose a new plan. This is the common case — most plans are one-shot.
- **An Instruction** — the updated plan. The NPC continues this on the next tick. Used by extended plans that track state across ticks (e.g. `idle`).

Plans are JSON-serialisable `[scriptName, params]` instructions, so they survive save/load. The current NPC is always set as the active NPC before a plan runs, so plans access it via `game.npc`.

```typescript
// One-shot plan: set location, show arrival/departure text, done.
makeScript('beAt', (game, params) => {
  const npc = game.npc
  const oldLocation = npc.location
  const newLocation = params.location as string

  if (oldLocation !== newLocation) {
    // Departure text if leaving the player's location
    if (oldLocation === game.currentLocation && !game.player.sleeping) {
      if (npc.template.onLeavePlayer && !game.inScene) {
        game.run(npc.template.onLeavePlayer)
      } else {
        game.add(`{npc} leaves.`)
      }
    }
    npc.location = newLocation
    // Arrival text if entering the player's location
    if (newLocation === game.currentLocation && !game.player.sleeping) {
      game.add(`{npc} arrives.`)
    }
  }

  return null  // one-shot — planner re-evaluates next tick
})

// Extended plan: do nothing until a time, then complete.
makeScript('idle', (game, params) => {
  if (game.time >= (params.until as number)) return null
  return ['idle', params]  // keep waiting
})

// One-shot plan: NPC approaches the player.
makeScript('approachPlayer', (game) => {
  if (game.npc.location !== game.currentLocation) return null
  game.run('approach', { npc: game.npc.id })
  return null
})
```

### Plan Lifecycle

Most plans are **one-shot**: they execute their effect and return null, letting the planner decide what to do next. This means the planner re-evaluates every tick, which is how priority works — a high-priority goal (date, approach player) can outrank a low-priority one (schedule) on any tick.

**Extended plans** return themselves with updated params to track multi-tick state. They "lock" the NPC into an activity until it completes. Examples: `idle` (wait until a time), `dateWait` (wait at meeting point), `patrol` (cycle through locations).

Rule of thumb: if a plan doesn't need to track state across ticks, make it one-shot.

### Planners

A **Planner** is a function that examines game state and returns a Plan (or `null` if it has nothing to suggest). Planners embody NPC goals — "follow my schedule", "talk to the player if I like them", "push spice if conditions are right".

Planners are **stateless** — they look at the world and decide. Plans are **stateful** — they track what the NPC is in the middle of doing.

```typescript
type Planner = (game: Game, npc: NPC) => Instruction | null
```

### The `plan` Script

The entire AI is a single plan: `['plan', { current, planner }]`. The `planner` field is always a serialisable Script reference — never a closure. At initialisation the NPC gets:

```typescript
['plan', { current: null, planner: ['basePlanner', {}] }]
```

The `basePlanner` script bridges to the NPC definition's `planner` function:

```typescript
makeScript('basePlanner', (game) => {
  const planner = game.npc.template.planner
  if (!planner) return null
  return planner(game, game.npc)
})
```

The `plan` script is the AI loop. It runs the inner `current` plan, and when it completes (returns null), runs the `planner` script to get a new one. The `plan` script is fully generic — it knows nothing about NPC definitions.

```typescript
makeScript('plan', (game, params) => {
  let current = params.current as Instruction | null

  // 1. Run the current inner plan
  if (current) {
    current = game.run(current) as Instruction | null
  }

  // 2. If plan completed/failed, ask the planner for a new one
  if (!current && params.planner) {
    current = game.run(params.planner) as Instruction | null
    if (current) {
      // Run the new plan immediately (it may complete in one tick)
      current = game.run(current) as Instruction | null
    }
  }

  // 3. Return the updated plan instruction
  return ['plan', { current, planner: params.planner }]
})
```

Ticking an NPC is:

```typescript
game.scene.npc = npc.id
npc.plan = game.run(npc.plan)
game.scene.npc = undefined
```

### DSL Composability

Plans are Instructions, and DSL builders produce Instructions. They compose naturally:

```typescript
// seq() as a one-shot plan — runs all steps, returns null
const arriveAndGreet = seq(
  text('{npc} arrives and waves.'),
  run('beAt', { location: 'station' }),
)

// when() as a conditional plan — runs the plan if condition is true, otherwise null
when(npcStat('affection', { min: 20 }),
  run('approachPlayer'),
)

// cond() for branching plans
cond(
  hasRelationship('boyfriend'),
  run('visitPlayer'),
  run('beAt', { location: 'station' }),
)
```

Planner conditions also use DSL predicates. The predicate is a Script, executed via `game.run()`:

```typescript
approachPlayerPlanner(
  and(npcStat('affection', { min: 15 }), not(hasCard('date')), chance(0.3))
)
```

Since `seq`, `when`, `cond`, `run` all return null (or the result of their inner scripts), they behave as one-shot plans when used directly.

### Recursive Composition

Because a plan IS a script and the `plan` script is itself a plan, they compose naturally. A multi-step plan can contain an inner `['plan', ...]` with its own planner script. Turtles all the way down.

```typescript
// Register a patrol planner as a named script
makeScript('jonnyPatrolPlanner', (game) => {
  const locations = ['docks', 'market', 'lowtown']
  const pick = locations[Math.floor(Math.random() * locations.length)]
  return ['beAt', { location: pick }]
})

// Used inside a higher-level plan:
['plan', { current: null, planner: ['jonnyPatrolPlanner', {}] }]
```

## Built-in Plans

### `beAt` — Be At a Location

One-shot. Sets the NPC's location. Shows arrival/departure text if the player is present. Fires `onLeavePlayer` hook if the NPC is leaving the player's location.

### `idle` — Wait Until a Time

Extended. Returns itself until `game.time >= params.until`, then returns null. Used for scheduled stays, cooldowns, or any "do nothing for a while" pattern.

```typescript
// Planner can use idle to keep the NPC in place until the schedule changes:
return seq(run('beAt', { location: 'station' }), run('idle', { until: nextHourBoundary }))
```

### `approachPlayer` — Initiate Contact

One-shot. Calls the `approach` script if the NPC is at the player's location. Returns null.

### `visitPlayer` — Visit the Player's Location

One-shot. Moves the NPC to the player's location and initiates an interaction. Used for boyfriend visits, NPC drop-ins, etc.

## Built-in Planners

Planners are closure factories on the NPC definition. They're never serialised — only their output (plans) is.

### `schedulePlanner(schedule)` — Follow a Timetable

The lowest-priority planner. Examines the current hour and returns a `beAt` plan for the matching schedule entry. Returns `null` if no entry matches (NPC goes offscreen via `beAt` with null location).

```typescript
function schedulePlanner(schedule: ScheduleEntry[]): Planner {
  return (game, npc) => {
    const location = matchSchedule(game, schedule)
    if (!location) {
      if (npc.location) return ['beAt', { location: null }]  // leave
      return null  // already offscreen
    }
    if (npc.location === location) return null  // already there
    return ['beAt', { location }]
  }
}
```

### `approachPlayerPlanner(condition)` — Initiate Contact

Returns an `approachPlayer` plan when the NPC wants to talk to the player and they're in the same location. The condition is a predicate (Script).

```typescript
function approachPlayerPlanner(condition: Script): Planner {
  return (game, npc) => {
    if (npc.location !== game.currentLocation) return null
    if (!game.run(condition)) return null
    return ['approachPlayer', {}]
  }
}
```

### `datePlanner()` — Handle Date Meetings

Returns a plan to go to the date meeting location and greet the player when they arrive. Replaces `handleDateApproach` + date card `afterUpdate` positioning.

```typescript
function datePlanner(): Planner {
  return (game, npc) => {
    const dateCard = game.player.cards.find(
      c => c.id === 'date' && c['npc'] === npc.id && !c.completed
    )
    if (!dateCard) return null
    const meetTime = dateCard['meetTime'] as number
    const meetLocation = dateCard['meetLocation'] as string
    const waitMinutes = /* from date plan */ 120
    if (game.time >= meetTime && game.time < meetTime + waitMinutes * 60) {
      return ['dateWait', { location: meetLocation }]
    }
    return null
  }
}
```

### `visitPlanner(opts)` — Random Visits

Returns a plan to visit the player's bedroom under certain conditions.

```typescript
function visitPlanner(opts: {
  relationship?: string
  hours?: [number, number]
  chance?: number
}): Planner {
  return (game, npc) => {
    if (opts.relationship && game.player.relationships.get(npc.id) !== opts.relationship) return null
    if (!game.location.template.isBedroom) return null
    const h = game.hourOfDay
    if (opts.hours && (h < opts.hours[0] || h >= opts.hours[1])) return null
    if (opts.chance && Math.random() >= opts.chance) return null
    return ['visitPlayer', {}]
  }
}
```

### `bedroomStayPlanner()` — Stay With Player

If the NPC is in a bedroom with the player, stay instead of following the schedule.

```typescript
function bedroomStayPlanner(): Planner {
  return (game, npc) => {
    const loc = npc.location ? game.getLocation(npc.location) : undefined
    if (!loc?.template.isBedroom) return null
    if (npc.location !== game.currentLocation) return null
    return null  // no plan needed — NPC is already where they should be
  }
}
```

Note: returns `null` (not a `beAt` plan) because the NPC is already in position. The effect is that this planner "absorbs" the tick — lower-priority planners (like schedulePlanner) don't get to run, so the NPC stays put.

### `idlePlanner(reactions)` — Ambient Presence

Returns a one-shot text plan from a weighted list of ambient reactions. Only fires when the NPC is at the player's location.

```typescript
function idlePlanner(reactions: IdleReaction[]): Planner {
  return (game, npc) => {
    if (npc.location !== game.currentLocation) return null
    for (const r of reactions) {
      if (r.chance && Math.random() >= r.chance) continue
      if (r.condition && !game.run(r.condition)) continue
      // Run the reaction directly (one-shot, no intermediate plan)
      game.run(r.script)
      return null
    }
    return null
  }
}

interface IdleReaction {
  chance?: number
  condition?: Script
  script: Script
}
```

Note: `idlePlanner` runs the reaction script directly rather than returning a plan containing a closure. This avoids serialisation issues with Script closures in plan params.

## Composite Planners

### `priority(...planners)` — First Match Wins

Tries planners in order. Returns the first non-null plan.

```typescript
function priority(...planners: Planner[]): Planner {
  return (game, npc) => {
    for (const planner of planners) {
      const plan = planner(game, npc)
      if (plan) return plan
    }
    return null
  }
}
```

### `randomPick(...planners)` — Shuffled Selection

Shuffles the planners, then tries them in random order. Returns the first non-null plan.

```typescript
function randomPick(...planners: Planner[]): Planner {
  return (game, npc) => {
    const shuffled = [...planners]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    for (const planner of shuffled) {
      const plan = planner(game, npc)
      if (plan) return plan
    }
    return null
  }
}
```

### `weighted(entries)` — Weighted Random Selection

Like `randomPick` but with explicit weights.

```typescript
function weighted(...entries: [number, Planner][]): Planner
// e.g. weighted([3, spicePushPlanner], [1, flirtPlanner])
```

## Examples

### Rob

```typescript
registerNPC('tour-guide', {
  name: 'Rob Hayes',
  // ...

  planner: priority(
    datePlanner(),
    bedroomStayPlanner(),
    visitPlanner({ relationship: 'boyfriend', hours: [18, 22], chance: 0.2 }),
    approachPlayerPlanner(not(npcStat('nameKnown', { min: 1 }))),
    schedulePlanner([[9, 18, 'station']]),
  ),

  // Player-initiated — unchanged
  onFirstApproach: seq(/* ... */),
  onApproach: seq(/* ... */),
  onLeavePlayer: when(inPrivate(), npcInteract('morningDepart')),
  scripts: { /* ... */ },
})
```

### Jonny

```typescript
registerNPC('jonny-elric', {
  planner: priority(
    datePlanner(),
    approachPlayerPlanner(
      and(npcStat('affection', { min: 15 }), not(hasCard('date')), chance(0.3))
    ),
    idlePlanner([
      { chance: 0.15, script: random(
        'Jonny leans against the wall, watching the crowd with half-closed eyes.',
        'Jonny adjusts his monocle and scans the street.',
      )},
    ]),
    schedulePlanner([
      [6, 10, 'docks', [1]],
      [10, 14, 'market', [2]],
      [14, 19, 'back-alley', [4]],
      [6, 10, 'docks'],
      [10, 11, 'backstreets'],
      [11, 13, 'market'],
      [13, 14, 'backstreets'],
      [14, 16, 'lowtown'],
      [16, 19, 'subway-lowtown'],
      [20, 24, 'copper-pot-tavern'],
    ]),
  ),
})
```

### Gerald

```typescript
registerNPC('landlord', {
  planner: priority(
    idlePlanner([
      { chance: 0.2, condition: isLustful(), script: random(
        'Gerald glances at you over his ledger, then looks away quickly.',
        'Gerald clears his throat and adjusts his collar.',
        'You catch Gerald watching you. He pretends to be reading.',
      )},
      { chance: 0.2, script: random(
        'Gerald turns a page in his ledger and sighs.',
        'Gerald mutters something about property rates.',
      )},
    ]),
    schedulePlanner([
      [9, 12, 'landlord-office', WEEKDAYS],
      [16, 18, 'landlord-office', WEEKDAYS],
    ]),
  ),
})
```

### Timmy

```typescript
registerNPC('spice-dealer', {
  planner: priority(
    datePlanner(),
    approachPlayerPlanner(
      and(
        npcStat('respect', { max: 39 }),
        not(reputation('gangster', { min: 40 })),
        timerElapsed('lastPush', 24 * 60),
        chance(0.2),
      )
    ),
    idlePlanner([
      { chance: 0.15, condition: reputation('gangster', { min: 30 }), script: random(
        'Timmy glances your way and quickly looks elsewhere.',
        'Timmy straightens his coat when he notices you.',
      )},
      { chance: 0.15, condition: reputation('junkie', { min: 15 }), script: random(
        'Timmy catches your eye and taps his coat pocket.',
        'Timmy gives you a conspiratorial nod.',
      )},
      { chance: 0.15, script: random(
        'Timmy leans against the wall, turning a packet over in his mechanical hand.',
        'Timmy is haggling with someone in a doorway.',
      )},
    ]),
    schedulePlanner([
      [10, 13, 'market', [3]],
      [14, 18, 'docks', [5]],
      [15, 2, 'lowtown'],
      [2, 3, 'backstreets'],
      [4, 7, 'docks'],
    ]),
  ),
})
```

## When Does the AI Run?

The AI replaces several current hooks:

| Current Hook | Replaced By | When |
|---|---|---|
| `onMove` | `schedulePlanner` | Per NPC tick |
| `maybeApproach` | `approachPlayerPlanner` / `datePlanner` | Per NPC tick |
| `onWait` (ambient) | `idlePlanner` | Per NPC tick |
| `onWait` (events) | `approachPlayerPlanner` with conditions | Per NPC tick |
| `onWaitAway` | `visitPlanner` | Per NPC tick |

### NPC Tick — Separated from timeLapse

The NPC AI tick is a **game-level concern**, not part of time advancement. `timeLapse` only handles low-level time effects (energy, card `onTime`, hunger). NPC plan execution is called explicitly by higher-level code.

```typescript
/** Tick all NPC plans. Called by game loop after time advancement. */
function tickNPCs(game: Game): void {
  if (game.inScene) return  // don't move NPCs during scenes

  for (const [, npc] of game.npcs) {
    if (!npc.plan) continue
    game.scene.npc = npc.id
    npc.plan = game.run(npc.plan) as Instruction
    game.scene.npc = undefined
    if (game.inScene) return  // NPC created a scene — stop ticking
  }
  game.updateNPCsPresent()
}
```

### Call Sites

**After time advancement** — whenever time passes (travel, activities, waiting), tick NPCs to update positions:

```typescript
// In afterAction(), after recalculating stats:
tickNPCs(game)
```

**During waits** — each 10-minute chunk:

```typescript
// In wait loop:
game.timeLapse(chunk)
tickNPCs(game)
if (game.inScene) return  // NPC created a scene — stop waiting
```

**Before player approach** — give the NPC's AI a chance to intercept (date greeting, leaving):

```typescript
// In the approach script, before normal greeting:
if (npc.plan) {
  game.scene.npc = npcId
  npc.plan = game.run(npc.plan) as Instruction
  // NPC might have left or started a scene
  if (game.inScene) return
  if (npc.location !== game.currentLocation) {
    game.add(`{npc} leaves before you can reach {npc:him}.`)
    game.scene.npc = undefined
    return
  }
}
```

## What Doesn't Change

The AI handles **NPC-initiated** behaviour: where NPCs go, when they approach the player, ambient reactions. It does NOT replace:

- **`onApproach` / `onFirstApproach`** — player-initiated conversations. The player clicks "Approach"; the NPC's dialogue script runs.
- **`scripts`** — named interaction scripts (`onGeneralChat`, `flirt`, `buySpice`). Player-driven menu choices within a conversation.
- **`onLeavePlayer`** — farewell hook when NPC leaves the player's location. Fired by `beAt` when detecting a location change away from the player.
- **`afterUpdate`** — post-action hooks on cards and locations.
- **`modifyImpression`** — NPC-specific impression adjustments.
- **Date scenes** — the date scene script itself is unchanged. Only the positioning/meeting logic moves into `datePlanner`.

## Serialisation

The NPC's `plan` field serialises as a plain Instruction. The inner `current` sub-plan and `planner` reference are part of the params — all serialisable.

```typescript
// NPCData gains one field:
interface NPCData {
  plan?: Instruction | null
}
```

On load, the saved `current` plan runs. If it fails (e.g. content changed between versions), it returns null and the planner provides a fresh plan — graceful recovery.

## Initialisation

When an NPC with a `planner` is first instantiated via `getNPC()`, its plan is set to the initial `['plan', ...]` instruction:

```typescript
// In getNPC(), after generate():
if (definition.planner) {
  npc.plan = ['plan', { current: null, planner: ['basePlanner', {}] }]
  game.scene.npc = npcId
  npc.plan = game.run(npc.plan) as Instruction
  game.scene.npc = undefined
}
```

## Migration Path

1. Add `plan` field to NPC instance and serialisation.
2. Implement the `plan` / `basePlanner` scripts and the built-in plan scripts (`beAt`, `idle`, `approachPlayer`).
3. Implement the built-in planner factories (`schedulePlanner`, `approachPlayerPlanner`, etc.) and compositors (`priority`, `randomPick`).
4. Add `planner` field to `NPCDefinition`.
5. Extract NPC movement from `timeLapse` into `tickNPCs`.
6. Migrate one NPC at a time: add `planner`, remove `onMove` / `maybeApproach` / `onWait` / `onWaitAway`.
7. Once all NPCs are migrated, remove the old hook dispatch code.

NPCs with a `planner` use the new system; NPCs without one use the legacy hooks. Both coexist during migration.

## Future Possibilities

- **Multi-step plans**: a plan that sequences sub-plans (go to market, buy supplies, return home) — just nest `['plan', ...]` with a sub-planner.
- **Inter-NPC awareness**: planners that check other NPC locations/plans (avoid someone, follow someone).
- **Player-observable plans**: UI hints like "Rob is heading to the market" based on the current plan name.
- **Plan interruption**: external events can force-clear `npc.plan`, triggering immediate re-planning.
- **Mood-driven planning**: planners that weight options based on NPC mood/affection state, making behaviour feel organic rather than scripted.
