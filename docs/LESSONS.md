# Lesson System

Lessons are university courses represented as Quest cards. Each lesson has a fixed weekly timetable and tracks attendance. The player completes a lesson by attending enough sessions.

## Architecture

Lessons live in `src/story/school/Lessons.ts`. The file has two independent parts:

1. **Timetable** -- a `TIMETABLE` map (`Record<string, LessonTiming>`) keyed by card ID. Contains scheduling data: weekly slots, display name, and optional start/end dates. This is pure data with no dependency on the card definitions.
2. **Card definitions** -- standard `CardDefinition` objects for each lesson quest. They reference the timetable indirectly via `lessonReminders`, which looks up the card's ID in `TIMETABLE` at call time.

This separation means the timetable can be changed (different terms, rescheduled lectures) without touching card definitions, and vice versa.

## Timetable Structure

```typescript
interface LessonSlot {
  day: number       // 0=Sun, 1=Mon, ..., 6=Sat
  startHour: number // 24-hour integer, e.g. 11
  endHour: number   // 24-hour integer, e.g. 13
}

interface LessonTiming {
  name: string        // Display name for reminders
  slots: LessonSlot[]
  startDate?: number  // Unix timestamp -- lesson not active before this
  endDate?: number    // Unix timestamp -- lesson not active after this
}
```

Current timetable:

| Lesson | Monday | Tuesday | Wednesday | Thursday | Friday |
|--------|--------|---------|-----------|----------|--------|
| Basic Aetherics | 11--13 | | 9--11 | | 14--16 |
| Basic Mechanics | 14--16 | 9--11 | | 11--13 | |

## Attendance and Completion

Each lesson quest card tracks an `attended` counter (custom card instance property). The `afterUpdate` hook checks whether `attended >= LESSONS_REQUIRED` (currently 3) and completes the quest if so.

Attendance is incremented by activity scripts (e.g. "Attend lecture" activity at the classroom) -- not yet implemented.

## Reminders

Reminders use the generic `reminders` hook on `CardDefinition` (see [CARDS.md](./CARDS.md)). The hook receives the current `Game` and `Card` and returns an array of `Reminder` objects:

```typescript
interface Reminder {
  text: string
  urgency: 'info' | 'warning' | 'urgent'
  cardId?: string
}
```

The `lessonReminders` function looks up the card's ID in `TIMETABLE` at call time. If the lesson has no entry, is outside its date range, or has no slots today, it returns nothing. Otherwise:

- **Before the lesson starts**: `"Basic Aetherics at 11am"` (urgency: `info`)
- **During the lesson window**: `"Late for Basic Aetherics!"` (urgency: `urgent`)
- **After the lesson ends**: no reminder

Completed or failed quests produce no reminders.

The `reminders` hook is generic -- any card type can implement it for meetings, events, deadlines, or other time-sensitive notifications.

## Adding a New Lesson

1. Add a timetable entry to `TIMETABLE`:

```typescript
'lesson-advanced-aetherics': {
  name: 'Advanced Aetherics',
  slots: [
    { day: 2, startHour: 14, endHour: 16 }, // Tuesday
    { day: 4, startHour: 9, endHour: 11 },  // Thursday
  ],
},
```

2. Add a card definition and register it:

```typescript
const advancedAethericsLesson: CardDefinition = {
  name: 'Advanced Aetherics',
  description: `Attend ${LESSONS_REQUIRED} Advanced Aetherics lectures to complete the course.`,
  type: 'Quest',
  afterUpdate: (game: Game) => { /* attendance check */ },
  reminders: lessonReminders,
}

registerCardDefinition('lesson-advanced-aetherics', advancedAethericsLesson)
```

The `enrollLessons` script iterates `Object.keys(TIMETABLE)`, so new entries are picked up automatically.

## Enrolment

The `enrollLessons` script iterates `TIMETABLE` keys and calls `game.addQuest(id)` for each. It is called:

- At the end of the university induction scene (`inductionComplete` in `School.ts`)
- During the "School Start" debug shortcut (`schoolStart` in `Start.ts`)
