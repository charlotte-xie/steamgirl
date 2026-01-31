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

### Context awareness

Gate or branch based on game context, e.g. time of day if necessary to ensure content is appropriate to the context. This is especially important for interactions that could happen at any time (random encounters etc.)

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

### Text Interpolation

Use `{expression}` in strings to insert dynamic content. Interpolation works in both `text()` and `say()`:

```typescript
// Player name (coloured)
text('{pc} steps forward.')
say('Welcome, {pc}.')

// NPC name and pronouns
text('{npc} looks up. {npc:He} seems tired.')
say('Ask {npc:him} yourself.')

// Specific NPC by ID (when scene NPC is someone else)
text('{npc(barkeeper)} waves from across the room.')

// NPC faction
text('{npc:faction} loyalties run deep here.')
```

Use `{{` and `}}` for literal braces. Unknown expressions show as red error text so mistakes are easy to spot.

Prefer interpolation over DSL helpers like `playerName()` and `npcName()` — it's more readable and supports pronouns, factions, and NPC-local scripts:

```typescript
// Before
text('You catch ', npcName(), '\'s eye.')

// After
text('You catch {npc}\'s eye. {npc:He} smiles.')
```

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

### NPCs That Change Over Time

The same interaction should feel different depending on where the relationship stands. An NPC who has slept with the player shouldn't still be fumbling and shy. An NPC whose affection is cratering shouldn't greet the player with the same warmth as before.

Use `cond()` for structural forks — entirely different paths based on relationship milestones. Use `when()` inside `random()` for graduated flavour that blends in alongside normal variants without replacing them.

The key insight: **don't rewrite the whole scene for each state**. Layer conditional entries into existing random pools. A low-affection greeting should appear *sometimes*, mixed in with normal greetings, so the player notices the shift without being beaten over the head with it.

Escalate gradually across thresholds. Subtle distance at first, then open hurt, then desperation. The player should feel the relationship cooling before anything dramatic happens.

### Skill Checks as Story Tools

Skill checks aren't just pass/fail gates — they shape how the player navigates relationships. A high-Charm player can turn someone down gently and keep the peace. A perceptive player notices the scratch on someone's hand, the shadows under their eyes, the coat buttoned wrong — and earns trust for paying attention.

This means skill checks should feel like *being a person*, not gaming a stat. Charm is kindness and tact. Perception is attentiveness. The narrative should read naturally whether the check succeeds or fails — the failure isn't "you fail to be charming", it's "you don't find the right words" or "you don't notice".

For romance arcs, skill checks become the lever that makes high affection achievable. Without them, the player hits a ceiling. With them, the player can push higher — but only by investing in the right skills, which means making choices elsewhere. This is the tension that drives storyline trade-offs.

### NPC-Initiated Escalation

Sometimes the NPC acts and the player must respond. A kiss that turns urgent. A confession that demands an answer. A sudden mood shift. Use `replaceScene()` to clear the current options and force a direct response — the player can't browse a menu while someone is asking them to come to bed.

Use this sparingly. Most interactions should leave the player in control. But the moments where the NPC takes initiative — and the player has to decide *right now* — are what make relationships feel alive rather than transactional.

## Exemplars

### Hotel Bar Patron

`src/story/Hotel.ts` demonstrates most features working together in a complete random event:

- **Random trigger**: `onWait` with 20% chance per chunk
- **Anonymous NPC**: varied descriptions via `random()`
- **Branching**: `scenes()` → `choice()` → `branch()` with nested `scenes()`
- **Skill gating**: `gatedBranch(hasStat('Flirtation', 1), ...)`
- **Repeatable menus**: garden/pool/room use `menu()` with `branch()` + `exit()`
- **Costume changes**: pool path with `saveOutfit`/`changeOutfit`/`wearOutfit`
- **Parameterised farewell**: `patronKissAttempt(farewell)` with path-specific cleanup
- **NPC-initiates escalation**: patron leans in, player responds

### Rob Hayes — Long-Running Romance

`src/story/npc/Rob.ts` demonstrates how a persistent NPC relationship evolves across multiple milestones:

- **Behaviour that changes with history**: Post-intimacy Rob is confident where pre-intimacy Rob was shy — `cond(npcStat('madeLove'), ...)` forks narration throughout
- **Graduated relationship warnings**: Low-affection flavour mixed into `random()` blocks at escalating thresholds, so the player feels the relationship cooling
- **Skill checks shaping relationships**: Charm softens rejection penalties, Perception earns bonus affection — both feel like natural character traits rather than stat manipulation
- **NPC-initiated escalation**: `replaceScene()` for moments where Rob acts and the player must respond directly
- **Permanent consequences**: `brokeUp` stat prevents re-proposal after breakup — some doors close for good

## Key Source Files

| File | Purpose |
|------|---------|
| `src/story/World.ts` | Central import point (dependency order) |
| `src/model/ScriptDSL.ts` | DSL helper functions |
| `src/model/Scripts.ts` | Core scripts and registry |
| `src/story/Hotel.ts` | Exemplar: random events, branching, menus |
| `src/story/items/` | Item and clothing definitions |
