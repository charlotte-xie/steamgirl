# Scripting System

This document describes the SteamGirl scripting system: how scripts work, the declarative DSL, and how to author game content.

## Overview

SteamGirl uses a two-layer scripting system:

1. **Imperative Scripts** - TypeScript functions `(game: Game, params: {}) => any` that directly manipulate game state
2. **Declarative DSL** - JSON-serializable instructions that compile to script calls

Both layers coexist. The DSL compiles down to imperative script calls, so authors can use whichever approach fits their needs.

## Design Principles

### Why Two Layers?

The dual-layer design serves different needs:

| Need | Solution |
|------|----------|
| Complex game logic (calculations, state machines) | Imperative scripts |
| Narrative content (dialogue, branching scenes) | Declarative DSL |
| Save/load game state | DSL (JSON-serializable) |
| Hot-reloading content | DSL (data, not code) |
| Type safety for builders | DSL builder functions |

### JSON Serialization is Critical

**The entire game state must be JSON-serializable.** This enables:
- Saving/loading games to localStorage
- Restoring exact game position (including available options)
- Future features: cloud saves, sharing, replays

This means:
- **NO functions in Instructions** - only `[scriptName, params]` tuples
- **NO class instances** - only plain objects
- **NO circular references** - flat data structures

### Instructions are Data, Not Code

An `Instruction` is simply data describing what to do:

```typescript
type Instruction = [string, Record<string, unknown>]

// Example: ['text', { parts: ['Hello world'] }]
// Meaning: "Call the 'text' script with these params"
```

The DSL builders are just convenience functions that construct these tuples:

```typescript
text('Hello')  // Returns: ['text', { parts: ['Hello'] }]
```

### ScriptRef: Flexible Script References

`game.run()` accepts any script form:

```typescript
type Script = ScriptFn | Instruction | string

// All equivalent:
game.run('gainItem', { item: 'crown', number: 5 })
game.run(['gainItem', { item: 'crown', number: 5 }])
game.run(addItem('crown', 5))
```

### Predicates Return Values

Some scripts return values (typically booleans). These are used for conditions:

```typescript
// hasItem returns boolean
const rich = game.run(hasItem('crown', 100))  // true or false

// Control flow uses predicates internally
when(hasItem('crown'), 'You have money!')
// The 'when' script calls exec() on the condition to get true/false
```

### Scene State

A "scene" is when the player has options to choose from. Key patterns:

```typescript
// Check if in a scene (has options)
if (game.inScene) { ... }

// Many scripts should not run if already in a scene
// (e.g., auto-generated location descriptions)

// Options are stored as Instructions for JSON serialization
game.addOption('scriptName', { params }, 'Button Label')
// Internally: { script: ['scriptName', { params }], label: 'Button Label' }
```

## Wait System and Event Hooks

The `wait` script advances time in 10-minute chunks. After each chunk, it fires event hooks that can interrupt the wait by creating a scene.

### Wait Execution Order

For each 10-minute chunk:

1. **`timeLapse(chunk)`** — advance time, fire card `onTime` callbacks, move NPCs if hour changed
2. **NPC `onWait` hooks** — for each NPC present at the location, call `onWait` with `{ npc, minutes }`. If any creates a scene, stop.
3. **Location `onWait` hook** — call the location's `onWait` with `{ minutes }`. If it creates a scene, stop.
4. If no scene was created, repeat for the next chunk.

After all chunks complete (or if a scene was created), the optional `then` script runs only if no scene exists.

### NPCDefinition.onWait

Called when the player waits at a location where this NPC is present. Receives `{ npc: string, minutes: number }`. Can create a scene to interrupt the wait.

```typescript
registerNPC({
  // ...
  onWait: (game: Game) => {
    const npc = game.getNPC('tour-guide')
    if (npc.nameKnown === 0) {
      game.run('approach', { npc: 'tour-guide' })
    }
  },
})
```

### LocationDefinition.onWait

Called when the player waits at this location. Receives `{ minutes: number }`. Fires after all NPC hooks (if none created a scene).

```typescript
registerLocation('market', {
  // ...
  onWait: (game: Game, params: { minutes?: number }) => {
    const chance = Math.min(0.5, (params.minutes ?? 10) / 60)
    if (Math.random() > chance) return
    game.add('A street urchin tugs at your sleeve.')
    game.addOption('talkToUrchin', {}, 'Talk to them')
  },
})
```

### Design Notes

- **NPC hooks fire before location hooks** — character interactions take priority over ambient events
- **10-minute chunks** — longer waits get multiple chances for events. A 30-minute wait = 3 rolls.
- **Guard with `game.inScene`** — the wait loop checks `inScene` after each hook and returns immediately if a scene was created
- **One-shot events** — use NPC/card state to prevent repeats (e.g. check `nameKnown` before approaching)

## Imperative Scripts

Scripts are registered globally using `makeScript` or `makeScripts`:

```typescript
import { makeScript, makeScripts } from './Scripts'

// Single script
makeScript('greetPlayer', (game, params) => {
  game.add('Welcome to the tavern!')
  game.addOption('orderDrink', {}, 'Order a drink')
  game.addOption('leave', {}, 'Leave')
})

// Multiple scripts
makeScripts({
  'orderDrink': (game, { price = 2 }) => {
    game.add('You order a drink.')
    game.run('loseItem', { item: 'crown', number: price })
  },
  'leave': (game) => {
    game.add('You leave the tavern.')
    game.run('move', { location: 'city' })
  }
})
```

### Script Return Values

Scripts can return values. This is essential for predicates:

```typescript
makeScript('checkGold', (game, { min }) => {
  const gold = game.player.inventory.find(i => i.id === 'crown')?.number ?? 0
  return gold >= min  // Returns boolean
})
```

### Existing Utility Scripts

Common scripts are already defined in `Scripts.ts`:

| Script | Params | Description |
|--------|--------|-------------|
| `gainItem` | `{ item, number }` | Add items to inventory |
| `loseItem` | `{ item, number }` | Remove items from inventory |
| `move` | `{ location, minutes? }` | Move player to location (optionally advance time) |
| `go` | `{ location, minutes? }` | Travel with link checks, time, and arrival hooks |
| `timeLapse` | `{ minutes }` or `{ untilTime }` | Advance game time |
| `addStat` | `{ stat, change, max?, min?, chance?, hidden? }` | Modify a player stat |
| `addNpcStat` | `{ npc?, stat, change, max?, min?, hidden? }` | Modify an NPC stat |
| `addReputation` | `{ reputation, change, max?, min?, chance?, hidden? }` | Modify a faction reputation score (0--100) |
| `setNpcLocation` | `{ npc?, location }` | Move an NPC to a location |
| `discoverLocation` | `{ location, text?, colour? }` | Reveal a hidden location |

## Declarative DSL

The DSL provides a clean syntax for authoring scripts that:
- Produces JSON-serializable data
- Can be stored, transmitted, or hot-reloaded
- Compiles to `[scriptName, params]` tuples

### Core Concept: Instructions and Scene Elements

An **Instruction** is a tuple: `[scriptName, params]`

```typescript
type Instruction = [string, Record<string, unknown>]
```

A **SceneElement** is either an Instruction or a plain string. Strings are auto-wrapped in `text()`:

```typescript
type SceneElement = Instruction | string

// These are equivalent:
seq(text('Hello world'), say('Welcome!'))
seq('Hello world', say('Welcome!'))  // String auto-wrapped
```

This auto-wrapping works in `seq()`, `scene()`, `scenes()`, `when()`, `unless()`, `random()`, `branch()`, and `skillCheck()` callbacks — anywhere that accepts `SceneElement`.

### DSL Builders Reference

#### Content

| Builder | Description |
|---------|-------------|
| `text(...parts)` | Plain text paragraph. Parts can be strings or Instructions (like `playerName()`, `npcName()`) |
| `say(...parts)` | NPC speech in the scene NPC's colour. Same part types as `text()` |
| `paragraph(...content)` | Formatted paragraph with optional `hl()` highlights |
| `hl(text, color, hover?)` | Highlight helper for use inside `paragraph()` (not an instruction) |
| `playerName()` | Inline player name (for use as a part inside `text()` or `say()`) |
| `npcName(npc?)` | Inline NPC name with speech colour (uses scene NPC if omitted) |
| `option(label, script?, params?)` | Fire-and-forget button — runs a script, no automatic return. For menus, navigation, "Leave" |
| `npcLeaveOption(text?, reply?, label?)` | Standard NPC conversation exit |
| `npcInteract(script, params?)` | Run a named script on the scene NPC |

#### Control Flow

| Builder | Description |
|---------|-------------|
| `seq(...elements)` | Execute in sequence. Strings become `text()` |
| `when(cond, ...then)` | Conditional (if true). Then elements can be strings |
| `unless(cond, ...then)` | Conditional (if false) |
| `cond(c1, e1, c2, e2, ..., default?)` | Multi-branch conditional (Lisp-style) |
| `random(...children)` | Pick one random child. Supports `when()` conditional entries; falsy entries ignored |
| `skillCheck(skill, diff?, onSuccess?, onFailure?)` | Skill test. Callbacks are single elements (use `seq()` to group) |

#### Scene Composition

| Builder | Description |
|---------|-------------|
| `scenes(...pages)` | Multi-page sequence with auto Continue buttons |
| `scene(...elements)` | Group elements into a single scene page (compiles to `seq()`) |
| `branch(label, ...elements)` | Story choice with auto-resume. Use `scenes()` as an element for multi-page branches |
| `choice(...branches, ...epilogue)` | Branches with shared ending instructions |
| `gatedBranch(cond, label, ...elements)` | Branch that only appears when condition is met |

#### Game Actions

| Builder | Description |
|---------|-------------|
| `move(location, minutes?)` | Instant teleport (optionally advance time after) |
| `go(location, minutes?)` | Travel with link checks, time, and arrival hooks |
| `timeLapse(minutes)` | Advance time |
| `timeLapseUntil(hourOfDay)` | Advance to specific hour (e.g. `10.25` for 10:15am) |
| `addItem(item, count?)` | Add to inventory |
| `removeItem(item, count?)` | Remove from inventory |
| `addStat(stat, change, options?)` | Modify player stat (options: `max`, `min`, `chance`, `hidden`) |
| `addNpcStat(stat, change, options?)` | Modify NPC stat (options: `npc`, `max`, `min`, `hidden`). Uses scene NPC if `npc` omitted |
| `addReputation(reputation, change, options?)` | Modify faction reputation (options: `max`, `min`, `chance`, `hidden`). Clamped 0--100 |
| `moveNpc(npc, location)` | Move an NPC (pass `null` to clear location) |
| `setNpc(npcId)` | Set scene NPC for speech colour |
| `hideNpcImage()` | Hide NPC portrait (e.g. during travel) |
| `showNpcImage()` | Show NPC portrait |
| `learnNpcName()` | Mark scene NPC's name as known |
| `discoverLocation(location, text?, colour?)` | Reveal a hidden location |
| `recordTime(timer)` | Store current time for cooldowns |
| `addQuest(id, args?)` | Add quest card |
| `completeQuest(id)` | Complete quest |
| `addEffect(id, args?)` | Add effect card |
| `eatFood(quantity)` | Set lastEat timer and reduce hunger |

#### Predicates

Predicates are instructions that return boolean values:

| Builder | Description |
|---------|-------------|
| `hasItem(item, count?)` | Check inventory |
| `hasStat(stat, min?, max?)` | Check player stat range |
| `inLocation(location)` | Check current location |
| `inScene()` | Check if scene has options |
| `npcStat(stat, options?)` | Check NPC stat (options: `npc`, `min`, `max`). Defaults to scene NPC, stat > 0 |
| `hasReputation(reputation, options?)` | Check faction reputation (options: `min`, `max`). Defaults to rep > 0 |
| `hasCard(cardId)` | Check if player has card |
| `cardCompleted(cardId)` | Check if card is completed |
| `locationDiscovered(location)` | Check if location is discovered |
| `hourBetween(from, to)` | Check time of day (supports wrap-around, e.g. `22, 6` for night) |
| `timeElapsed(timer, minutes)` | Check cooldown |
| `debug()` | True when debug mode is enabled |
| `not(pred)` | Negate predicate |
| `and(...preds)` | All must be true |
| `or(...preds)` | Any must be true |

#### Generic Builder

```typescript
run(scriptName, params)  // [scriptName, params]
```

Use `run()` to call any registered script.

#### script() Helper

Converts DSL instructions into a `ScriptFn` for use in imperative contexts:

```typescript
import { script } from './ScriptDSL'

// Use in NPC scripts, activity scripts, or makeScripts
scripts: {
  myScript: script(timeLapse(10), random('Flavour A.', 'Flavour B.')),
}
```

### Example: NPC Scripts with DSL

The `scripts` record on an NPC definition can mix pure DSL and imperative functions freely. DSL instructions are ideal for narrative sequences; imperative functions are better for complex logic:

```typescript
registerNPC({
  name: 'Rob Hayes',
  // ...

  scripts: {
    // Pure DSL — a multi-scene tour (see Scene Composition below)
    tour: scenes(
      scene(
        hideNpcImage(),
        'You set off together.',
        move('default'), timeLapse(15),
        say('Here we are — the heart of Aetheria.'),
      ),
      scene(
        discoverLocation('school'),
        move('school'), timeLapse(15),
        say('The University — you\'ll study here.'),
      ),
      scene(
        showNpcImage(),
        say('I hope that helps!'),
        addNpcStat('affection', 1, { hidden: true }),
        npcLeaveOption('You thank Rob and he leaves.'),
      ),
    ),

    // Pure DSL — a simple interaction with random flavour and options
    roomChat: seq(
      random(
        say('Have you seen the bathroom? Claw-footed tub!'),
        say('The view from up here — magnificent.'),
        say('My flat has a window that looks onto a brick wall.'),
      ),
      option('Chat', 'roomChat'),
      when(hasStat('Flirtation', 1),
        option('Flirt', 'flirt'),
      ),
      option('Depart Room', 'leaveRoom'),
      npcLeaveOption(),
    ),

    // Imperative — complex branching logic with skill checks
    flirt: (game: Game) => {
      const npc = game.getNPC('tour-guide')
      if (npc.affection >= 30) {
        if (game.player.skillTest('Charm', 12)) {
          game.run(addNpcStat('affection', 2, { max: 40, hidden: true }))
          game.run(seq(
            'You say something quiet and sincere.',
            say('You\'re special, you know that?'),
          ))
        } else {
          game.run(addNpcStat('affection', -3, { min: 20 }))
          game.run(seq(
            'You lean in close.',
            say('Could we maybe slow down a bit?'),
          ))
        }
      } else {
        game.run(addNpcStat('affection', 3, { max: 30 }))
        game.run(seq(
          'You lean closer and compliment his knowledge.',
          say('Oh! Well, I — thank you.'),
          'His ears go pink.',
        ))
      }
      // ... re-show options
    },
  },
})
```

### Execution

To execute DSL instructions inside imperative code, use `game.run()`:

```typescript
// Execute single instruction
const hasGold = game.run(hasItem('crown', 10))  // boolean

// Execute a sequence
game.run(seq(
  'Hello world.',
  when(hasItem('crown'), 'You are rich!'),
))
```

### JSON Serialization

Instructions are fully JSON-serializable:

```typescript
const script: Instruction[] = [
  text('Hello'),
  when(hasItem('gold'), say('Rich!'))
]

const json = JSON.stringify(script)
const loaded = JSON.parse(json)
game.run(seq(...loaded))
```

## Control Flow Details

### when / unless

`when(condition, ...thenElements)` executes the elements only if the condition is truthy. Elements can be plain strings:

```typescript
when(hasItem('key'),
  'You unlock the door.',
  move('secretRoom')
)

unless(hasItem('key'),
  'The door is locked.'
)
```

### cond (Multi-branch)

`cond` works like Lisp's cond — pairs of (condition, expression), with an optional default:

```typescript
// If/else (3 args)
cond(hasItem('crown'), text('Rich!'), text('Poor!'))

// Multiple branches with default
cond(
  hasItem('crown', 100), text('Wealthy!'),
  hasItem('crown', 10), text('Comfortable'),
  hasItem('crown'), text('Getting by'),
  text('Broke')  // default (odd argument at end)
)
```

Often combined with `seq()` for multi-instruction branches:

```typescript
cond(
  npcStat('affection', { min: 15 }),
  seq(
    say('I never get tired of this view. But it\'s nicer with company.'),
    'He glances at you with a warm smile.',
  ),
  say('Magnificent, isn\'t it?'),
)
```

### seq (Sequence)

`seq` wraps multiple elements into a single instruction. Plain strings become `text()`:

```typescript
seq(
  'You enter the room.',   // Auto-wrapped to text('You enter the room.')
  say('Welcome!'),
  option('Continue', 'nextScene'),
)
```

### random

`random` picks one entry at random and executes it. Strings become `text()`. Falsy entries are silently ignored (supports `&&` patterns).

```typescript
// Random NPC speech
random(
  say('I could get used to this.'),
  say('Have you seen the bathroom? Claw-footed tub!'),
  say('The view from up here — magnificent.'),
)

// Random flavour text
random(
  'A brass-plated automaton whirs past.',
  'Steam hisses from a nearby pipe.',
  'A clockwork bird chirps on a lamppost.',
)
```

**Conditional entries** — use `when()` inside `random()` to gate entries on conditions. Only entries whose conditions pass join the eligible pool:

```typescript
random(
  when(hasReputation('gangster', { min: 40 }),
    'A woman crosses the street to avoid you.',
  ),
  when(hasReputation('socialite', { min: 30 }),
    'A woman in furs gives you a knowing nod.',
  ),
  npc.affection > 10 && say('He smiles warmly.'),
  'The street is quiet.',
  'Nothing catches your eye.',
)
```

If no conditions pass and no defaults exist, nothing happens.

### skillCheck

`skillCheck` performs a skill test. It can be used in two modes:

**Predicate mode** (no callbacks): Returns boolean, useful in conditions:
```typescript
when(skillCheck('Perception', 10),
  'You notice something hidden.'
)
```

**Callback mode**: Executes different instructions based on success/failure. Use `seq()` to group multiple elements:
```typescript
skillCheck('Charm', 12,
  seq(
    'You find the right words. He beams.',
    say('You mean that? That means a lot.'),
    addNpcStat('affection', 3, { max: 50 }),
  ),
  seq(
    'You try to find the right words, but the beauty of the place has left you lost for speech.',
    say('It\'s a lot to take in, isn\'t it?'),
  ),
)
```

## Scene Composition

The scene system enables multi-page narrative sequences with automatic navigation. This is the primary way to author extended content like tours, dates, and story events.

### scenes() — Multi-Page Sequences

`scenes()` chains multiple pages with automatic Continue buttons between them:

```typescript
scripts: {
  tour: scenes(
    scene(
      hideNpcImage(),
      'You set off with Rob.',
      move('default'), timeLapse(15),
      say('The heart of Aetheria. Magnificent, isn\'t it?'),
    ),
    scene(
      discoverLocation('school'),
      move('school'), timeLapse(15),
      say('The University — you\'ll study here.'),
    ),
    scene(
      showNpcImage(),
      say('I hope that helps!'),
      npcLeaveOption('You thank Rob and he leaves.'),
    ),
  ),
}
```

Each page runs its instructions, then a Continue button is added if more pages follow. If a page adds its own options (like `npcLeaveOption`), no Continue button is added.

### scene() — Grouping Elements into Pages

`scene()` groups multiple elements into a single page. It compiles to `seq()` — the name is purely for readability when scanning long sequences:

```typescript
// scene() is just a readable alias for seq()
scene(move('lake', 15), 'Rob offers his arm...')
// Equivalent to:
seq(move('lake', 15), text('Rob offers his arm...'))
```

Without `scene()`, pages would be anonymous instructions — harder to navigate in long sequences.

### option() vs branch()

Both create clickable buttons, but they differ in **continuation**:

- **`option()`** — fire-and-forget. Runs a named script and the current scene is gone. No automatic return. Use for menu items, NPC interactions, "Buy a drink", "Leave".
- **`branch()`** — inline detour. Pushes content onto the scene stack, so the outer `scenes()` sequence resumes automatically once the branch finishes. Use for story choices within narrative sequences (dates, tours, events).

```typescript
// option(): clicking "Buy a drink" runs buyDrink — you don't come back here
option('Buy a drink', 'buyDrink')

// branch(): clicking "Lean against him" plays the content, then Scene 3 continues
scenes(
  scene(say('Choose.'),
    branch('Lean against him', 'You lean in.'),
    branch('Stay put', 'You keep your distance.'),
  ),
  scene(say('It was a lovely evening.')),  // ← resumes here either way
)
```

Under the hood, `branch()` constructs an `option()` targeting `advanceScene` with a `push` parameter — the scene stack does the wiring.

### branch() — Player Choices Within Scenes

Use `branch()` inside a scene page to offer player choices. When the player picks a branch, the content plays, then the outer `scenes()` sequence resumes:

```typescript
scenes(
  // Scene 1: setup
  scene(
    say('I\'m glad you came tonight.'),
    'He moves a little closer on the bench.',
  ),
  // Scene 2: player choice
  scene(
    say('It\'s nicer with company.'),
    branch('Lean against him',
      'You lean into his shoulder. He relaxes.',
      addNpcStat('affection', 3, { max: 45 }),
      say('This is... really nice.'),
    ),
    branch('Stay where you are',
      'You keep a comfortable distance.',
      say('It\'s peaceful here, isn\'t it?'),
    ),
  ),
  // Scene 3: continues after whichever branch was picked
  scene(
    'You sit together in the quiet.',
    say('I had a lovely time tonight.'),
  ),
)
```

For **multi-page branches**, wrap the content in `scenes()`:

```typescript
branch('Go to the hidden garden', scenes(
  scene(
    hideNpcImage(),
    'Rob leads you along a narrow path.',
    move('lake', 10),
  ),
  scene(
    showNpcImage(),
    'You step into a hidden garden.',
    say('I\'ve never shown anyone before.'),
    addNpcStat('affection', 3, { max: 50 }),
  ),
))
```

### choice() — Branches with Shared Epilogue

When multiple branches share ending instructions, `choice()` avoids duplication:

```typescript
// Without choice(): endDate() duplicated in every branch
branch('Kiss him', 'You kiss.', endDate()),
branch('Not tonight', 'You decline.', endDate()),

// With choice(): endDate() written once
choice(
  branch('Kiss him', 'You kiss.'),
  branch('Not tonight', 'You decline.'),
  endDate(),  // shared — runs at the end of whichever branch is chosen
)
```

Non-branch elements form the shared epilogue, merged into the **last page** of each branch (no extra Continue click). Convention: list branches first, then epilogue.

### gatedBranch() — Conditional Branches

`gatedBranch()` shows an option only when a condition is met. If the condition is false at runtime, the option doesn't appear:

```typescript
scene(
  say('Shall we walk a bit further?'),
  cond(
    npcStat('affection', { min: 35 }),
    seq(
      'He hesitates, then lowers his voice.',
      say('There\'s a place I\'ve never shown anyone...'),
      branch('Go to the hidden garden', robGardenPath()),
      branch('Stick to the pier', robPierPath()),
    ),
    seq(
      say('The pier\'s lovely at night. Come on.'),
      branch('Walk to the pier', robPierPath()),
    ),
  ),
)
```

`gatedBranch()` works inside `choice()` too — the shared epilogue is threaded through correctly:

```typescript
choice(
  gatedBranch(npcStat('affection', { min: 35 }),
    'Go to the hidden garden', gardenPath()),
  branch('Walk to the pier', pierPath()),
  endDate(),
)
```

### Helper Functions for Branching Paths

For complex branching (like date scenes with multiple routes), extract paths into functions. Complete paths return `Instruction` (a `scenes()` call); shared fragments return `Instruction[]` for spreading:

```typescript
/** Pier path — complete route returning scenes(). */
function robPierPath(): Instruction {
  return scenes(
    scene(
      hideNpcImage(),
      'You follow the lakeside path.',
      move('pier', 10),
    ),
    scene(
      showNpcImage(),
      say('I brought you something.'),
      'He produces a small brass compass.',
    ),
    scene(
      'You sit on the edge of the pier.',
      branch('Take his hand',
        'You lace your fingers through his.',
        addNpcStat('affection', 5, { max: 50 }),
      ),
      branch('Enjoy the view',
        'You gaze up at the stars together.',
      ),
    ),
    // Shared walk-home fragment spread into this scenes()
    ...robWalkHome(),
  )
}

/** Shared fragment — returns Instruction[] for spreading. */
function robWalkHome(): Instruction[] {
  return [
    scene(hideNpcImage(), 'Rob walks you home.', move('backstreets', 20)),
    scene(showNpcImage(), say('I had a lovely time tonight.'), endDate()),
  ]
}
```

Complete paths can be passed directly to `branch()`:

```typescript
dateScene: scenes(
  scene(/* opening */),
  scene(/* choice */
    branch('Go to the garden', robGardenPath()),
    branch('Walk to the pier', robPierPath()),
  ),
),
```

### Quick Reference

| Helper | Returns | Purpose |
|--------|---------|---------|
| `scenes(...pages)` | `Instruction` | Multi-page sequence with Continue buttons |
| `scene(...elements)` | `Instruction` | Group elements into a single page (alias for `seq`) |
| `branch(label, ...elements)` | `Instruction` | Story choice with auto-resume (use `scenes()` for multi-page) |
| `choice(...branches, ...epilogue)` | `Instruction` | Branches with shared ending |
| `gatedBranch(cond, label, ...elements)` | `Instruction` | Conditional branch |
| `seq(...elements)` | `Instruction` | Run elements immediately (no pause) |

## Mixing DSL with Imperative

The DSL coexists with imperative scripts. You can:

1. Call imperative scripts from DSL using `run()`:
   ```typescript
   run('myCustomScript', { arg1: 'value' })
   ```

2. Use DSL instructions inside imperative scripts via `game.run()`:
   ```typescript
   scripts: {
     flirt: (game: Game) => {
       const npc = game.getNPC('tour-guide')
       if (npc.affection >= 30) {
         game.run(addNpcStat('affection', 2, { max: 40 }))
         game.run(seq(
           'You say something quiet and sincere.',
           say('You\'re special, you know that?'),
         ))
       } else {
         game.run(addNpcStat('affection', 3, { max: 30 }))
         game.run(seq(
           'You lean closer and compliment his knowledge.',
           say('Oh! Well, I — thank you.'),
         ))
       }
     },
   }
   ```

3. Convert DSL to a `ScriptFn` with `script()`:
   ```typescript
   import { script } from './ScriptDSL'

   // Use anywhere a ScriptFn is expected
   makeScripts({
     myImperativeScript: (g) => { g.add('Hello') },
     myDslScript: script('Welcome.', option('Start')),
   })
   ```

4. Register DSL arrays as named scripts:
   ```typescript
   registerDslScript('enterTavern', [
     'You push open the heavy oak door.',
     say('Welcome, traveller!'),
     option('Buy a drink', 'buyDrink'),
     npcLeaveOption('You nod and head out.', 'Safe travels!'),
   ])
   ```

## Architecture Notes

### Script Registry

All scripts are registered in a global registry (`model/Scripts.ts`). Scripts can call other scripts via `game.run(scriptName, params)`.

### File Organization

- **`model/Scripts.ts`** - Core script registry and all generic scripts (game actions, control flow, predicates, content)
- **`model/ScriptDSL.ts`** - DSL builder functions that construct instruction tuples
- **`story/Utility.ts`** - Story-specific scripts containing game world content (e.g., flavour text)

Scripts belong in `Scripts.ts` unless they contain story-specific content like hardcoded narrative text or world-specific logic.

### Option Script Resolution

The `option()` builder supports namespace prefixes for explicit resolution:

- `option('Chat', 'npc:onChat')` — explicitly calls the NPC's `onChat` script
- `option('Leave', 'global:endScene')` — explicitly calls the global `endScene` script
- `option('Chat', 'onChat')` — auto-resolves: checks the scene NPC's scripts first, falls back to global

If the script name is omitted, it's derived from the label: `option('Buy Drink')` becomes script `'buydrink'`.

### Return Values

Scripts can return values. The DSL leverages this for predicates:
- `game.run(hasItem('crown'))` returns `true` or `false`
- Control flow scripts like `when` use `exec()` internally to evaluate conditions

### Type Safety

The `Instruction` type is `[string, Record<string, unknown>]`. While this allows any script name, the builder functions provide type-safe construction:

```typescript
// Type-safe via builders
hasItem('crown', 10)  // Always correct

// Manual construction (less safe)
const instr: Instruction = ['hasItem', { item: 'crown', count: 10 }]
```

## Best Practices

1. **Use DSL for narrative content** — scenes, dialogue, branching
2. **Use imperative for complex logic** — calculations, state-dependent branching, loops
3. **Use `scene()` to structure pages** — makes long sequences readable
4. **Use plain strings** — `'You enter the room.'` is cleaner than `text('You enter the room.')`
5. **Extract branching paths into functions** — return `Instruction[]` for reuse
6. **Keep instructions JSON-clean** — no functions, classes, or circular references

## When to Use Which Approach

### Use Declarative DSL When:

- Writing dialogue scenes or narrative content
- Creating branching storylines with conditions
- Building multi-page sequences (tours, dates, story events)
- The logic is primarily "if X then show Y"

```typescript
// Good DSL usage: multi-scene tour with conditional dialogue
tour: scenes(
  scene(
    hideNpcImage(),
    'You set off together.',
    move('default'), timeLapse(15),
    cond(
      npcStat('affection', { min: 15 }),
      say('I never get tired of this view. But it\'s nicer with company.'),
      say('Magnificent, isn\'t it?'),
    ),
  ),
  scene(
    discoverLocation('hotel'),
    move('hotel'), timeLapse(5),
    say('The Imperial Hotel. Very grand, very expensive.'),
  ),
  scene(
    showNpcImage(),
    say('I hope that helps!'),
    addNpcStat('affection', 1, { hidden: true }),
    npcLeaveOption('You thank Rob and he leaves.'),
  ),
),
```

### Use Imperative Scripts When:

- Complex calculations or game mechanics
- Dynamic content generation with loops or random selection from arrays
- Skill checks with complex consequences (affection changes, multiple random outcomes)
- State machine logic

```typescript
// Good imperative usage: complex flirt logic with skill checks and random pools
flirt: (game: Game) => {
  const npc = game.getNPC('tour-guide')
  if (npc.affection >= 30) {
    if (game.player.skillTest('Charm', 12)) {
      game.run(addNpcStat('affection', 2, { max: 40, hidden: true }))
      const scenes = [
        ['You say something sincere.', say('You\'re special, you know that?')],
        ['You let the silence stretch.', say('I like this. Just being with you.')],
      ]
      game.run(seq(...scenes[Math.floor(Math.random() * scenes.length)]))
    } else {
      game.run(addNpcStat('affection', -3, { min: 20 }))
      game.run(seq(
        'You lean in close.',
        say('Could we maybe slow down a bit?'),
      ))
    }
  }
},
```

## Common Patterns

### Gated Content

```typescript
// Only show option if player meets requirements
when(and(hasItem('key'), hasStat('Perception', 20)),
  option('Examine the strange wall', 'secretDoor'),
)
```

### Progressive Dialogue

```typescript
// Different dialogue based on relationship
cond(
  npcStat('affection', { min: 15 }),
  seq(
    say('I never get tired of this view. But it\'s nicer with company.'),
    'He glances at you with a warm, slightly nervous smile.',
  ),
  say('Magnificent, isn\'t it?'),
)
```

### Random Variety

```typescript
// Random NPC comments
random(
  say('I could get used to this.'),
  say('Have you seen the bathroom? Claw-footed tub!'),
  say('The view from up here — magnificent.'),
  say('I wonder what the kitchens are like.'),
  say('My flat has a window that looks onto a brick wall. This is rather different.'),
)
```

### Conditional Affection Dialogue

```typescript
// Rob varies his comments on the tour based on affection level
cond(
  npcStat('affection', { min: 15 }),
  seq(
    say('The Lake. I come here when I need to think. It\'s my favourite spot.'),
    'He pauses, watching the steam curl over the water.',
    say('I don\'t usually tell people that. But — I wanted you to know.'),
  ),
  say('The Lake. A peaceful spot when the city gets too much.'),
)
```

### NPC Image Toggle During Travel

```typescript
// Hide portrait during travel montage, show when arriving
scene(
  hideNpcImage(),
  'You set off through the busy streets.',
  move('hotel', 5),
  'You push through the revolving brass doors into the lobby.',
),
scene(
  showNpcImage(),
  say('Blimey. Look at those chandeliers!'),
),
```

### Skill Checks with Rich Outcomes

```typescript
skillCheck('Charm', 10,
  seq(
    'You raise your glass steadily, holding his gaze.',
    say('You know what? You\'re alright.'),
    addNpcStat('affection', 3, { max: 18 }),
  ),
  seq(
    'Your hand trembles slightly. He notices.',
    say('Relax. If I wanted to hurt you, you wouldn\'t be sitting here.'),
  ),
)
```
