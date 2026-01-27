# Factions & Reputation

The faction system provides reputation-based gating for story content. Three factions represent the major social spheres of Aetheria, each with separate reputation tracks that measure different aspects of the player's standing.

Reputation makes gating simpler and more consistent: instead of scattered ad-hoc checks, content authors use a small set of DSL helpers (`hasReputation`, `addReputation`) that work the same way everywhere.

## Factions and Reputation Tracks

Each faction has multiple independent reputation scores, each ranging 0--100.
0      = Unknown
1-20   = Mostly unrecognised, easy to raise with related activities
21-40  = Minor reputation, modifies reactions etc.
41-60  = Moderate reputation, opportunities
61-80  = Major player, serious events
81-100 = Famous, endgame content

| Faction | Track | Description |
|---------|-------|-------------|
| **School** | `academic` | Scholarly standing at the university |
| | `social` | Popularity among fellow students |
| | `sporting` | Athletic reputation |
| **Lowtown** | `gangster` | Standing with the criminal underworld |
| | `bad-girl` | Reputation as a rule-breaker |
| | `junkie` | Notoriety in the substances scene |
| **High Society** | `socialite` | Visibility in fashionable society |
| | `entertainer` | Reputation as a performer and conversationalist |
| | `politics` | Influence in political circles |
| | `service` | Reputation for dutiful service |

Tracks are independent -- a player can have high `academic` and high `social` at the same time, or high `gangster` and high `socialite`. The combinations tell a story about the kind of person the player is becoming.

## Architecture

**Model layer** (`src/model/Faction.ts`): Generic mechanics -- types, registry, lookup functions. No hardcoded content.

**Story layer** (`src/story/Factions.ts`): Registers the three factions and their ten tracks. New factions or tracks can be added by calling `registerFaction()` / `registerReputation()` in any story module.

**Storage**: Reputation scores live on `Player.reputation: Map<string, number>`. Scores default to 0 (missing entries are treated as 0). Only non-zero values are serialised.

**NPC tagging**: NPC definitions have an optional `faction` field indicating which faction they belong to. This is informational -- actual gating uses `hasReputation()`.

```typescript
registerNPC('jonny-elric', {
  faction: 'lowtown',
  // ...
})
```

## DSL Helpers

### `addReputation(reputation, change, options?)`

Modify a reputation score. Shows coloured feedback text by default.

```typescript
addReputation('academic', 5)                          // +5 Academic
addReputation('gangster', 3, { hidden: true })        // silent
addReputation('social', 2, { max: 30, chance: 0.5 }) // 50% chance, capped at 30
```

Options: `hidden`, `max`, `min`, `chance` (0--1).

Default clamp is 0--100. Change is skipped if the actual change would be zero or the wrong sign (e.g. trying to add +5 when already at max).

### `hasReputation(reputation, options?)`

Predicate -- check a reputation score. Returns boolean.

```typescript
hasReputation('gangster')                  // true if gangster > 0
hasReputation('academic', { min: 30 })     // true if academic >= 30
hasReputation('junkie', { max: 20 })       // true if junkie <= 20
```

Defaults to `value > 0` when no min/max specified (same convention as `npcStat`).

## Usage Patterns

### 1. Flavour Text and Branching

Gate dialogue variations and scene branches on reputation. This is the simplest and most common use.

```typescript
// Different greeting based on reputation
cond(
  hasReputation('gangster', { min: 40 }),
  seq(
    'The bouncer steps aside without a word.',
    say('Evening, miss. Go right in.'),
  ),
  hasReputation('socialite', { min: 30 }),
  seq(
    'The bouncer checks the guest list and nods.',
    say('Your name\'s on the list. Enjoy your evening.'),
  ),
  // default
  seq(
    'The bouncer looks you up and down.',
    say('And you are...?'),
  ),
)
```

For random flavour text where some options are reputation-gated, use `random()` with `when()` entries. Only entries whose conditions pass join the pool; one is picked at random. Falsy entries are silently ignored (supports `&&` patterns).

```typescript
// Random flavour — some options gated by reputation
random(
  when(hasReputation('gangster', { min: 40 }),
    'A woman crosses the street to avoid you. You pretend not to notice.',
  ),
  when(hasReputation('gangster', { min: 40 }),
    'Two men at the corner fall silent as you pass. One tips his cap.',
  ),
  when(hasReputation('socialite', { min: 30 }),
    'A woman in a fine coat gives you a knowing nod as she passes.',
  ),
  npc.affection > 10 && say('He smiles at you as you walk by.'),
  'The street is quiet. Nothing catches your eye.',
  'You walk on, unremarked.',
)
```

If no conditions pass and no defaults are present, nothing happens. This makes `random` the go-to helper for ambient reputation-flavoured events.

```typescript
// Unlock a scene branch at a reputation threshold
gatedBranch(hasReputation('academic', { min: 50 }),
  'Quote the relevant theorem',
  'The professor raises an eyebrow, then smiles.',
  say('Well! Someone has been reading ahead.'),
  addNpcStat('affection', 3, { max: 20 }),
)
```

### 2. NPC Treatment Based on Faction

NPCs that share a faction with the player's reputation should adjust their behaviour. This is handled in the NPC's `onApproach` and `onGeneralChat` scripts using `hasReputation` checks.

```typescript
onApproach: (game: Game) => {
  const npc = game.npc

  if (game.run(hasReputation('gangster', { min: 40 }))) {
    // High gangster rep: this NPC treats you with wary deference
    game.add('He straightens up when he sees you. Word travels fast in Lowtown.')
    npc.say('Didn\'t realise you were... connected. What do you need?')
    npc.chat()
    return
  }

  // Standard approach
  game.add('He gives you a suspicious once-over.')
  npc.say('What do you want?')
  npc.chat()
}
```

For NPCs tagged with a faction, check the relevant tracks to decide tone, available options, and dialogue flavour. A Lowtown NPC might unlock jobs or information at `gangster >= 30`. A School NPC might offer tutoring at `academic >= 20`.

### 3. Modifying NPC Stat Gains

Reputation should influence how easily the player gains stats with specific NPCs. This is NPC-specific logic -- each NPC decides which reputations matter and how they affect gains.

The pattern: check reputation in the NPC's scripts and adjust `addNpcStat` calls accordingly.

```typescript
// Timmy Bug: gangster rep makes respect easier to gain
buySpice: (g: Game) => {
  const npc = g.npc
  // ... purchase logic ...

  // Base affection gain
  g.run(addNpcStat('affection', 3, { max: 15 }))

  // Gangster rep: Timmy respects your connections more easily
  if (g.run(hasReputation('gangster', { min: 20 }))) {
    g.run(addNpcStat('respect', 2, { max: 40, hidden: true }))
  }

  // Junkie rep: Timmy warms to a fellow user
  if (g.run(hasReputation('junkie', { min: 10 }))) {
    g.run(addNpcStat('affection', 2, { max: 25, hidden: true }))
  }
}
```

This keeps the logic local to each NPC -- different NPCs care about different reputations. Jonny might give bonus affection at high `gangster`. A professor might be harder to impress at high `bad-girl`. A socialite might respond to `entertainer`.

Guidelines:
- Use reputation as a **bonus modifier**, not as the only source of NPC stat gains. Reputation smooths the path; direct interactions still matter.
- Keep bonuses small (+1 to +3) and capped. Reputation should make things easier, not trivial.
- Use `hidden: true` for reputation-based bonus gains so the player doesn't see a flood of stat messages.

### 4. Random Event Triggers

Reputation can trigger random flavour events during waits and travel. Check reputation in `onWait` hooks (locations or NPCs) and `onArrive` hooks.

```typescript
// Location onWait: people react to your reputation
onWait: (g: Game) => {
  if (g.run(hasReputation('gangster', { min: 50 }))) {
    if (Math.random() < 0.15) {
      const events = [
        'A woman crosses the street to avoid you. You pretend not to notice.',
        'Two men at the corner fall silent as you pass. One tips his cap.',
        'A street vendor gives you an extra portion without being asked. You don\'t comment on it.',
      ]
      g.add(events[Math.floor(Math.random() * events.length)])
    }
  }

  if (g.run(hasReputation('socialite', { min: 40 }))) {
    if (Math.random() < 0.1) {
      const events = [
        'A woman in a fine coat gives you a knowing nod as she passes.',
        'A carriage slows beside you. The passenger peers out, then waves.',
      ]
      g.add(events[Math.floor(Math.random() * events.length)])
    }
  }
}
```

Guidelines:
- Keep random event probability low (5--20%) to avoid repetition.
- Use multiple flavour texts and pick randomly for variety.
- Don't gate critical content behind random reputation events -- they're flavour, not progression.
- Higher reputation thresholds should trigger more dramatic reactions.

## Earning Reputation

Reputation is earned through gameplay actions. Some examples:

| Action | Track | Gain |
|--------|-------|------|
| Attending a lesson | `academic` | +1--2 |
| Passing an exam | `academic` | +5--10 |
| Socialising at a party | `social` | +2--3 |
| Doing rounds with Jonny | `gangster` | +3--5 |
| Buying spice from Timmy | `junkie` | +1--2 |
| Attending a high society event | `socialite` | +2--5 |
| Performing at a venue | `entertainer` | +3--5 |

These are implemented as `addReputation` calls in the relevant scripts. Place them alongside the existing `addNpcStat` and `addStat` calls.

```typescript
// After completing a lesson
addReputation('academic', 2, { max: 60 })

// After buying spice
addReputation('junkie', 1, { max: 30, hidden: true })

// After a successful performance
addReputation('entertainer', 3, { max: 80 })
```

## Adding New Factions

Register new factions and tracks in a story module:

```typescript
import { registerFaction, registerReputation } from '../model/Faction'

registerFaction('guild', {
  name: 'Mechanics Guild',
  description: 'The engineers and inventors who keep Aetheria running.',
  reputations: ['inventor', 'craftsman'],
})

registerReputation('inventor', {
  name: 'Inventor',
  description: 'Your reputation as an innovative thinker.',
  faction: 'guild',
  gainColor: '#f97316',
  lossColor: '#ef4444',
})

registerReputation('craftsman', {
  name: 'Craftsman',
  description: 'Your skill and reliability as a builder.',
  faction: 'guild',
  gainColor: '#84cc16',
  lossColor: '#ef4444',
})
```

Then import the file in `World.ts` after `Factions.ts`. The system handles the rest -- `addReputation` and `hasReputation` work immediately with the new IDs.
