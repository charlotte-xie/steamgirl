# Content Authoring

Guide to adding narrative content, locations, NPCs, items, and quests to the game. All content lives in `src/story/` and registers itself via global registration functions at import time.

## Quick Start

To add a new area:

1. Create a file in `src/story/` (e.g., `MyArea.ts`)
2. Register locations, NPCs, items, cards, and scripts
3. Import the file in `src/story/World.ts` in the correct dependency order

```typescript
// src/story/MyArea.ts
import { registerLocation } from '../model/Location'
import { registerNPC } from '../model/NPC'
import { makeScripts } from '../model/Scripts'

registerLocation('my-location', {
  name: 'My Location',
  description: 'A quiet corner of Aetheria.',
  image: '/images/my-location.jpg',
  links: [{ dest: 'city-centre', time: 5 }],
  activities: [
    { name: 'Rest', symbol: 'R', script: 'relaxAtLocation' },
  ],
})
```

Then in `World.ts`:
```typescript
import './MyArea'  // After modules it depends on
```

## Registration Functions

| Function | What it registers |
|----------|------------------|
| `registerLocation(id, definition)` | Locations with links, activities, hooks |
| `registerNPC(id, definition)` | NPCs with dialogue, schedules, scripts |
| `registerCardDefinition(id, definition)` | Quests, effects, traits, tasks |
| `registerItemDefinition(id, definition)` | Inventory items and clothing |
| `makeScript(name, fn)` | Single named script |
| `makeScripts({ name: fn, ... })` | Multiple scripts at once |

## World.ts and Dependency Order

`src/story/World.ts` imports all story modules. **Order matters** -- modules must be imported after anything they depend on:

```typescript
import './Effects'      // Effect definitions first
import './items'        // Item definitions
import './Utility'      // Shared utility scripts
import './Start'        // Initial setup (depends on Effects, items)
import './Subway'       // Transport network
import './City'         // City locations (depends on Subway links)
import './Market'       // Shops (depends on items)
// ... more area modules
```

## Locations

### Definition

```typescript
registerLocation('tavern', {
  name: 'The Rusty Cog',
  description: 'A smoky tavern filled with the clink of glasses.',
  image: '/images/tavern.jpg',
  nightImage: '/images/tavern-night.jpg',    // Optional night variant
  mainLocation: true,                         // Shows under "Travel" in nav
  secret: true,                               // Starts undiscovered

  links: [...],          // Navigation to other locations
  activities: [...],     // Actions available here

  onFirstArrive: script, // First visit only
  onArrive: script,      // Every visit
  onRelax: script,       // When player rests
  onWait: script,        // Each 10-min chunk during wait (can interrupt)
})
```

### Links

Links define how locations connect. They appear in the navigation overlay.

```typescript
links: [
  {
    dest: 'city-centre',
    time: 10,                    // Minutes to travel
    label: 'Head to the city',   // Override destination name in nav
    travel: true,                // Show under "Travel" instead of "Places"
    cost: 3,                     // Krona cost (display hint)
    imageLocation: 'city',       // Use different location's image for thumbnail
    checkAccess: (game) => {
      if (game.hourOfDay < 6) return 'The gates are closed at night'
      return null                // null = access granted
    },
    onFollow: (game) => {
      // Runs before travel -- can create a scene to cancel
      game.add('You set off down the road...')
    },
  },
]
```

### Activities

Activities are actions available at a location, shown as thumbnails in the activity overlay.

```typescript
activities: [
  {
    name: 'Hang at Bar',
    symbol: 'B',                 // Single character or short text
    image: '/images/bar.jpg',    // Optional image
    label: 'Have a drink',       // Display label (defaults to name)
    condition: (game) => game.hourOfDay >= 18,  // When to show
    script: (game) => {
      game.run('wait', { minutes: 30 })
      if (!game.inScene) {
        game.add('You enjoy a quiet drink.')
      }
    },
  },
]
```

### Event Hooks

- **`onFirstArrive`** -- Runs once on first visit. Good for discovery scenes.
- **`onArrive`** -- Runs every visit. Good for ambient descriptions.
- **`onRelax`** -- Runs when the player chooses to relax. Falls back to a generic message.
- **`onWait`** -- Runs each 10-minute chunk during `wait()`. If it creates a scene (adds options), the wait stops. Good for ambient events.

## NPCs

### Definition

```typescript
registerNPC('barkeeper', {
  name: 'Martha',
  uname: 'barkeeper',                       // Shown before name is learned
  description: 'A stout woman with...',
  image: '/images/npcs/Martha.jpg',
  speechColor: '#c49bd4',                    // Dialogue colour

  generate: (game, npc) => {
    npc.location = 'tavern'                  // Initial position
  },

  onFirstApproach: seq(                      // First conversation
    say('Welcome, stranger.'),
    learnNpcName(),
    option('Ask about the tavern', 'onAskTavern'),
    npcLeaveOption(),
  ),

  onApproach: seq(                           // Subsequent conversations
    say('Back again?'),
    option('Buy a drink', 'onBuyDrink'),
    npcLeaveOption(),
  ),

  onMove: (game) => {                        // Called when hour changes
    game.getNPC('barkeeper').followSchedule(game, [
      [10, 23, 'tavern'],                   // 10am--11pm
    ])
  },

  onWait: (game) => {                        // During wait() if present
    // Can create scene to interrupt wait
  },

  scripts: {                                 // NPC-specific interaction scripts
    onBuyDrink: (game) => {
      const npc = game.npc
      npc.say('What\'ll it be?')
         .option('Sweet wine (5 Kr)', 'onOrderWine')
         .leaveOption('Nothing, thanks.', 'Suit yourself.')
    },
    onOrderWine: (game) => {
      game.player.removeItem('crown', 5)
      game.run('gainItem', { item: 'sweet-wine' })
      game.npc.say('Enjoy.')
    },
  },
})
```

### Scheduling

`followSchedule` takes an array of `[startHour, endHour, locationId]` tuples. It handles midnight wrap-around (e.g., `[22, 2, 'tavern']` means 10pm to 2am). NPCs not matching any schedule entry are set to `location = null` (not present anywhere).

### NPC Stats

NPCs track relationship data automatically:

- `npc.approachCount` -- Incremented each time the player approaches
- `npc.nameKnown` -- Set to 1 via `learnNpcName()` when the player learns their name
- `npc.affection` -- Relationship value, modified by scripts

### NPC-Specific Scripts

Scripts in the `scripts` record are accessed via the `interact` system. The `option()` DSL helper auto-resolves script names against the current scene NPC's scripts, so `option('Chat', 'onChat')` looks for the NPC's `onChat` script.

## Scripting

Content can be authored using imperative TypeScript or the declarative DSL. Both produce the same result -- the DSL compiles to `[scriptName, params]` tuples.

### Imperative Style

Direct access to the game object. Best for complex logic:

```typescript
makeScript('myScript', (game, params) => {
  if (game.player.countItem('crown') >= 10) {
    game.add('You can afford it.')
    game.addOption('buy', {}, 'Buy')
  } else {
    game.add('You can\'t afford it.')
  }
  game.addOption('endScene', {}, 'Leave')
})
```

### Declarative DSL

JSON-serialisable instructions. Best for narrative sequences:

```typescript
seq(
  text('You enter the room.'),
  when(hasItem('key'), text('The door is unlocked!')),
  say('Welcome.'),
  option('Ask about the key', 'onAskKey'),
  npcLeaveOption('You nod and leave.', 'Goodbye.'),
)
```

### DSL Reference

#### Content

| Helper | Purpose |
|--------|---------|
| `text(...parts)` | Add narrative text (supports nested instructions like `playerName()`) |
| `say(...parts)` | NPC dialogue in their speech colour |
| `playerName()` | Inline player name |
| `npcName(npcId?)` | Inline NPC name (uses scene NPC if omitted) |
| `option(label, script?, params?)` | Action button |
| `npcLeaveOption(text?, reply?, label?)` | Standard conversation exit |

#### Control Flow

| Helper | Purpose |
|--------|---------|
| `seq(...instructions)` | Execute in sequence |
| `when(condition, ...then)` | Conditional block |
| `unless(condition, ...then)` | Inverted conditional |
| `cond(condition, then, condition, then, ..., default?)` | Multi-branch |
| `random(...children)` | Pick one at random |
| `scenes(...sceneArrays)` | Multi-scene sequence with auto Continue buttons |
| `scene(name, ...instructions)` | Named scene page for readability (returns `Instruction[]`) |
| `branch(label, ...instructions)` | Player choice that continues the scene sequence |
| `choice(...branches, ...epilogue)` | Branches with shared ending instructions |
| `gatedBranch(condition, label, ...instructions)` | Branch that only appears when condition is met |
| `skillCheck(skill, difficulty, onSuccess, onFailure)` | Stat roll with branches |

#### Actions

| Helper | Purpose |
|--------|---------|
| `move(location)` | Instant teleport |
| `go(location, minutes?)` | Travel with time advance |
| `timeLapse(minutes)` | Advance time |
| `timeLapseUntil(hourOfDay)` | Advance to specific hour |
| `setNpc(npcId)` | Set scene NPC for speech colour |
| `hideNpcImage()` / `showNpcImage()` | Toggle NPC portrait |
| `learnNpcName()` | Mark scene NPC's name as known |
| `addItem(item, count?)` | Give item to player |
| `removeItem(item, count?)` | Take item from player |
| `addStat(stat, change, options?)` | Modify stat with display |
| `recordTime(timer)` | Store current time for cooldowns |
| `discoverLocation(location)` | Reveal a hidden location |
| `addQuest(questId, args?)` | Add quest card |
| `completeQuest(questId)` | Mark quest complete |
| `addEffect(effectId, args?)` | Add effect card |

#### Predicates

| Helper | Purpose |
|--------|---------|
| `hasItem(item, count?)` | Check inventory |
| `hasStat(stat, min?, max?)` | Check stat range |
| `inLocation(location)` | Check current location |
| `inScene()` | Check if scene has options |
| `npcStat(npc, stat, min?, max?)` | Check NPC stat |
| `hasCard(cardId)` | Check for card |
| `cardCompleted(cardId)` | Check quest completion |
| `timeElapsed(timer, minutes)` | Check cooldown |
| `not(pred)` / `and(...preds)` / `or(...preds)` | Logic combinators |

## Multi-Scene Sequences

The `scenes()` helper chains multiple scenes with automatic Continue buttons:

```typescript
scripts: {
  tour: scenes(
    [
      hideNpcImage(),
      text('You set off together.'),
      move('city-centre'),
      timeLapse(15),
      say('This is the heart of Aetheria.'),
    ],
    [
      move('school'),
      timeLapse(15),
      say('The University -- you\'ll study here.'),
    ],
    [
      showNpcImage(),
      say('I hope that helps!'),
      npcLeaveOption(),
    ],
  ),
}
```

Each scene runs its instructions, then adds a Continue button if more scenes follow. If a scene adds its own options (like `npcLeaveOption`), no Continue button is added.

### Named Scenes

Use `scene()` to label scene pages for readability. The name is documentation only and has no runtime effect:

```typescript
scenes(
  scene('Setting off', text('Rob offers his arm...'), move('lake', 15)),
  scene('At the lake', text('Steam rises...'), say('I come here sometimes...')),
  scene('Farewell', say('Get home safe.'), endDate()),
)
```

Without `scene()`, pages are anonymous arrays -- harder to navigate in long date sequences.

### Branching Within Scenes

Use `branch()` inside a scene page to offer player choices. When a scene contains branches, the outer `scenes()` sequence resumes automatically after the chosen branch completes:

```typescript
scenes(
  scene('Conversation',
    say('I\'m glad you came tonight.'),
    text('He moves closer.'),
    branch('Lean against him',
      text('You lean into his shoulder.'),
      addNpcStat('affection', 3, 'tour-guide', { max: 45 }),
    ),
    branch('Stay where you are',
      text('You keep a comfortable distance.'),
    ),
  ),
  scene('Later that evening',
    text('You sit together in the quiet.'),
  ),
)
```

The "Later that evening" scene runs after whichever branch the player picks. This threading happens automatically inside `continueScenes` -- authors don't need to manage it.

### Choices with Shared Epilogue

When multiple branches share ending instructions, use `choice()` to avoid duplicating them:

```typescript
// Before: endDate() duplicated in every branch
branch('Kiss him', text('You kiss.'), endDate()),
branch('Not tonight', text('You decline.'), endDate()),

// After: endDate() written once
choice(
  branch('Kiss him', text('You kiss.')),
  branch('Not tonight', text('You decline.')),
  endDate(),  // shared -- runs at the end of whichever branch is chosen
)
```

`choice()` accepts a mix of branches and plain instructions. Branches become player options; non-branch instructions form the shared epilogue, merged into the last page of each branch (no extra Continue click).

Convention: list branches first, then epilogue instructions.

### Conditional Branches

Use `gatedBranch()` to show an option only when a condition is met:

```typescript
// Before: awkward cond/seq nesting
cond(
  npcStat('tour-guide', 'affection', 35),
  seq(
    branch('Go to the hidden garden', ...gardenPath),
    branch('Walk to the pier', ...pierPath),
  ),
  seq(
    branch('Walk to the pier', ...pierPath),
  ),
)

// After: reads as a flat option list with a gate
choice(
  gatedBranch(npcStat('tour-guide', 'affection', 35),
    'Go to the hidden garden', ...gardenPath),
  branch('Walk to the pier', ...pierPath),
  endDate(),
)
```

If the condition is false at runtime, the gated option simply doesn't appear. `gatedBranch()` works inside `choice()` -- the shared epilogue is threaded through correctly.

### Quick Reference

| Helper | Returns | Purpose |
|--------|---------|---------|
| `scene(name, ...instrs)` | `Instruction[]` | Named page wrapper for `scenes()` |
| `branch(label, ...instrs)` | `Instruction` | Player choice button |
| `choice(...branches, ...epilogue)` | `Instruction` | Branches with shared ending |
| `gatedBranch(cond, label, ...instrs)` | `Instruction` | Conditional branch |
| `scenes(...pages)` | `Instruction` | Multi-page sequence with Continue buttons |
| `seq(...instrs)` | `Instruction` | Run instructions immediately (no pause) |

## Items

### Clothing Items

Extend a base template to inherit position/layer settings:

```typescript
import { registerItemDefinition, extendItem } from '../model/Item'

registerItemDefinition('blouse-silk', extendItem('base-top', {
  name: 'silk blouse',
  description: 'A fine silk blouse with mother-of-pearl buttons.',
  calcStats: (player) => {
    player.modifyStat('Charm', 3)
  },
}))
```

See [CLOTHING.md](./CLOTHING.md) for the full list of base templates and the position/layer system.

### Consumables

```typescript
registerItemDefinition('healing-tea', {
  name: 'healing tea',
  category: 'Consumables',
  stackable: true,
  onConsume: (game) => {
    game.run('addStat', { stat: 'Energy', change: 20 })
  },
})
```

### Components and Other Items

```typescript
registerItemDefinition('brass-cog', {
  name: 'brass cog',
  category: 'Components',
  stackable: true,
  description: 'A small brass cogwheel.',
})
```

### Item File Organisation

Items are organised by body area in `src/story/items/`:

```
items/
├── index.ts            # Central import
├── base-templates.ts   # Base garment types (positions/layers)
├── torso.ts            # Blouses, shirts, vests
├── legwear.ts          # Skirts, trousers
├── dresses.ts          # Full dresses
├── footwear.ts         # Boots, shoes, stockings
├── outerwear.ts        # Jackets, corsets, coats
├── headwear.ts         # Hats, masks, eyewear
├── accessories.ts      # Jewellery, belts, gloves
├── undergarments.ts    # Bras, panties, chemises
├── components.ts       # Mechanical parts
└── special.ts          # School uniforms, cursed items
```

## Quests

Quests are cards with an `afterUpdate` hook that checks completion conditions after every action:

```typescript
registerCardDefinition('find-lodgings', {
  name: 'Find Lodgings',
  description: 'Check into your lodgings in the backstreets.',
  type: 'Quest',
  afterUpdate: (game) => {
    if (game.currentLocation === 'bedroom') {
      game.completeQuest('find-lodgings')
    }
  },
})

// Add the quest during gameplay:
game.addQuest('find-lodgings')
```

Quests can also fail:

```typescript
afterUpdate: (game) => {
  const quest = game.player.cards.find(c => c.id === 'attend-university')
  if (!quest || quest.completed || quest.failed) return

  if (game.date >= deadline && !attended) {
    quest.failed = true
    game.add({ type: 'text', text: 'You missed the deadline.', color: '#ef4444' })
  }
}
```

See [CARDS.md](./CARDS.md) for the full card system documentation.

## Effects

Effects are cards with `onTime` and `calcStats` hooks:

```typescript
registerCardDefinition('intoxicated', {
  name: 'Intoxicated',
  type: 'Effect',
  color: '#9333ea',
  onTime: (game, card, seconds) => {
    // Tick down over time, self-remove when expired
  },
  calcStats: (player, card) => {
    // Apply stat bonuses/penalties based on card state
  },
})
```

See [CARDS.md](./CARDS.md) for full examples.

## Shops

Define a shop as an array of item/price pairs and activate it via a script:

```typescript
const SHOP_ITEMS: ShopItemEntry[] = [
  { itemId: 'blouse-white', price: 20 },
  { itemId: 'dress-evening', price: 80 },
]

makeScripts({
  enterMyShop: (game) => {
    game.scene.shop = {
      name: "The Boutique",
      npcId: 'shopkeeper',      // Optional -- shows NPC portrait
      items: SHOP_ITEMS,
    }
  },
})
```

The shop UI handles purchasing automatically (deducts Krona, adds item to inventory).

## Common Gating Patterns

### By Stats or Skills

```typescript
// DSL predicate
when(hasStat('Charm', 30), option('Flatter', 'onFlatter'))

// Skill check with success/failure branches
skillCheck('Flirtation', 20,
  [say('You charm them effortlessly.')],
  [say('Your attempt falls flat.')]
)
```

### By Items

```typescript
when(hasItem('room-key'), text('You unlock the door.'))
```

### By Time of Day

```typescript
// Activity condition
condition: (game) => game.hourOfDay >= 21

// Link access
checkAccess: (game) => game.hourOfDay < 7 ? 'Closed at night' : null
```

### By Quest State

```typescript
when(cardCompleted('find-lodgings'), text('You feel settled in.'))
when(not(hasCard('main-quest')), addQuest('main-quest'))
```

### By NPC Relationship

```typescript
// Imperative
if (npc.affection >= 20) {
  npc.say('I trust you enough to tell you...')
}

// DSL
when(npcStat('barkeeper', 'affection', 10), option('Ask a favour', 'onFavour'))
```

### By Cooldown Timer

```typescript
// Record a timer
recordTime('lastMeal')

// Gate on elapsed time
when(timeElapsed('lastMeal', 360), text('You feel hungry.'))
```

## Images and Assets

All image paths should be absolute from the project root and passed through `assetUrl()` in components. In content definitions, just use the path string:

```typescript
image: '/images/locations/tavern.jpg'
```

## Naming Conventions

- **IDs**: kebab-case (`npc-barkeeper`, `blouse-silk`, `find-lodgings`)
- **Script names**: camelCase (`enterTavern`, `onBuyDrink`)
- **Text**: British/International English to maintain the Victorian aesthetic

## Key Source Files

| File | Purpose |
|------|---------|
| `src/story/World.ts` | Central import point (dependency order) |
| `src/story/Start.ts` | Game initialisation, tutorial quests |
| `src/story/Effects.ts` | Effect card definitions |
| `src/story/items/` | Item and clothing definitions |
| `src/story/Market.ts` | Shop inventories and shopkeeper NPCs |
| `src/story/[Area].ts` | Location-specific content (City, Tavern, School, etc.) |
| `src/model/ScriptDSL.ts` | All DSL helper functions |
| `src/model/Scripts.ts` | Core scripts and script registry |
