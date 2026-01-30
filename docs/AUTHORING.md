# Content Authoring

Guide to writing narrative content for SteamGirl. For the scripting API reference, see [SCRIPTING.md](./SCRIPTING.md).

## Writing Rules

### Player Speech

Never quote the player's dialogue directly. Narrate what the player says or does in third person:

```
BAD:  "I think I'll stay here. But thank you for the drink."
BAD:  "Just passing through, Professor."

GOOD: You tell him you'll stay, but thank him for the drink.
GOOD: You tell her you're just passing through.
GOOD: You decline with a polite smile.
```

This applies everywhere -- `text()`, `leaveOption` departure text, branch labels. The player's voice belongs to the player.

### NPC Speech

Use `say()` for NPC dialogue. Do not include quotation marks -- the speech formatting handles that:

```typescript
// BAD
say('"Welcome to Aetheria," she says.')

// GOOD
say('Welcome to Aetheria.')
'She gestures towards the courtyard.'
```

Separate narration from dialogue. Keep narration in plain strings; keep speech in `say()`.

### Anonymous NPCs

Do not name random encounter NPCs (bar patrons, passers-by, vendors). Named strangers feel absurd on repeat. Use descriptions with `random()` for variety:

```typescript
random(
  'A well-dressed man in a tailored waistcoat takes the neighbouring seat.',
  'A gentleman with silver-streaked hair settles beside you.',
  'A broad-shouldered man with silver cufflinks catches the barman\'s eye.',
)
```

### Agency and Escalation

When writing scenes where the player has relatively free choice (menus, date activities, social encounters), offer a mix of **passive** and **active** options:

- **Passive options** -- the player goes along with something; the NPC drives the escalation. The player accepts, resists, or observes.
- **Active options** -- the player pursues a goal (romance, persuasion, information). The player initiates; the NPC reacts.

Good scenes offer both paths so the player can shape the dynamic:

```typescript
menu(
  // Active -- player pursues
  when(hasStat('Flirtation', 1),
    branch('Flirt', skillCheck('Flirtation', 20, flirtSuccess, flirtFail)),
  ),
  branch('Ask about his work', 'He talks about the shipping business...'),

  // Passive -- NPC drives, player responds
  exit('Stay a while longer...',
    'He turns to face you and brushes a strand of hair from your face.',
    choice(
      branch('Let him', skillCheck('Flirtation', 30, ...)),
      branch('Turn away', 'You put a gentle hand on his chest.'),
    ),
  ),
  exit('Call it a night', 'You tell him you should go.'),
)
```

This doesn't apply to direct responses -- answering a question, reacting to a threat, or replying to an NPC who just said something. In those cases, write the natural response options.

### Repeatability

Random events will fire multiple times. Design accordingly:

- Use `random()` for varied descriptions, dialogue, and flavour
- Avoid one-off revelations or unique items in repeatable events
- Don't reference previous occurrences ("back again?")
- For truly one-off events, gate with a card, timer, or flag

### British English

Use British/International English throughout to maintain the Victorian aesthetic: colour, honour, realise, behaviour, travelling.

## Content Structure

All content lives in `src/story/` and registers itself at import time. Import order matters in `src/story/World.ts` -- modules must come after their dependencies.

### Registration

| Function | What it registers |
|----------|------------------|
| `registerLocation(id, def)` | Locations with links, activities, hooks |
| `registerNPC(id, def)` | NPCs with dialogue, schedules, scripts |
| `registerCardDefinition(id, def)` | Quests, effects, traits, tasks |
| `registerItemDefinition(id, def)` | Items and clothing |
| `registerFaction(id, def)` | Factions with reputation tracks |
| `makeScripts({...})` | Named scripts |

### Naming Conventions

- **IDs**: kebab-case (`npc-barkeeper`, `blouse-silk`, `find-lodgings`)
- **Script names**: camelCase (`enterTavern`, `onBuyDrink`)

## Locations

```typescript
registerLocation('tavern', {
  name: 'The Rusty Cog',
  description: 'A smoky tavern filled with the clink of glasses.',
  image: '/images/tavern.jpg',
  nightImage: '/images/tavern-night.jpg',
  mainLocation: true,       // Shows under "Travel"
  secret: true,             // Starts undiscovered

  links: [
    { dest: 'city-centre', time: 10, travel: true },
    { dest: 'back-alley', time: 2, checkAccess: (g) => g.hourOfDay < 6 ? 'Closed' : null },
  ],

  activities: [
    { name: 'Have a drink', symbol: 'D', script: 'orderDrink', condition: (g) => g.hourOfDay >= 18 },
  ],

  onFirstArrive: seq('The door creaks...', discoverLocation('back-alley')),
  onArrive: (g) => { g.add('The tavern is busy tonight.') },
  onWait: (g) => { /* random events during wait */ },
})
```

### Event Hooks

- **`onFirstArrive`** -- first visit only (discovery scenes)
- **`onArrive`** -- every visit (ambient description)
- **`onRelax`** -- player rests here
- **`onWait`** -- each 10-minute chunk during `wait()`. Creates a scene to interrupt

## NPCs

NPCs are significant, persistent non-player characters (usually named). 

When writing for NPCs, be sure to tailor speech / behaviour to context (previous interactions, story events passed etc.) It may be useful to add helper functions / re-usable subsequences to npc.scripts.

```typescript
registerNPC('barkeeper', {
  name: 'Martha',
  uname: 'barkeeper',
  description: 'A stout woman with...',
  image: '/images/npcs/martha.jpg',
  speechColor: '#c49bd4',

  generate: (game, npc) => { npc.location = 'tavern' },

  onFirstApproach: seq(
    say('Welcome, stranger.'),
    learnNpcName(),
    option('Ask about the tavern', 'onAskTavern'),
    npcLeaveOption(),
  ),

  onApproach: seq(
    say('Back again?'),
    option('Buy a drink', 'onBuyDrink'),
    npcLeaveOption(),
  ),

  onMove: (g) => { g.getNPC('barkeeper').followSchedule(g, [[10, 23, 'tavern']]) },

  scripts: {
    // DSL -- simple interactions
    onBuyDrink: seq(
      say('What\'ll it be?'),
      option('Sweet wine (5 Kr)', 'onOrderWine'),
      npcLeaveOption('You change your mind.', 'Suit yourself.'),
    ),

    // DSL -- multi-scene sequence
    tour: scenes(
      scene(hideNpcImage(), 'You set off together.', move('market', 15)),
      scene(showNpcImage(), say('I hope that helps!'), npcLeaveOption()),
    ),

    // Imperative -- complex logic
    flirt: (game: Game) => {
      const npc = game.getNPC('barkeeper')
      if (npc.affection >= 30) {
        game.run(say('You\'re one of a kind.'))
      }
    },
  },
})
```

### NPC Stats

Standard:
- `npc.approachCount` -- auto-incremented on approach
- `npc.nameKnown` -- set via `learnNpcName()`
- `npc.affection` -- relationship, modified by scripts

NPCs may define custom stats, e.g. to record story advancement on a particular path

### leaveOption

`npc.leaveOption(departureText?, npcReply?, label?)` -- departure text is narrated player action, reply goes through `npc.say()`:

```typescript
npc.leaveOption('You tell her you\'ll come back later.', 'Do come again.')
```

## Quests and Effects

See [CARDS.md](./CARDS.md). Quick example:

```typescript
registerCardDefinition('find-lodgings', {
  name: 'Find Lodgings',
  type: 'Quest',
  afterUpdate: (game) => {
    if (game.currentLocation === 'bedroom') game.completeQuest('find-lodgings')
  },
})
```

## Items and Clothing

See [CLOTHING.md](./CLOTHING.md). Quick example:

```typescript
registerItemDefinition('blouse-silk', extendItem('base-top', {
  name: 'silk blouse',
  description: 'A fine silk blouse with mother-of-pearl buttons.',
  calcStats: (player) => { player.modifyStat('Charm', 3) },
}))
```

## Stat Gains from Events

Be sparing with stat gains from repeatable events:

- **Chance**: `0.3--0.5` for most random event gains
- **Amount**: +1 typical; +2 only for significant interactions
- **Max cap**: `max: 35--40` from random encounters. Story quests and training reach higher
- **Mood/meters**: Cap at `85--90` from passive activities

```typescript
addStat('Flirtation', 1, { max: 35, chance: 0.4 })
```

### Skill Check Difficulty

Formula: `Charm + Skill - Difficulty`. Set difficulty to create meaningful progression:

| Difficulty | Early (C10 S5) | Mid (C25 S20) | Late (C40 S60) |
|------------|----------------|----------------|-----------------|
| 20 | ~0% | ~25% | ~80% |
| 30 | ~0% | ~15% | ~70% |
| 40 | ~0% | ~5% | ~60% |

Gate the option itself to prevent zero-skill attempts:

```typescript
gatedBranch(hasStat('Flirtation', 1), 'Flirt back',
  skillCheck('Flirtation', 20, successContent, failureContent),
)
```

### Event Trigger Rates

For `onWait` hooks (fire every 10-minute chunk):

- **10--15%**: Ambient flavour (doesn't interrupt)
- **15--25%**: Minor encounters (creates a scene)
- **< 10%**: Significant events with lasting consequences

## Patterns

### Costume Changes

Save/restore outfits when a scene changes the player's clothes:

```typescript
saveOutfit('_before-pool'),
changeOutfit(['bikini-top', 'bikini-bottom']),
// ... scene content ...
wearOutfit('_before-pool', { delete: true }),
```

Prefix temporary saves with `_` to distinguish from player-created outfits. Ensure **every exit path** restores.

### Parameterised Scenes

When branching paths share logic but differ in cleanup, extract the shared structure:

```typescript
function kissAttempt(farewell: Instruction): Instruction {
  return choice(
    branch('Let him', skillCheck('Flirtation', 30, successPath, seq(awkwardText, farewell))),
    branch('Turn away', rejectionText, farewell),
  )
}

gardenPath() → kissAttempt(gardenFarewell())
poolPath()   → kissAttempt(poolFarewell())
```

### Repeatable Menus

`menu()` loops until an `exit()` branch is chosen. Gate entries with `when()` -- conditions re-evaluate each display:

```typescript
menu(
  branch('Kiss him', random('The kiss is slow...', 'He cups your face...')),
  branch('Have a drink', run('consumeAlcohol', { amount: 20 })),
  when(hasStat('Arousal', 50), exit('Things escalate...', escalationContent)),
  exit('Call it a night', 'You tell him you should go.'),
)
```

## Exemplar: Hotel Bar Patron

`src/story/Hotel.ts` demonstrates most features working together in a complete random event:

- **Random trigger**: `onWait` with 20% chance per chunk
- **Anonymous NPC**: varied descriptions via `random()`
- **Branching**: `scenes()` → `choice()` → `branch()` with nested `scenes()`
- **Skill gating**: `gatedBranch(hasStat('Flirtation', 1), ...)`
- **Repeatable menus**: garden/pool/room use `menu()` with `branch()` + `exit()`
- **Costume changes**: pool path with `saveOutfit`/`changeOutfit`/`wearOutfit`
- **Parameterised farewell**: `patronKissAttempt(farewell)` with path-specific cleanup
- **NPC-initiates escalation**: patron leans in, player responds

## Key Source Files

| File | Purpose |
|------|---------|
| `src/story/World.ts` | Central import point (dependency order) |
| `src/model/ScriptDSL.ts` | DSL helper functions |
| `src/model/Scripts.ts` | Core scripts and registry |
| `src/story/Hotel.ts` | Exemplar: random events, branching, menus |
| `src/story/items/` | Item and clothing definitions |
