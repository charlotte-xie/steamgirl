# Scripting System

Technical reference for the SteamGirl scripting system. For writing guidelines, see [AUTHORING.md](./AUTHORING.md).

## Architecture

Two-layer system:

1. **Declarative DSL** (preferred) -- JSON-serialisable `[scriptName, params]` tuples built by helper functions. Enables save/load, hot-reloading, and data-driven content.
2. **Imperative scripts** (fallback) -- TypeScript functions for complex logic, calculations, or subsystems that exceed the DSL's expressiveness.

Both coexist freely. The DSL compiles to imperative script calls, so they interleave without friction.

### Instructions are Data

```typescript
type Instruction = [string, Record<string, unknown>]

text('Hello')  // Returns: ['text', { parts: ['Hello'] }]
```

Everything in game state must be JSON-serialisable -- no functions, no class instances, no circular references. This is what makes save/load work.

### SceneElement Auto-wrapping

A `SceneElement` is an `Instruction` or a plain string. Strings auto-wrap to `text()` in all DSL builders:

```typescript
seq('You enter the room.', say('Welcome!'))
// Equivalent to:
seq(text('You enter the room.'), say('Welcome!'))
```

## DSL Reference

### Content

| Builder | Description |
|---------|-------------|
| `text(...parts)` | Narrative text. Parts: strings or Instructions (`playerName()`, `npcName()`) |
| `say(...parts)` | NPC speech in scene NPC's colour. Do not include quotation marks |
| `paragraph(...content)` | Formatted paragraph with `hl()` highlights |
| `playerName()` / `npcName(npc?)` | Inline name with colour (for use inside `text()` or `say()`) |
| `option(label, script?, params?)` | Fire-and-forget button |
| `npcLeaveOption(text?, reply?, label?)` | Standard conversation exit |
| `npcInteract(script, params?)` | Run a named NPC script |

### Control Flow

| Builder | Description |
|---------|-------------|
| `seq(...elements)` | Execute in sequence |
| `when(cond, ...then)` / `unless(cond, ...then)` | Conditional blocks |
| `cond(c1, e1, c2, e2, ..., default?)` | Multi-branch conditional (Lisp-style) |
| `random(...children)` | Pick one at random. Supports `when()` entries for conditional pools |
| `skillCheck(skill, diff?, onSuccess?, onFailure?)` | Stat roll with callbacks |

### Scene Composition

| Builder | Description |
|---------|-------------|
| `scenes(...pages)` | Multi-page sequence with auto Continue buttons |
| `scene(...elements)` | Group elements into one page (alias for `seq`) |
| `branch(label, ...elements)` | Player choice with auto-resume. Use `scenes()` for multi-page |
| `choice(...branches, ...epilogue)` | Branches with shared ending |
| `gatedBranch(cond, label, ...elements)` | Conditional branch |
| `menu(...entries)` | Repeatable choice loop (`branch` loops, `exit` breaks) |
| `exit(label, ...elements)` | Terminal branch inside `menu()` |

### Game Actions

| Builder | Description |
|---------|-------------|
| `move(location, minutes?)` | Teleport (optionally advance time) |
| `go(location, minutes?)` | Travel with link checks, time, hooks |
| `timeLapse(minutes)` / `timeLapseUntil(hour)` | Advance time |
| `addItem(item, count?)` / `removeItem(item, count?)` | Inventory |
| `addStat(stat, change, opts?)` | Modify player stat (`max`, `min`, `chance`, `hidden`) |
| `addNpcStat(stat, change, opts?)` | Modify NPC stat (`npc`, `max`, `min`, `hidden`) |
| `addReputation(rep, change, opts?)` | Modify faction reputation |
| `moveNpc(npc, location)` | Move NPC (`null` to clear) |
| `setNpc(npcId)` | Set scene NPC |
| `hideNpcImage()` / `showNpcImage()` | Toggle NPC portrait |
| `learnNpcName()` | Mark scene NPC name as known |
| `discoverLocation(loc, text?, colour?)` | Reveal a hidden location |
| `saveOutfit(name)` / `wearOutfit(name, {delete?})` | Save/restore outfits |
| `changeOutfit(items)` | Strip all and wear items |
| `recordTime(timer)` | Store time for cooldowns |
| `addQuest(id, args?)` / `completeQuest(id)` | Quest lifecycle |
| `addEffect(id, args?)` | Add effect card |
| `eatFood(quantity)` | Feed the player |
| `lessonTime(minutes, ...content)` | Conditional lesson segment (see [LESSONS.md](./LESSONS.md)) |

### Predicates

| Builder | Description |
|---------|-------------|
| `hasItem(item, count?)` | Check inventory |
| `hasStat(stat, min?, max?)` | Check stat range |
| `inLocation(location)` | Check current location |
| `inScene()` | Check if scene has options |
| `npcStat(stat, opts?)` | Check NPC stat (`npc`, `min`, `max`) |
| `hasReputation(rep, opts?)` | Check faction reputation |
| `hasCard(id)` / `cardCompleted(id)` | Check cards |
| `locationDiscovered(loc)` | Check discovery |
| `hourBetween(from, to)` | Time of day (supports wrap-around) |
| `timeElapsed(timer, minutes)` | Check cooldown |
| `debug()` | True in debug mode |
| `not(p)` / `and(...ps)` / `or(...ps)` | Logic combinators |

### Generic Builder

```typescript
run(scriptName, params)  // Call any registered script
```

## Scene Composition Patterns

### Multi-page Sequences

```typescript
scenes(
  scene(hideNpcImage(), 'You set off together.', move('market', 15)),
  scene(showNpcImage(), say('Here we are.'), npcLeaveOption()),
)
```

Each page runs, then a Continue button auto-appears if more pages follow. Pages that add their own options (e.g. `npcLeaveOption`) suppress the Continue button.

### option() vs branch()

- **`option()`** -- fire-and-forget. Runs a script, no return.
- **`branch()`** -- inline detour. Content plays, then the outer `scenes()` resumes.

### Branching with Shared Epilogue

```typescript
choice(
  branch('Kiss him', 'You kiss.'),
  branch('Not tonight', 'You decline.'),
  endDate(),  // runs after whichever branch is chosen
)
```

### Conditional Branches

```typescript
choice(
  gatedBranch(npcStat('affection', {min: 35}), 'Hidden garden', gardenPath()),
  branch('Walk to the pier', pierPath()),
  endDate(),
)
```

### Repeatable Menus

`menu()` loops -- the player returns after each non-exit choice. `when()` conditions re-evaluate each display:

```typescript
menu(
  branch('Talk', random('He tells you...', 'You discuss...')),
  when(hasStat('Flirtation', 1), branch('Flirt', flirtContent)),
  exit('Leave', 'You say goodnight.'),
)
```

### Helper Functions for Paths

Extract reusable paths as functions. Complete paths return `Instruction`; shared fragments return `Instruction[]` for spreading:

```typescript
function pierPath(): Instruction {
  return scenes(
    scene(hideNpcImage(), 'You walk to the pier.', move('pier', 10)),
    scene(showNpcImage(), say('Beautiful view.')),
    ...walkHome(),
  )
}

function walkHome(): Instruction[] {
  return [
    scene(hideNpcImage(), 'He walks you home.', move('backstreets', 20)),
    scene(showNpcImage(), say('Lovely evening.'), endDate()),
  ]
}
```

## Imperative Scripts

Use imperative scripts when the DSL can't express the logic -- calculations, loops, complex state checks, subsystem logic.

### Registration

```typescript
makeScript('myScript', (game, params) => {
  game.add('Hello!')
  game.addOption('next', {}, 'Continue')
})

makeScripts({
  scriptA: (game) => { ... },
  scriptB: (game) => { ... },
})
```

### Mixing DSL into Imperative

Call DSL instructions from imperative code with `game.run()`:

```typescript
flirt: (game: Game) => {
  const npc = game.getNPC('barkeeper')
  if (npc.affection >= 30) {
    game.run(addNpcStat('affection', 2, { max: 40 }))
    game.run(seq('You catch his eye.', say('You again.')))
  }
}
```

### script() Wrapper

Convert DSL to a `ScriptFn` for use in imperative contexts:

```typescript
scripts: {
  myScript: script(timeLapse(10), random('Flavour A.', 'Flavour B.')),
}
```

### Return Values

Scripts can return values. Predicates return booleans:

```typescript
const rich = game.run(hasItem('crown', 100))  // true or false
```

## Wait System

The `wait` script advances time in 10-minute chunks. Each chunk fires event hooks that can interrupt by creating a scene:

1. `timeLapse(chunk)` -- advance time, fire card `onTime`, move NPCs
2. NPC `onWait` hooks -- for each NPC present at the location
3. Location `onWait` hook
4. If any hook created a scene (`game.inScene`), stop

### Example

```typescript
onWait: (game: Game) => {
  if (Math.random() > 0.2) return  // 20% chance per chunk
  game.add('A street urchin tugs at your sleeve.')
  game.addOption('talkToUrchin', {}, 'Talk to them')
}
```

NPC hooks fire before location hooks. A 30-minute wait = 3 chunks = 3 chances for events.

## Core Scripts

Common scripts already defined in `Scripts.ts`:

| Script | Params | Description |
|--------|--------|-------------|
| `gainItem` | `{item, number}` | Add items |
| `loseItem` | `{item, number}` | Remove items |
| `move` | `{location, minutes?}` | Teleport |
| `go` | `{location, minutes?}` | Travel with hooks |
| `timeLapse` | `{minutes}` or `{untilTime}` | Advance time |
| `addStat` | `{stat, change, max?, min?, chance?, hidden?}` | Modify stat |
| `addNpcStat` | `{npc?, stat, change, max?, min?, hidden?}` | Modify NPC stat |
| `addReputation` | `{reputation, change, max?, min?, chance?, hidden?}` | Modify reputation |
| `saveOutfit` | `{name}` | Save outfit |
| `wearOutfit` | `{name, delete?}` | Restore outfit |
| `changeOutfit` | `{items, force?}` | Strip and wear |
| `menu` | `{entries}` | Repeatable choice loop |

## Option Resolution

The `option()` builder supports namespace prefixes:

- `option('Chat', 'npc:onChat')` -- NPC script
- `option('Leave', 'global:endScene')` -- global script
- `option('Chat', 'onChat')` -- auto-resolves: NPC scripts first, then global

## File Organisation

| File | Purpose |
|------|---------|
| `model/Scripts.ts` | Core script registry, generic scripts |
| `model/ScriptDSL.ts` | DSL builder functions |
| `story/Utility.ts` | Story-specific utility scripts |
| `story/[Area].ts` | Area-specific content and scripts |

Scripts belong in `Scripts.ts` unless they contain story-specific content. Subsystem logic (e.g. lesson scripts) lives in the relevant story module.
