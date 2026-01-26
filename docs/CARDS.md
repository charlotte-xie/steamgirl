# Card System

Cards are the primary mechanism for applying ongoing effects to the player. Every quest, status effect, and character trait is represented as a card attached to the player. Cards range from short-lived effects that expire over time to permanent traits that shape the entire playthrough.

## Card Types

```typescript
type CardType = 'Quest' | 'Effect' | 'Trait' | 'Task'
```

| Type | Purpose | Typical Lifespan |
|------|---------|-----------------|
| **Quest** | Objectives with completion/failure states | Medium -- active until completed or failed |
| **Effect** | Status effects that modify stats or behaviour | Short to medium -- often time-limited, self-removing |
| **Trait** | Fundamental character attributes or perks | Permanent -- set at game start or earned, last the whole game |
| **Task** | Tracked activities or assignments | Variable |

Trait and Task types are defined in the type system but not yet widely used in content. The architecture supports them for future expansion.

## Card Definition

A `CardDefinition` is the static template for a card, registered once and shared across all instances:

```typescript
interface CardDefinition {
  name: string
  description?: string
  image?: string
  type: CardType
  color?: string            // Display colour (used by Effect tags)

  // Lifecycle hooks
  calcStats?: (player: Player, card: Card, stats: Map<StatName, number>) => void
  afterUpdate?: Script      // Runs after each player action
  onTime?: (game: Game, card: Card, seconds: number) => void

  // Activation
  script?: Script           // Optional activation script
  condition?: Script        // Conditional check

  // Card relationships
  replaces?: CardId[]       // Cards removed when this card is added
  subsumedBy?: CardId[]     // This card is not added if any of these are present

  [key: string]: unknown    // Custom definition properties
}
```

### Registration

```typescript
registerCardDefinition('intoxicated', {
  name: 'Intoxicated',
  description: 'You feel lightheaded and giddy.',
  type: 'Effect',
  color: '#9333ea',
  calcStats: (player, card) => { /* ... */ },
  onTime: (game, card, seconds) => { /* ... */ },
})
```

Card definitions are registered in story modules and imported via `src/story/World.ts`.

## Card Instance

A `Card` instance is the mutable, per-player state. It stores the definition ID, the type, and any **custom properties** specific to that instance:

```typescript
class Card {
  id: CardId          // Links to the registered CardDefinition
  type: CardType
  [key: string]: unknown  // Custom instance properties
}
```

Custom properties are the key mechanism for per-instance state. For example, the Intoxicated effect stores an `alcohol` level that changes over time:

```typescript
game.addEffect('intoxicated', { alcohol: 60 })

// Later, in onTime:
card.alcohol = Math.max(0, currentAlcohol - reduction)
```

Quest cards use `completed` and `failed` boolean properties to track their state.

All custom properties are automatically serialised and restored on save/load.

## Lifecycle Hooks

Cards participate in the game loop through three hooks:

### `afterUpdate` -- Post-Action Hook

Runs after every player action (called from `Game.afterAction()`). Used by quests to check completion conditions:

```typescript
afterUpdate: (game: Game) => {
  if (game.currentLocation === 'bedroom') {
    game.completeQuest('find-lodgings')
  }
}
```

### `onTime` -- Time Advancement Hook

Runs whenever time advances (called from the `timeLapse` script). Receives the number of seconds elapsed. Used for effects that change or expire over time:

```typescript
onTime: (game: Game, card: Card, seconds: number) => {
  const ticks = game.calcTicks(seconds, 900) // Boundaries crossed per 15 min
  card.alcohol = Math.max(0, card.alcohol - ticks * 10)

  if (card.alcohol <= 0) {
    // Self-remove the effect
    const index = game.player.cards.findIndex(c => c.id === card.id)
    game.player.cards.splice(index, 1)
    game.run('calcStats', {})
  }
}
```

`game.calcTicks(secondsElapsed, interval)` returns the number of interval boundaries crossed, which is useful for effects that tick at regular intervals rather than every second.

### `calcStats` -- Stat Modification

Applies stat bonuses or penalties while the card is active. Called every time `player.calcStats()` runs. Works identically to the clothing system's `calcStats`:

```typescript
calcStats: (player: Player, card: Card) => {
  const alcohol = (card.alcohol as number) || 0
  if (alcohol < 100) player.modifyStat('Charm', 5)

  const agilityPenalty = Math.floor(alcohol / 10)
  if (agilityPenalty > 0) player.modifyStat('Agility', -agilityPenalty)
}
```

Modifiers are **transient** -- recalculated from scratch each time. The full calculation order is:

1. Copy `basestats` to `stats`
2. Apply `calcStats` from worn clothing items
3. Apply `calcStats` from active cards
4. Clamp all stats to 0--100

## Card Relationships

Card definitions can declare relationships that control how cards interact when added:

### `replaces` -- Automatic Removal

When a card with `replaces` is added, any listed cards are removed from the player first. Use this for escalating severity chains where a stronger effect supersedes a weaker one.

### `subsumedBy` -- Preventing Redundant Adds

When a card with `subsumedBy` is added, it is silently skipped if the player already has any of the listed cards. Use this to prevent weaker effects from being added when a stronger one is already active.

Together these two properties create clean escalation chains. For example, the hunger effects form:

```
Peckish → Hungry → Starving
```

- **Peckish**: `subsumedBy: ['hungry', 'starving']`
- **Hungry**: `replaces: ['peckish']`, `subsumedBy: ['starving']`
- **Starving**: `replaces: ['peckish', 'hungry']`

This means:
- Adding Hungry automatically removes Peckish
- Adding Starving automatically removes Peckish or Hungry
- Adding Peckish while Hungry or Starving is active does nothing

### `allowMultiple` -- Stacking Instances

By default, cards are self-subsuming: adding a card that the player already has is a no-op. Set `allowMultiple: true` to allow multiple instances of the same card definition to coexist on the player.

### `addCard` -- Underlying Mechanism

Both `addQuest` and `addEffect` delegate to `game.addCard(cardId, type, args)`, which handles duplicate detection (respecting `allowMultiple`), `subsumedBy` checks, and `replaces` removal. It returns `true` if the card was added, `false` if skipped.

## Adding and Removing Cards

### Game API

```typescript
// Low-level (handles replaces/subsumedBy)
game.addCard('hungry', 'Effect', { ... })          // Returns true/false

// Quests (delegates to addCard, shows message)
game.addQuest('find-lodgings')                     // Adds quest, shows message
game.addQuest('quest-id', { silent: true })         // Adds without message
game.addQuest('quest-id', { customProp: value })    // Adds with custom properties
game.completeQuest('find-lodgings')                 // Sets completed = true

// Effects (delegates to addCard, shows message, recalculates stats)
game.addEffect('intoxicated', { alcohol: 60 })      // Adds effect with properties
```

All methods prevent duplicates -- calling `addQuest` for an existing quest ID is a no-op. `addEffect` recalculates stats immediately after adding.

All methods return `this` for fluent chaining (except `addCard` which returns a boolean).

### DSL Helpers

For use in declarative script instructions (see [SCRIPTING.md](./SCRIPTING.md)):

```typescript
addQuest('find-lodgings')
addQuest('quest-id', { silent: true })
completeQuest('find-lodgings')
addEffect('intoxicated', { alcohol: 60 })
```

### Predicates

```typescript
hasCard('quest-id')        // True if player has this card (any type)
cardCompleted('quest-id')  // True if card exists and completed === true
```

### Removal

Effects typically remove themselves in their `onTime` hook when their condition expires. There is no dedicated `removeCard` API -- effects splice themselves out of `game.player.cards` directly:

```typescript
const index = game.player.cards.findIndex(c => c.id === card.id && c.type === 'Effect')
if (index !== -1) {
  game.player.cards.splice(index, 1)
  game.run('calcStats', {})  // Recalculate stats after removal
}
```

Quest cards are not removed when completed -- they remain with `completed: true` (or `failed: true`) so they continue to display on the quests screen.

## Quest States

Quests use custom properties for tracking:

| Property | Meaning |
|----------|---------|
| `completed` | Quest objective achieved |
| `failed` | Quest can no longer be completed |
| *(neither)* | Quest is ongoing |

The `afterUpdate` hook typically checks game state each action and sets these flags. The UI displays quests with colour-coded status (blue for ongoing, green for completed, red for failed).

## UI Display

Cards appear in two places:

- **Character screen**: Full card display with image, name, description, and status. Effect card titles render in the effect's `color`. Quest cards show their status badge.
- **Avatar overlay**: Active effects display as compact `EffectTag` components, coloured with the effect's `color` property.

## Serialisation

Only mutable instance state is saved:

```typescript
interface CardData {
  id?: CardId
  type?: CardType
  [key: string]: unknown  // All custom properties (alcohol, completed, failed, etc.)
}
```

The definition (name, description, hooks, calcStats) comes from the registered template on load. This means card definitions can be updated without invalidating saves -- only the instance data needs to be compatible.

Deserialisation is fault-tolerant: cards with missing definitions are logged and skipped rather than crashing the load.

## Example: Intoxicated Effect

A complete example showing all card features working together:

```typescript
// Definition with all hooks
const intoxicatedEffect: CardDefinition = {
  name: 'Intoxicated',
  description: 'You feel lightheaded and giddy from the wine.',
  type: 'Effect',
  color: '#9333ea',

  // Tick down alcohol over time, self-remove when depleted
  onTime: (game, card, seconds) => {
    const ticks = game.calcTicks(seconds, 900)
    const reduction = ticks * 10
    if (reduction > 0) {
      card.alcohol = Math.max(0, (card.alcohol as number) - reduction)
      if (card.alcohol <= 0) {
        // Self-remove
        const i = game.player.cards.findIndex(c => c.id === card.id)
        if (i !== -1) game.player.cards.splice(i, 1)
      }
      game.run('calcStats', {})
    }
  },

  // Dynamic stat modifiers based on alcohol level
  calcStats: (player, card) => {
    const alcohol = (card.alcohol as number) || 0
    if (alcohol < 100) player.modifyStat('Charm', 5)
    player.modifyStat('Agility', -Math.floor(alcohol / 10))
    if (alcohol >= 60) player.modifyStat('Wits', -Math.floor((alcohol - 60) / 20) - 1)
  },
}

registerCardDefinition('intoxicated', intoxicatedEffect)

// Helper to add/stack alcohol
function consumeAlcohol(game: Game, amount: number) {
  const existing = game.player.cards.find(c => c.id === 'intoxicated')
  if (existing) {
    existing.alcohol = ((existing.alcohol as number) || 0) + amount
  } else {
    game.addEffect('intoxicated', { alcohol: amount })
  }
}
```

## Key Source Files

| File | Contents |
|------|----------|
| `src/model/Card.ts` | `Card` class, `CardDefinition`, registry |
| `src/model/Game.ts` | `addCard()`, `addQuest()`, `completeQuest()`, `addEffect()`, `afterAction()` |
| `src/model/Player.ts` | `player.cards` array, `calcStats()` integration |
| `src/model/Scripts.ts` | `timeLapse` (calls `onTime`), card predicates |
| `src/model/ScriptDSL.ts` | DSL helpers (`addQuest`, `addEffect`, `hasCard`, etc.) |
| `src/story/Effects.ts` | Effect definitions (Intoxicated, Sleepy, Peckish, Hungry, Starving) |
| `src/story/Start.ts` | Quest definitions (Find Lodgings, Attend University) |
| `src/components/Card.tsx` | Card display component |
| `src/components/EffectTag.tsx` | Compact effect tag for avatar overlay |
