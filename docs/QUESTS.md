# Quest System

Quests are cards with `type: 'Quest'` that represent player objectives. They are built on the [Card System](./CARDS.md) and share its lifecycle hooks, custom properties, and serialisation.

## Quest Lifecycle

```
Added → Active → Completed / Failed
```

1. **Added** -- `game.addQuest('quest-id')` creates a Quest card. Pass `{ silent: true }` to suppress the message.
2. **Active** -- the quest's `afterUpdate` hook checks completion conditions after every action. `onTime` handles time-based logic.
3. **Completed** -- `game.completeQuest('quest-id')` sets `completed = true` and shows a success message.
4. **Failed** -- set `quest.failed = true` directly in a hook.

Completed and failed quests remain on the player for history display.

## Quest Definition

```typescript
registerCardDefinition('find-lodgings', {
  name: 'Find Lodgings',
  description: 'Check into your lodgings in the backstreets.',
  type: 'Quest',
  afterUpdate: (game: Game) => {
    if (game.currentLocation === 'bedroom') {
      game.completeQuest('find-lodgings')
    }
  },
  reminders: (_game: Game, card: Card): Reminder[] => {
    if (card.completed || card.failed) return []
    return [{ text: 'Find your lodgings in the backstreets', urgency: 'info', cardId: card.id }]
  },
})
```

For the `Reminder` interface, urgency levels, and reminder patterns, see [CARDS.md](./CARDS.md#reminders----time-sensitive-notifications).

## Custom Properties

Quest cards carry arbitrary instance properties that serialise automatically:

| Property | Usage |
|----------|-------|
| `completed` | Set by `completeQuest()` |
| `failed` | Set directly -- quest can no longer be completed |
| `attended` | Lesson attendance counter (see [LESSONS.md](./LESSONS.md)) |
| `inLesson` | Suppresses reminders while in a lesson |

## Failure

There is no `failQuest()` helper -- set `quest.failed = true` directly:

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

## Current Quests

| ID | Name | Defined in | Completion |
|----|------|-----------|------------|
| `find-lodgings` | Find Lodgings | `Start.ts` | Reach the bedroom location |
| `attend-university` | Attend University | `Start.ts` | Complete induction by 10am Jan 6; fails if missed |
| `lesson-basic-aetherics` | Basic Aetherics | `Lessons.ts` | Attend 3 lectures |
| `lesson-basic-mechanics` | Basic Mechanics | `Lessons.ts` | Attend 3 lectures |

Lesson quests have their own timetable and attendance system. See [LESSONS.md](./LESSONS.md).
