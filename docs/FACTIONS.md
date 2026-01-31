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

### Gating Content

Use `hasReputation` in `cond()`, `when()`, and `gatedBranch()` to gate dialogue, scene branches, and options:

```typescript
// Different greeting based on reputation
cond(
  hasReputation('gangster', { min: 40 }),
  say('Evening, miss. Go right in.'),
  hasReputation('socialite', { min: 30 }),
  say('Your name\'s on the list. Enjoy your evening.'),
  say('And you are...?'),
)

// Reputation-gated entries in random pools
random(
  when(hasReputation('gangster', { min: 40 }),
    'Two men at the corner fall silent as you pass. One tips his cap.',
  ),
  'The street is quiet. Nothing catches your eye.',
)
```

### NPC Behaviour

NPCs should adjust tone and options based on faction reputation. Check reputation in `onApproach` and scripts:

```typescript
if (game.run(hasReputation('gangster', { min: 40 }))) {
  game.add('He straightens up. Word travels fast in Lowtown.')
  npc.say('What do you need?')
} else {
  npc.say('What do you want?')
}
```

Use reputation as a **bonus modifier** for NPC stat gains -- small (+1 to +3), capped, and `hidden: true`:

```typescript
g.run(addNpcStat('affection', 3, { max: 15 }))  // base gain
if (g.run(hasReputation('gangster', { min: 20 }))) {
  g.run(addNpcStat('respect', 2, { max: 40, hidden: true }))  // rep bonus
}
```

### Random Events

Use reputation checks in `onWait` hooks for ambient flavour (5--20% chance). Use `random()` with multiple texts for variety. Don't gate progression behind random reputation events.

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
