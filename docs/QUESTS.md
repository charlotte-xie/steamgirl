# Quest System

Quests are cards with `type: 'Quest'` that represent player objectives. They track progress, display reminders, and resolve into completed or failed states. Quests are built on the [Card System](./CARDS.md) and share its lifecycle hooks, custom properties, and serialisation.

## Quest Lifecycle

```
Added → Active → Completed / Failed
```

1. **Added** -- `game.addQuest('quest-id')` creates a Quest card on the player. By default this shows a message; pass `{ silent: true }` to suppress it.
2. **Active** -- the quest's `afterUpdate` hook runs after every player action to check completion conditions. The quest may also respond to time via `onTime`.
3. **Completed** -- `game.completeQuest('quest-id')` sets `quest.completed = true` and shows a success message. The card stays on the player for display.
4. **Failed** -- set `quest.failed = true` directly in a hook. The card stays on the player with a failed badge.

Completed and failed quests remain on the player. They are never removed -- this lets the quests screen show full history.

## Quest Definition

A quest is a standard `CardDefinition` with `type: 'Quest'`:

```typescript
const findLodgingsQuest: CardDefinition = {
  name: 'Find Lodgings',
  description: 'Check into your lodgings in the backstreets.',
  type: 'Quest',
  afterUpdate: (game: Game) => {
    if (game.currentLocation === 'bedroom') {
      game.completeQuest('find-lodgings')
    }
  },
  reminders: (game: Game, card: Card): Reminder[] => {
    if (card.completed || card.failed) return []
    return [{ text: 'Find your lodgings in the backstreets', urgency: 'info', cardId: card.id }]
  },
}

registerCardDefinition('find-lodgings', findLodgingsQuest)
```

Key hooks for quests:

| Hook | Purpose |
|------|---------|
| `afterUpdate` | Check completion/failure conditions after each action |
| `reminders` | Return time-sensitive notifications for the reminders panel |
| `onTime` | React to time passage (e.g. deadlines, countdowns) |

## Custom Properties

Quest cards carry arbitrary instance properties that serialise automatically. Common patterns:

| Property | Usage |
|----------|-------|
| `completed` | Set by `completeQuest()` -- quest achieved |
| `failed` | Set directly -- quest can no longer be completed |
| `attended` | Lesson attendance counter (see [LESSONS.md](./LESSONS.md)) |
| `inLesson` | Flag to suppress reminders while in a lesson |

Properties are accessed with `as` casts since card instances use `[key: string]: unknown`:

```typescript
quest.attended = ((quest.attended as number) ?? 0) + 1
```

## Reminders

The `reminders` hook is a general card capability (see [CARDS.md](./CARDS.md)) -- any card type can provide reminders. Quests are the most common user. The hook returns an array of `Reminder` objects displayed in the reminders panel:

```typescript
interface Reminder {
  text: string
  urgency: 'info' | 'warning' | 'urgent'
  cardId?: string
}
```

Urgency levels control visual styling:

| Urgency | When to use | Example |
|---------|-------------|---------|
| `info` | General awareness, no time pressure | "Find your lodgings in the backstreets" |
| `warning` | Upcoming deadline, player should act soon | "University induction at 8am today!" |
| `urgent` | Immediate action needed, player is late | "Late for Basic Aetherics!" |

The `Game.reminders` getter collects reminders from all active cards each frame. The `RemindersPanel` component renders them sorted by urgency.

### Reminder Patterns

**Static reminder** -- always shown while the quest is active:

```typescript
reminders: (_game: Game, card: Card): Reminder[] => {
  if (card.completed || card.failed) return []
  return [{ text: 'Find your lodgings', urgency: 'info', cardId: card.id }]
},
```

**Time-sensitive reminder** -- escalates urgency as a deadline approaches:

```typescript
reminders: (game: Game, card: Card): Reminder[] => {
  if (card.completed || card.failed) return []
  const hour = game.hourOfDay
  if (hour < 8) return [{ text: 'Induction at 8am', urgency: 'warning', cardId: card.id }]
  if (hour < 10) return [{ text: 'Induction now!', urgency: 'urgent', cardId: card.id }]
  return []
},
```

**Conditional suppression** -- hide reminders in certain states:

```typescript
reminders: (game: Game, card: Card): Reminder[] => {
  if (card.completed || card.failed) return []
  if (card.inLesson) return [] // don't nag while attending
  // ...
},
```

Reminders should always return `[]` for completed or failed quests.

## Adding and Completing Quests

### From Scripts

```typescript
// Imperative
game.addQuest('find-lodgings')
game.addQuest('attend-university', { silent: true })
game.completeQuest('find-lodgings')

// DSL
addQuest('find-lodgings')
completeQuest('find-lodgings')
```

### Completion via afterUpdate

Most quests complete themselves by checking game state in `afterUpdate`:

```typescript
afterUpdate: (game: Game) => {
  if (game.currentLocation === 'bedroom') {
    game.completeQuest('find-lodgings')
  }
}
```

### Failure

There is no `failQuest()` helper -- set `quest.failed = true` directly and add a failure message:

```typescript
afterUpdate: (game: Game) => {
  const quest = game.player.cards.find(c => c.id === 'attend-university')
  if (!quest || quest.completed || quest.failed) return
  if (game.date >= deadline) {
    quest.failed = true
    game.add({ type: 'text', text: 'You missed the induction.', color: '#ef4444' })
  }
}
```

## Predicates

Use predicates in conditions or branching logic:

```typescript
// In script conditions
hasCard('find-lodgings')          // true if player has this quest (any state)
cardCompleted('find-lodgings')    // true if quest exists and completed === true
```

## Current Quests

| ID | Name | Defined in | Completion |
|----|------|-----------|------------|
| `find-lodgings` | Find Lodgings | `Start.ts` | Reach the bedroom location |
| `attend-university` | Attend University | `Start.ts` | Complete induction by 10am Jan 6; fails if missed |
| `lesson-basic-aetherics` | Basic Aetherics | `Lessons.ts` | Attend 3 lectures |
| `lesson-basic-mechanics` | Basic Mechanics | `Lessons.ts` | Attend 3 lectures |

Lesson quests are a specialised subset with their own timetable, attendance tracking, and phase system. See [LESSONS.md](./LESSONS.md) for details.

## Key Source Files

| File | Contents |
|------|----------|
| `src/model/Card.ts` | `Card` class, `CardDefinition`, `Reminder` interface, registry |
| `src/model/Game.ts` | `addQuest()`, `completeQuest()`, `reminders` getter |
| `src/story/Start.ts` | Find Lodgings and Attend University quest definitions |
| `src/story/school/Lessons.ts` | Lesson quest definitions, `lessonReminders` |
| `src/components/RemindersPanel.tsx` | Renders reminders in the UI |
