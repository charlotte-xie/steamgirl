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
    // Pure DSL -- simple interactions
    onBuyDrink: seq(
      say('What\'ll it be?'),
      option('Sweet wine (5 Kr)', 'onOrderWine'),
      npcLeaveOption('Nothing, thanks.', 'Suit yourself.'),
    ),

    // DSL -- random flavour with options
    roomChat: seq(
      random(
        say('Have you seen the bathroom? Claw-footed tub!'),
        say('The view from up here -- magnificent.'),
      ),
      option('Chat', 'roomChat'),
      option('Leave', 'leaveRoom'),
      npcLeaveOption(),
    ),

    // DSL -- multi-scene sequence (tour, date, etc.)
    tour: scenes(
      scene(
        hideNpcImage(),
        'You set off together.',
        move('default'), timeLapse(15),
        say('Here we are -- the heart of Aetheria.'),
      ),
      scene(
        showNpcImage(),
        say('I hope that helps!'),
        npcLeaveOption('You thank him and he leaves.'),
      ),
    ),

    // Imperative -- complex logic with skill checks
    flirt: (game: Game) => {
      const npc = game.getNPC('barkeeper')
      if (npc.affection >= 30) {
        game.run(addNpcStat('affection', 2, 'barkeeper', { max: 40 }))
        game.run(say('You\'re one of a kind, you know that?'))
      } else {
        game.run(addNpcStat('affection', 3, 'barkeeper', { max: 30 }))
        game.run(seq(
          'You lean closer and compliment his ale selection.',
          say('Oh! Well, I -- thank you.'),
        ))
      }
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

Scripts in the `scripts` record can be **pure DSL** (Instructions), **imperative** (ScriptFn functions), or **mixed**. Use whatever fits the complexity:

- **Pure DSL** (`seq(...)`, `scenes(...)`) -- for dialogue, sequences, and branching
- **Imperative** (`(game: Game) => { ... }`) -- for skill checks, affection-gated logic, loops

The `option()` DSL helper auto-resolves script names against the current scene NPC's scripts, so `option('Chat', 'onChat')` looks for the NPC's `onChat` script first, then falls back to the global registry.

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

JSON-serialisable instructions. Best for narrative sequences. Plain strings are auto-wrapped in `text()`:

```typescript
seq(
  'You enter the room.',          // String auto-wrapped to text()
  when(hasItem('key'), 'The door is unlocked!'),
  say('Welcome.'),
  option('Ask about the key', 'onAskKey'),
  npcLeaveOption('You nod and leave.', 'Goodbye.'),
)
```

### DSL Reference

#### Content

| Helper | Purpose |
|--------|---------|
| `text(...parts)` | Add narrative text. Parts can be strings or Instructions (`playerName()`, `npcName()`) |
| `say(...parts)` | NPC dialogue in the scene NPC's speech colour. Same part types as `text()` |
| `playerName()` | Inline player name (for use inside `text()` or `say()`) |
| `npcName(npcId?)` | Inline NPC name with speech colour (uses scene NPC if omitted) |
| `paragraph(...content)` | Formatted paragraph with optional `hl()` highlights |
| `option(label, script?, params?)` | Action button. Script auto-resolves against NPC scripts |
| `npcLeaveOption(text?, reply?, label?)` | Standard conversation exit |
| `npcInteract(script, params?)` | Run a named script on the scene NPC |

#### Control Flow

| Helper | Purpose |
|--------|---------|
| `seq(...elements)` | Execute in sequence. Strings become `text()` |
| `when(condition, ...then)` | Conditional block. Then elements can be strings |
| `unless(condition, ...then)` | Inverted conditional |
| `cond(condition, then, condition, then, ..., default?)` | Multi-branch (Lisp-style) |
| `random(...children)` | Pick one at random. Strings become `text()` |
| `skillCheck(skill, difficulty, onSuccess?, onFailure?)` | Stat roll. Callbacks are single elements (use `seq()` to group) |

#### Scene Composition

| Helper | Purpose |
|--------|---------|
| `scenes(...pages)` | Multi-page sequence with auto Continue buttons |
| `scene(...elements)` | Group elements into a single page (compiles to `seq()`) |
| `branch(label, ...elements)` | Player choice that continues the scene sequence |
| `branch(label, pages[])` | Multi-page player choice (pass `Instruction[]`) |
| `choice(...branches, ...epilogue)` | Branches with shared ending instructions |
| `gatedBranch(condition, label, ...elements)` | Branch that only appears when condition is met |

#### Actions

| Helper | Purpose |
|--------|---------|
| `move(location, minutes?)` | Instant teleport (optionally advance time after) |
| `go(location, minutes?)` | Travel with link checks, time, and arrival hooks |
| `timeLapse(minutes)` | Advance time |
| `timeLapseUntil(hourOfDay)` | Advance to specific hour (e.g. `10.25` for 10:15am) |
| `setNpc(npcId)` | Set scene NPC for speech colour |
| `hideNpcImage()` / `showNpcImage()` | Toggle NPC portrait |
| `learnNpcName()` | Mark scene NPC's name as known |
| `addItem(item, count?)` | Give item to player |
| `removeItem(item, count?)` | Take item from player |
| `addStat(stat, change, options?)` | Modify stat (options: `max`, `min`, `chance`, `hidden`) |
| `addNpcStat(stat, change, npc?, options?)` | Modify NPC stat (options: `max`, `min`, `hidden`). Uses scene NPC if omitted |
| `moveNpc(npc, location)` | Move an NPC (pass `null` to clear) |
| `recordTime(timer)` | Store current time for cooldowns |
| `discoverLocation(location, text?, colour?)` | Reveal a hidden location |
| `addQuest(questId, args?)` | Add quest card |
| `completeQuest(questId)` | Mark quest complete |
| `addEffect(effectId, args?)` | Add effect card |
| `eatFood(quantity)` | Set lastEat timer and reduce hunger |

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
| `locationDiscovered(location)` | Check if location is discovered |
| `hourBetween(from, to)` | Check time of day (supports wrap-around) |
| `timeElapsed(timer, minutes)` | Check cooldown |
| `debug()` | True when debug mode is enabled |
| `not(pred)` / `and(...preds)` / `or(...preds)` | Logic combinators |

## Multi-Scene Sequences

The `scenes()` helper chains multiple pages with automatic Continue buttons. Use `scene()` to group elements into readable pages (it compiles to `seq()`). Plain strings auto-wrap to `text()`:

```typescript
scripts: {
  tour: scenes(
    scene(
      hideNpcImage(),
      'You set off together through the crowded streets.',
      move('default'), timeLapse(15),
      say('Here we are -- the heart of Aetheria.'),
    ),
    scene(
      discoverLocation('school'),
      move('school'), timeLapse(15),
      say('The University -- you\'ll study here.'),
    ),
    scene(
      showNpcImage(),
      say('I hope that helps!'),
      addNpcStat('affection', 1, 'tour-guide', { hidden: true }),
      npcLeaveOption('You thank Rob and he leaves.'),
    ),
  ),
}
```

Each page runs its instructions, then a Continue button is added if more pages follow. If a page adds its own options (like `npcLeaveOption`), no Continue button is added.

### Branching Within Scenes

Use `branch()` inside a scene page to offer player choices. When a scene contains branches, the outer `scenes()` sequence resumes after the chosen branch completes:

```typescript
scenes(
  scene(
    say('I\'m glad you came tonight.'),
    'He moves a little closer on the bench.',
  ),
  scene(
    say('It\'s nicer with company.'),
    branch('Lean against him',
      'You lean into his shoulder. He relaxes.',
      addNpcStat('affection', 3, 'tour-guide', { max: 45 }),
      say('This is... really nice.'),
    ),
    branch('Stay where you are',
      'You keep a comfortable distance.',
      say('It\'s peaceful here, isn\'t it?'),
    ),
  ),
  scene(
    'You sit together in the quiet.',
    say('I had a lovely time tonight.'),
  ),
)
```

The final scene runs after whichever branch the player picks. Threading happens automatically -- authors don't need to manage it.

For **multi-page branches**, pass an `Instruction[]` array:

```typescript
branch('Go to the hidden garden', [
  scene(
    hideNpcImage(),
    'Rob leads you along a narrow path.',
    move('lake', 10),
  ),
  scene(
    showNpcImage(),
    'You step into a hidden garden.',
    say('I\'ve never shown anyone before.'),
    addNpcStat('affection', 3, 'tour-guide', { max: 50 }),
  ),
])
```

### Choices with Shared Epilogue

When multiple branches share ending instructions, use `choice()` to avoid duplicating them:

```typescript
// Without choice(): endDate() duplicated in every branch
branch('Kiss him', 'You kiss.', endDate()),
branch('Not tonight', 'You decline.', endDate()),

// With choice(): endDate() written once
choice(
  branch('Kiss him', 'You kiss.'),
  branch('Not tonight', 'You decline.'),
  endDate(),  // shared -- runs at the end of whichever branch is chosen
)
```

Branches become player options; non-branch instructions form the shared epilogue, merged into the **last page** of each branch (no extra Continue click). Convention: list branches first, then epilogue instructions.

### Conditional Branches

Use `gatedBranch()` to show an option only when a condition is met. If the condition is false at runtime, the option simply doesn't appear:

```typescript
choice(
  gatedBranch(npcStat('tour-guide', 'affection', 35),
    'Go to the hidden garden', ...gardenPath()),
  branch('Walk to the pier', ...pierPath()),
  endDate(),
)
```

`gatedBranch()` works inside `choice()` -- the shared epilogue is threaded through correctly.

For complex branching, the alternative is `cond()` with explicit `seq()` blocks:

```typescript
scene(
  say('Shall we walk a bit further?'),
  cond(
    npcStat('tour-guide', 'affection', 35),
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

### Helper Functions for Branching Paths

For date scenes with multiple routes, extract paths into functions returning `Instruction[]`:

```typescript
function robPierPath(): Instruction[] {
  return [
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
    ...robWalkHome(),
  ]
}
```

These are called at module load time, so the result can be spread into `scenes()` or passed to `branch()`.

### Quick Reference

| Helper | Returns | Purpose |
|--------|---------|---------|
| `scenes(...pages)` | `Instruction` | Multi-page sequence with Continue buttons |
| `scene(...elements)` | `Instruction` | Group elements into a single page (alias for `seq`) |
| `branch(label, ...elements)` | `Instruction` | Player choice button (inline content) |
| `branch(label, pages[])` | `Instruction` | Player choice button (multi-page) |
| `choice(...branches, ...epilogue)` | `Instruction` | Branches with shared ending |
| `gatedBranch(cond, label, ...elements)` | `Instruction` | Conditional branch |
| `seq(...elements)` | `Instruction` | Run elements immediately (no pause) |

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

// Skill check with success/failure branches (use seq() for multiple elements)
skillCheck('Flirtation', 20,
  say('You charm them effortlessly.'),
  say('Your attempt falls flat.'),
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
