# NPC AI — Plan-Based Behaviour System

NPCs are driven by a generic plan/planner architecture that replaces all ad-hoc hooks (`onMove`, `onWait`, `maybeApproach`, etc.) with a single unified behaviour loop.

## Core Concepts

### Plans

A **Plan** is a script that represents what an NPC is currently doing. It executes with side effects (moving the NPC, creating scenes, adding text) and returns the next state of the plan:

- **Return an Instruction** — the updated plan. The NPC continues this on the next tick.
- **Return `null`** — the plan has completed or failed. The planner is invoked to choose a new plan.

Plans are JSON-serialisable `[scriptName, params]` instructions, so they survive save/load. The current NPC is always set as the active NPC before a plan runs, so plans access it via `game.npc` — no need to thread an NPC ID through params.

```typescript
// A plan that keeps the NPC at a location. Returns itself each tick.
makeScript('beAt', (game, params) => {
  game.npc.location = params.location
  return ['beAt', params]  // persist
})

// A plan to approach the player. One-shot — completes immediately.
makeScript('approachPlayer', (game) => {
  if (game.npc.location !== game.currentLocation) return null  // can't reach
  game.run('approach', { npc: game.npc.id })
  return null  // done
})
```

### Planners

A **Planner** is a function that examines game state and returns a Plan (or `null` if it has nothing to suggest). Planners embody NPC goals — "follow my schedule", "talk to the player if I like them", "push spice if conditions are right".

Planners are **stateless** — they look at the world and decide. Plans are **stateful** — they track what the NPC is in the middle of doing.

```typescript
type Planner = (game: Game, npc: NPC) => Instruction | null
```

### The `plan` Script

The entire AI is a single plan: `['plan', { current, planner }]`. The `planner` field is always an explicit Script reference — never a closure, always serialisable. At initialisation the NPC gets:

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

There is no special `runNpcAI` function. Ticking an NPC is just:

```typescript
game.scene.npc = npc.id        // set active NPC context
npc.plan = game.run(npc.plan)  // run the plan
game.scene.npc = undefined     // clear context
```

The `planner` param is a serialisable Script (a registered script name or Instruction). The `current` sub-plan is also serialisable. On load, if the saved sub-plan fails, the planner immediately provides a new one — graceful recovery.

### Recursive Composition

Because a plan IS a script and the `plan` script is itself a plan, they compose naturally. A multi-step plan can contain an inner `['plan', ...]` with its own planner script — separate from the NPC's base planner. Turtles all the way down.

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

## Built-in Planners

### `schedulePlanner(schedule)` — Follow a Timetable

The lowest-priority planner. Examines the current hour and returns a `beAt` plan for the matching schedule entry. Returns `null` if no entry matches (NPC goes offscreen).

```typescript
function schedulePlanner(schedule: ScheduleEntry[]): Planner {
  return (game, npc) => {
    const location = matchSchedule(game, schedule)
    if (!location) {
      npc.location = null
      return null
    }
    return ['beAt', { location }]
  }
}
```

This replaces the current `onMove` + `followSchedule` pattern. The schedule is just data fed to a planner.

### `approachPlayerPlanner(condition)` — Initiate Contact

Returns an `approachPlayer` plan when the NPC wants to talk to the player and they're in the same location. The condition is a predicate script that gates when the NPC wants to initiate.

```typescript
function approachPlayerPlanner(condition: Script): Planner {
  return (game, npc) => {
    if (npc.location !== game.currentLocation) return null
    if (!game.run(condition)) return null
    return ['approachPlayer', {}]
  }
}
```

This replaces `maybeApproach` — it's just a planner that fires when conditions are right.

### `datePlanner()` — Handle Date Meetings

Returns a plan to go to the date meeting location and greet the player when they arrive. Replaces the current `handleDateApproach` + date card `afterUpdate` positioning logic.

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

Returns a plan to visit the player's bedroom under certain conditions (relationship, time of day, probability).

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

If the NPC is in a bedroom with the player, stay there instead of following the schedule. Used for overnight stays after visits or dates.

```typescript
function bedroomStayPlanner(): Planner {
  return (game, npc) => {
    const loc = npc.location ? game.getLocation(npc.location) : undefined
    if (!loc?.template.isBedroom) return null
    if (npc.location !== game.currentLocation) return null
    return ['beAt', { location: npc.location }]
  }
}
```

### `idlePlanner(reactions)` — Ambient Presence

Returns a one-shot plan that produces ambient text. Doesn't create scenes or options — purely atmospheric. Used for "Gerald turns a page" type ambient presence.

```typescript
function idlePlanner(reactions: IdleReaction[]): Planner {
  return (game, npc) => {
    if (npc.location !== game.currentLocation) return null
    for (const r of reactions) {
      if (r.chance && Math.random() >= r.chance) continue
      if (r.condition && !game.run(r.condition)) continue
      return ['idleReact', { script: r.script }]
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

## Composite Planners

Planners compose via simple combinators:

### `priority(...planners)` — First Match Wins

Tries planners in order. Returns the first non-null plan. This is the standard way to build an NPC's full AI — higher-priority goals shadow lower ones.

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

Shuffles the planners, then tries them in random order. Returns the first non-null plan. Good for varied ambient behaviour where you don't want the same NPC doing the same thing every tick.

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

Like `randomPick` but with explicit weights. Useful when some behaviours should be more common than others.

```typescript
function weighted(...entries: [number, Planner][]): Planner
// e.g. weighted([3, spicePushPlanner], [1, flirtPlanner])
```

## Example: Rebuilding Rob

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

  // Player-initiated hooks — unchanged
  onFirstApproach: seq(/* ... */),
  onApproach: seq(/* ... */),
  onLeavePlayer: when(inPrivate(), npcInteract('morningDepart')),
  scripts: { /* ... */ },
})
```

## Example: Rebuilding Jonny

```typescript
registerNPC('jonny-elric', {
  name: 'Jonny Elric',
  // ...

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

## Example: Rebuilding Gerald

```typescript
registerNPC('landlord', {
  name: 'Gerald Moss',
  // ...

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

## Example: Rebuilding Timmy

```typescript
registerNPC('spice-dealer', {
  name: 'Timmy Bug',
  // ...

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
| `onMove` | `schedulePlanner` | Hourly (hour boundary in `timeLapse`) |
| `maybeApproach` | `approachPlayerPlanner` / `datePlanner` | Per wait chunk + before player approach |
| `onWait` (ambient) | `idlePlanner` | Per wait chunk |
| `onWait` (events) | `approachPlayerPlanner` with conditions | Per wait chunk |
| `onWaitAway` | `visitPlanner` | Per wait chunk |

### NPC Context

Before running a plan, the system sets the NPC as the active NPC so all scripts in the plan can access it via `game.npc`:

```typescript
game.scene.npc = npc.id
npc.plan = game.run(npc.plan)
game.scene.npc = undefined
```

### Integration with `timeLapse`

```typescript
// In timeLapse, when hour boundary crossed:
for (const [, npc] of game.npcs) {
  game.scene.npc = npc.id
  npc.plan = game.run(npc.plan)
  game.scene.npc = undefined
}
game.updateNPCsPresent()
```

### Integration with `wait`

```typescript
// In wait loop, each 10-min chunk:
for (const npcId of game.npcsPresent) {
  const npc = game.getNPC(npcId)
  game.scene.npc = npc.id
  npc.plan = game.run(npc.plan)
  game.scene.npc = undefined
  if (game.inScene) return  // NPC created a scene — stop waiting
}
// Also run for away NPCs (visit planners)
for (const [, npc] of game.npcs) {
  if (game.npcsPresent.includes(npc.id)) continue
  game.scene.npc = npc.id
  npc.plan = game.run(npc.plan)
  game.scene.npc = undefined
  if (game.inScene) return
}
```

## What Doesn't Change

The AI handles **NPC-initiated** behaviour: where NPCs go, when they approach the player, ambient reactions. It does NOT replace:

- **`onApproach` / `onFirstApproach`** — player-initiated conversations. The player clicks "Approach"; the NPC's dialogue script runs.
- **`scripts`** — named interaction scripts (`onGeneralChat`, `flirt`, `buySpice`). Player-driven menu choices within a conversation.
- **`onLeavePlayer`** — farewell hook when NPC leaves the player's location. Still fires from `beAt` plan when the schedule changes.
- **`afterUpdate`** — post-action hooks on cards and locations.
- **`modifyImpression`** — NPC-specific impression adjustments.
- **Date scenes** — the date scene script itself is unchanged. Only the positioning/meeting logic moves into `datePlanner`.

## Serialisation

The NPC's `plan` field serialises as a plain Instruction (it's already a `[scriptName, params]` tuple). The inner `current` sub-plan is part of the params. The top-level planner is on the definition and is never serialised.

```typescript
// NPCData gains one field:
interface NPCData {
  plan?: Instruction | null
}
```

On load, the saved `current` plan runs. If it fails (e.g. content changed between versions), it returns null and the planner provides a fresh plan — graceful recovery with no migration needed.

## Initialisation

When an NPC with a `planner` is first instantiated via `getNPC()`, its plan is set to the initial `['plan', ...]` instruction:

```typescript
// In getNPC(), after generate():
if (definition.planner) {
  npc.plan = ['plan', { current: null, planner: ['basePlanner', {}] }]
  // Run immediately so the planner sets the initial plan
  game.scene.npc = npcId
  npc.plan = game.run(npc.plan) as Instruction
  game.scene.npc = undefined
}
```

## Migration Path

1. Add `plan` field to NPC instance and serialisation.
2. Implement the `plan` script and the built-in planners.
3. Add `planner` field to `NPCDefinition`.
4. Migrate one NPC at a time: add `planner`, remove `onMove` / `maybeApproach` / `onWait` / `onWaitAway`.
5. Once all NPCs are migrated, remove the old hook dispatch code from `timeLapse` and `wait`.

NPCs with a `planner` use the new system; NPCs without one use the legacy hooks. Both coexist during migration.

## Future Possibilities

- **Multi-step plans**: a plan that sequences sub-plans (go to market, buy supplies, return home) — just nest `['plan', ...]` with a sub-planner.
- **Inter-NPC awareness**: planners that check other NPC locations/plans (avoid someone, follow someone).
- **Player-observable plans**: UI hints like "Rob is heading to the market" based on the current plan name.
- **Plan interruption**: external events can force-clear `npc.plan`, triggering immediate re-planning.
- **Mood-driven planning**: planners that weight options based on NPC mood/affection state, making behaviour feel organic rather than scripted.
