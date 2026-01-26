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
  npc: string         // NPC ID of the professor who teaches this lesson
  slots: LessonSlot[]
  startDate?: number  // Unix timestamp -- lesson not active before this
  endDate?: number    // Unix timestamp -- lesson not active after this
}
```

Each lesson lasts **1 hour 40 minutes** (100 minutes), computed from `LESSON_DURATION`. End hours are derived: `startHour + LESSON_DURATION / 60`. This leaves a 20-minute gap between back-to-back lessons on the same day.

Current timetable:

| Lesson | Professor | Monday | Tuesday | Wednesday | Thursday | Friday |
|--------|-----------|--------|---------|-----------|----------|--------|
| Basic Aetherics | Prof. Vael | 11:00--12:40 | | 9:00--10:40 | | 14:00--15:40 |
| Basic Mechanics | Prof. Greaves | 14:00--15:40 | 9:00--10:40 | | 11:00--12:40 | |

## Attending a Lesson

The `attendLesson` script is the entry point. It finds the next attendable lesson via `getNextLesson`, moves the player to the classroom, then branches:

### Early Arrival

If the player arrives before the lesson's `startHour`, they see a flavour paragraph and three choices:

- **Wait quietly** -- time advances to start, neutral flavour
- **Study your notes** -- time advances to start, study flavour
- **Chat with classmates** -- time advances to start, social flavour

All three advance time to the lesson start via `timeLapseUntil`, then call `lessonStart`.

### Lesson Phases

The lesson runs in **4 phases** of 25 minutes each (`PHASE_DURATION`). Each phase advances game time by 25 minutes and displays a random flavour paragraph from `LESSON_FLAVOUR`. The player clicks **Continue** to advance between phases.

1. **Introduction** (`lessonStart`) -- the lecturer arrives and sets the tone
2. **Theory** (`lessonPhase2`) -- explanations, diagrams, demonstrations
3. **Practice** (`lessonPhase3`) -- hands-on work, exercises, experiments
4. **Conclusion** (`lessonPhase4`) -- wrap-up, attendance incremented

Phase scripts pass a `{ lessonId, lessonName, startHour, npcId }` params object through the chain. Each phase looks up `LESSON_FLAVOUR[lessonId]` for lesson-specific text; unknown lessons get generic fallback text.

### Flavour Text

`LESSON_FLAVOUR` is a `Record<string, LessonFlavour>` keyed by lesson card ID. Each entry has:

- `intro: string[]` -- random pick for phase 1
- `middle: string[][]` -- `middle[0]` for phase 2, `middle[1]` for phase 3
- `conclusion: string[]` -- random pick for phase 4

Adding flavour for a new lesson is optional; phases fall back to generic text.

### Professors

Each lesson has a `npc` field on its `LessonTiming` entry pointing to the professor NPC who teaches it. Professor definitions live in `src/story/school/Professors.ts`.

- **`lessonStart`** moves the professor to `'classroom'` when the lesson begins.
- **`endLesson`** runs the professor's `onMove` hook to release them back to their normal schedule.

Between lessons the professors follow a `followSchedule`-based `onMove` hook. By default they spend non-teaching weekday hours in the `'courtyard'` and are offscreen at weekends. This means the player might encounter them in the courtyard after a lesson ends and talk to them.

Classroom and courtyard `onArrive` hooks call `getNPC()` for all professors listed in `TIMETABLE` to ensure they are instantiated.

## Attendance and Completion

Each lesson quest card tracks an `attended` counter (custom card instance property). The `afterUpdate` hook checks whether `attended >= LESSONS_REQUIRED` (currently 3) and completes the quest if so.

Attendance is incremented at the end of phase 4 (`lessonPhase4`).

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

1. Add a timetable entry to `TIMETABLE`. Use `LESSON_DURATION / 60` for endHour:

```typescript
'lesson-advanced-aetherics': {
  name: 'Advanced Aetherics',
  npc: 'prof-lucienne-vael',
  slots: [
    { day: 2, startHour: 14, endHour: 14 + LESSON_DURATION / 60 }, // Tuesday 14:00--15:40
    { day: 4, startHour: 9, endHour: 9 + LESSON_DURATION / 60 },   // Thursday 9:00--10:40
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

3. (Optional) Add flavour text to `LESSON_FLAVOUR`:

```typescript
'lesson-advanced-aetherics': {
  intro: ['...', '...', '...'],
  middle: [
    ['...', '...', '...'],  // phase 2
    ['...', '...', '...'],  // phase 3
  ],
  conclusion: ['...', '...', '...'],
},
```

4. Register the professor NPC in `src/story/school/Professors.ts` (or reuse an existing one). The professor's `onMove` should use `buildProfessorSchedule()` to derive their classroom schedule from `TIMETABLE`. Import the module in `World.ts`.

The `enrollLessons` script iterates `Object.keys(TIMETABLE)`, so new entries are picked up automatically. Lessons without flavour text entries fall back to generic phase descriptions.

## Enrolment

The `enrollLessons` script iterates `TIMETABLE` keys and calls `game.addQuest(id)` for each. It is called:

- At the end of the university induction scene (`inductionComplete` in `School.ts`)
- During the "School Start" debug shortcut (`schoolStart` in `Start.ts`)
