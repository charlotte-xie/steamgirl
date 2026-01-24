# Scripting System

This document describes the SteamGirl scripting system: how scripts work, the declarative DSL, and how to author game content.

## Overview

SteamGirl uses a two-layer scripting system:

1. **Imperative Scripts** - TypeScript functions `(game: Game, params: {}) => any` that directly manipulate game state
2. **Declarative DSL** - JSON-serializable instructions that compile to script calls

Both layers coexist. The DSL compiles down to imperative script calls, so authors can use whichever approach fits their needs.

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
