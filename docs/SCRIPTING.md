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

// Example: ['text', { text: 'Hello world' }]
// Meaning: "Call the 'text' script with these params"
```

The DSL builders are just convenience functions that construct these tuples:

```typescript
text('Hello')  // Returns: ['text', { text: 'Hello' }]
```

### ScriptRef: Flexible Script References

`game.run()` accepts either form:

```typescript
type ScriptRef = string | Instruction

// Both are equivalent:
game.run('gainItem', { item: 'crown', number: 5 })
game.run(['gainItem', { item: 'crown', number: 5 }])

// Use Instruction form with DSL builders:
game.run(addItem('crown', 5))
```

### Predicates Return Values

Some scripts return values (typically booleans). These are used for conditions:

```typescript
// hasItem returns boolean
const rich = game.run(hasItem('crown', 100))  // true or false

// Control flow uses predicates internally
when(hasItem('crown'), text('You have money!'))
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
registerNPC('tour-guide', {
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

Common scripts are already defined in `Utility.ts`:

| Script | Params | Description |
|--------|--------|-------------|
| `gainItem` | `{ item, number }` | Add items to inventory |
| `loseItem` | `{ item, number }` | Remove items from inventory |
| `move` | `{ location }` | Move player to location |
| `timeLapse` | `{ minutes }` | Advance game time |
| `addStat` | `{ stat, change }` | Modify a player stat |

## Declarative DSL

The DSL provides a clean syntax for authoring scripts that:
- Produces JSON-serializable data
- Can be stored, transmitted, or hot-reloaded
- Compiles to `[scriptName, params]` tuples

### Core Concept: Instructions

An **Instruction** is simply a tuple: `[scriptName, params]`

```typescript
type Instruction = [string, Record<string, unknown>]
```

DSL builder functions construct these tuples:

```typescript
import { text, say, option } from './ScriptDSL'

text('Hello')        // ['text', { text: 'Hello' }]
say('Welcome!', 'npc')  // ['say', { text: 'Welcome!', npc: 'npc', color: undefined }]
option('next', {})   // ['option', { script: 'next', params: {}, label: undefined }]
```

### DSL Builders Reference

#### Content

| Builder | Output | Description |
|---------|--------|-------------|
| `text(t)` | `['text', { text: t }]` | Plain text paragraph |
| `say(text, npc?, color?)` | `['say', {...}]` | NPC speech (uses NPC's color if not specified) |
| `paragraph(...content)` | `['paragraph', { content }]` | Formatted paragraph with highlights |
| `hl(text, color, hover?)` | `{ text, color, hoverText }` | Highlight helper (not an instruction) |
| `option(script, params?, label?)` | `['option', {...}]` | Add an option button |
| `npcLeaveOption(text?, reply?, label?)` | `['npcLeaveOption', {...}]` | Standard NPC leave option |

#### Control Flow

| Builder | Output | Description |
|---------|--------|-------------|
| `seq(...instructions)` | `['seq', { instructions }]` | Execute sequence |
| `when(cond, ...then)` | `['when', { condition, then }]` | Conditional (if true) |
| `unless(cond, ...then)` | `['when', { condition: not(cond), then }]` | Conditional (if false) |
| `cond(c1, e1, c2, e2, ..., default)` | `['cond', { branches, default }]` | Multi-branch conditional |
| `random(...children)` | `['random', { children }]` | Execute one random child |
| `skillCheck(skill, diff?, onSuccess?, onFailure?)` | `['skillCheck', {...}]` | Skill test (predicate or callback) |

#### Game Actions

| Builder | Output | Description |
|---------|--------|-------------|
| `addItem(item, n?)` | `['gainItem', { item, number }]` | Add to inventory |
| `removeItem(item, n?)` | `['loseItem', { item, number }]` | Remove from inventory |
| `move(location)` | `['move', { location }]` | Move player |
| `timeLapse(minutes)` | `['timeLapse', { minutes }]` | Advance time |
| `addStat(stat, change)` | `['addStat', { stat, change }]` | Modify stat |
| `addQuest(id, args?)` | `['addQuest', {...}]` | Add quest card |
| `completeQuest(id)` | `['completeQuest', {...}]` | Complete quest |
| `addEffect(id, args?)` | `['addEffect', {...}]` | Add effect card |

#### Predicates

Predicates are instructions that return boolean values:

| Builder | Output | Description |
|---------|--------|-------------|
| `hasItem(item, count?)` | `['hasItem', {...}]` | Check inventory |
| `hasStat(stat, min?, max?)` | `['hasStat', {...}]` | Check player stat |
| `inLocation(location)` | `['inLocation', {...}]` | Check current location |
| `inScene()` | `['inScene', {}]` | Check if scene has options |
| `npcStat(npc, stat, min?, max?)` | `['npcStat', {...}]` | Check NPC stat |
| `hasCard(cardId)` | `['hasCard', {...}]` | Check if player has card |
| `cardCompleted(cardId)` | `['cardCompleted', {...}]` | Check if card is completed |
| `not(predicate)` | `['not', {...}]` | Negate predicate |
| `and(...predicates)` | `['and', {...}]` | All must be true |
| `or(...predicates)` | `['or', {...}]` | Any must be true |

#### Generic Builder

```typescript
run(scriptName, params)  // [scriptName, params]
```

Use `run()` to call any script, including custom ones.

### Example: Tavern Scene

```typescript
import {
  text, paragraph, hl, say, option, npcLeaveOption,
  when, cond, seq, hasItem,
  type Instruction, registerDslScript
} from './ScriptDSL'

const enterTavern: Instruction[] = [
  text('You push open the heavy oak door.'),
  paragraph(
    'The air is thick with ',
    hl('pipe smoke', '#888888', 'Tobacco blend'),
    '.'
  ),
  say('Welcome, traveler!', 'barkeeper'),
  cond(
    hasItem('crown', 5), seq(
      say('What can I get you?', 'barkeeper'),
      option('buyAle', { price: 2 }, 'Buy an ale'),
      option('buyWine', { price: 5 }, 'Buy wine')
    ),
    say('Come back when you have coin.', 'barkeeper')
  ),
  option('lookAround', {}, 'Look around'),
  npcLeaveOption('You nod and head out.', 'Safe travels!', 'Leave')
]

// Register as a runnable script
registerDslScript('enterTavern', enterTavern)
```

### Execution

To execute DSL instructions:

```typescript
import { exec, execAll } from './ScriptDSL'

// Execute single instruction, get result
const hasGold = exec(game, hasItem('crown', 10))  // boolean

// Execute array of instructions
execAll(game, [
  text('Hello'),
  when(hasItem('crown'), text('You are rich!'))
])
```

### JSON Serialization

Instructions are fully JSON-serializable:

```typescript
const script: Instruction[] = [
  text('Hello'),
  when(hasItem('gold'), say('Rich!'))
]

const json = JSON.stringify(script)
// Can be stored, transmitted, loaded later

const loaded = JSON.parse(json)
execAll(game, loaded)
```

## Control Flow Details

### when / unless

`when(condition, ...thenInstructions)` executes the instructions only if the condition is truthy.

```typescript
when(hasItem('key'),
  text('You unlock the door.'),
  move('secretRoom')
)

unless(hasItem('key'),
  text('The door is locked.')
)
```

### cond (Multi-branch)

`cond` works like Lisp's cond - pairs of (condition, expression), with an optional default:

```typescript
// If/else (3 args)
cond(hasItem('crown'), text('Rich!'), text('Poor!'))

// Multiple branches
cond(
  hasItem('crown', 100), text('Wealthy!'),
  hasItem('crown', 10), text('Comfortable'),
  hasItem('crown'), text('Getting by'),
  text('Broke')  // default (odd argument at end)
)
```

### seq (Sequence)

`seq` wraps multiple instructions to be treated as a single instruction. Useful with `cond`:

```typescript
cond(
  hasItem('crown', 5), seq(
    say('Welcome, valued customer!'),
    option('buyExpensive', {}, 'Premium goods')
  ),
  say('Just browsing?')
)
```

### random

`random` executes one randomly selected child instruction:

```typescript
// Random flavor text
random(
  text('A brass-plated automaton whirs past.'),
  text('Steam hisses from a nearby pipe.'),
  text('A clockwork bird chirps on a lamppost.')
)

// Random item reward
random(
  seq(text('You found a coin!'), addItem('crown')),
  seq(text('You found a gem!'), addItem('gem')),
  text('You found nothing.')
)
```

### skillCheck

`skillCheck` performs a skill test. It can be used in two modes:

**Predicate mode** (no callbacks): Returns boolean, useful in conditions:
```typescript
when(skillCheck('Perception', 10),
  text('You notice something hidden.')
)
```

**Callback mode**: Executes different instructions based on success/failure:
```typescript
skillCheck('Flirtation', 15,
  [say('You charm them successfully.'), addStat('Charm', 1)],
  [text('They seem unimpressed.')]
)
```

## Mixing DSL with Imperative

The DSL coexists with imperative scripts. You can:

1. Call imperative scripts from DSL using `run()`:
   ```typescript
   run('myCustomScript', { arg1: 'value' })
   ```

2. Use DSL instructions inside imperative scripts:
   ```typescript
   makeScript('hybridScript', (game, params) => {
     game.add('Setting up...')
     execAll(game, [
       when(hasItem('crown'), text('You have money!'))
     ])
     game.addOption('continue', {}, 'Continue')
   })
   ```

3. Register DSL arrays as scripts:
   ```typescript
   registerDslScript('myDslScript', [
     text('Hello'),
     option('next', {}, 'Continue')
   ])
   ```

## Architecture Notes

### Script Registry

All scripts are registered in a global registry (`model/Scripts.ts`). Scripts can call other scripts via `game.run(scriptName, params)`.

### File Organization

- **`model/Scripts.ts`** - Core script registry and all generic scripts (game actions, control flow, predicates, content)
- **`model/ScriptDSL.ts`** - DSL builder functions that construct instruction tuples
- **`story/Utility.ts`** - Story-specific scripts containing game world content (e.g., flavor text)

Scripts belong in `Scripts.ts` unless they contain story-specific content like hardcoded narrative text or world-specific logic.

### Return Values

Scripts can return values. The DSL leverages this for predicates:
- `exec(game, hasItem('crown'))` returns `true` or `false`
- Control flow scripts like `when` use `exec()` internally to evaluate conditions

### Type Safety

The `Instruction` type is `[string, Record<string, unknown>]`. While this allows any script name, the builder functions provide type-safe construction:

```typescript
// Type-safe via builders
hasItem('crown', 10)  // Always correct

// Manual construction (less safe)
const instr: Instruction = ['dsl.hasItem', { item: 'crown', count: 10 }]
```

## Best Practices

1. **Use DSL for narrative content** - scenes, dialogue, branching
2. **Use imperative for complex logic** - calculations, inventory management, game mechanics
3. **Keep scripts focused** - one responsibility per script
4. **Leverage existing utility scripts** - `gainItem`, `loseItem`, `move`, etc.
5. **Test builder output** - verify instructions produce expected tuples
6. **Keep instructions JSON-clean** - no functions, classes, or circular references

## When to Use Which Approach

### Use Declarative DSL When:

- Writing dialogue scenes or narrative content
- Creating branching storylines with conditions
- Building content that should be saveable/loadable
- The logic is primarily "if X then show Y"
- You want the content to be hot-reloadable

```typescript
// Good DSL usage: narrative scene
const tavernScene: Instruction[] = [
  text('The barkeeper looks up as you enter.'),
  cond(
    hasItem('crown', 10), say('Welcome, valued customer!', 'barkeeper'),
    say('You look like you could use a drink.', 'barkeeper')
  ),
  option('orderDrink', {}, 'Order a drink'),
  npcLeaveOption()
]
```

### Use Imperative Scripts When:

- Complex calculations or game mechanics
- Interacting with external systems
- Dynamic content generation based on complex state
- Loops or recursive logic
- Direct manipulation of multiple game systems

```typescript
// Good imperative usage: complex game logic
makeScript('calculateDamage', (game, { weapon, target }) => {
  const baseDamage = getWeaponDamage(weapon)
  const modifier = game.player.stats.get('Strength') / 10
  const defense = game.getNPC(target).stats.get('defense') ?? 0
  const finalDamage = Math.max(0, baseDamage * modifier - defense)

  game.getNPC(target).stats.set('health',
    (game.getNPC(target).stats.get('health') ?? 100) - finalDamage
  )

  return finalDamage
})
```

### Hybrid Approach

Often the best solution combines both:

```typescript
// Imperative script that uses DSL for its narrative parts
makeScript('enterShop', (game, params) => {
  const shopkeeper = game.getNPC('shopkeeper')
  const playerGold = game.player.inventory.find(i => i.id === 'crown')?.number ?? 0

  // Complex logic in imperative
  const discount = shopkeeper.stats.get('relationship') > 50 ? 0.9 : 1.0
  const canAfford = playerGold >= 10 * discount

  // Narrative in DSL
  execAll(game, [
    text('You enter the shop.'),
    say(`Welcome! Everything is ${discount < 1 ? '10% off for you!' : 'at regular prices.'}`, 'shopkeeper'),
    when(canAfford ? hasItem('crown') : not(hasItem('crown')),
      option('buyItem', { discount }, 'Browse wares')
    ),
    npcLeaveOption()
  ])
})
```

## Common Patterns

### Gated Content

```typescript
// Only show option if player meets requirements
when(and(hasItem('key'), hasStat('Perception', 20)),
  option('secretDoor', {}, 'Examine the strange wall')
)
```

### Progressive Dialogue

```typescript
// Different dialogue based on relationship
cond(
  npcStat('merchant', 'trust', 80), say('My dear friend! I have something special for you.', 'merchant'),
  npcStat('merchant', 'trust', 40), say('Ah, a familiar face. What can I do for you?', 'merchant'),
  say('What do you want?', 'merchant')
)
```

### Random Variety

```typescript
// Add flavor without repetition
random(
  text('A steam whistle echoes in the distance.'),
  text('Gears click and whir from the machinery above.'),
  text('The gaslights flicker momentarily.')
)
```

### Skill Checks with Consequences

```typescript
skillCheck('Flirtation', 15,
  [
    say('You charm them effortlessly.', 'target'),
    addStat('Charm', 1),
    run('unlockSpecialOption', {})
  ],
  [
    text('They seem unimpressed by your advances.'),
    addStat('Composure', -5)
  ]
)
```
