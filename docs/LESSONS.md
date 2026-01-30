# Lesson System

Lessons are university courses represented as Quest cards. Each lesson has a fixed weekly timetable, a declarative scene DSL body, and tracks attendance. The player completes a lesson by attending enough sessions.

## Structure

Lessons live in `src/story/school/Lessons.ts` with three independent parts:

1. **Timetable** -- scheduling data (weekly slots, professor NPC, optional date range)
2. **Quest cards** -- standard `CardDefinition` objects tracking attendance and providing reminders
3. **Lesson definitions** -- declarative DSL scripts describing what happens during a lesson

## Timetable

Each lesson maps to a `LessonTiming` entry keyed by quest card ID. Slots define day-of-week and start/end hours. All lessons last 100 minutes. Optional `startDate`/`endDate` fields restrict availability to a term.

| Lesson | Professor | Monday | Tuesday | Wednesday | Thursday | Friday |
|--------|-----------|--------|---------|-----------|----------|--------|
| Basic Aetherics | Prof. Vael | 11:00--12:40 | | 9:00--10:40 | | 14:00--15:40 |
| Basic Mechanics | Prof. Greaves | 14:00--15:40 | 9:00--10:40 | | 11:00--12:40 | |

## Lesson Definitions

Each lesson is defined as a `LessonDefinition` with two fields:

- **`body`** -- a `scenes(...)` of `lessonTime()` segments, the full lesson as a single DSL script
- **`lateArrival`** -- optional scolding scene shown when the player arrives late

### `lessonTime(minutes, ...content)`

The key DSL construct. Each segment declares a time threshold in minutes from lesson start:

```typescript
body: scenes(
  lessonTime(0,  random('The professor begins...', '...')),
  lessonTime(25, random('Theory continues...', '...')),
  lessonTime(50, random('Practical work...', '...')),
  lessonTime(75, random('The lecture concludes...', '...'), run('endLesson')),
)
```

`lessonTime` checks elapsed time against the quest card's `lessonStart` timestamp. If the threshold has already passed, the segment produces no content and `advanceScene` auto-skips to the next one. Otherwise it timelapses to the threshold and runs the content.

This means the same script works for all arrival times -- late arrivals run the same body, and elapsed segments are silently skipped.

### Professor speech

Use `say()` for professor dialogue so it renders with NPC speech formatting:

```typescript
lateArrival: random(
  seq('Professor Vael fixes you with a sharp look.', say('Do try to be punctual.')),
  seq('The class turns to watch as you slip in.', say('Late again? Sit down.')),
),
```

## Attending a Lesson

The `attendLesson` script finds the next attendable lesson and branches on arrival time:

- **Early** -- flavour text, a `choice()` of ways to wait (study, chat, wait quietly), then `lessonBegin` + body
- **On time** -- `lessonBegin` + body directly
- **Late** -- `lessonBegin`, scolding (`lateArrival` or generic fallback), then the same body (elapsed segments auto-skip)

### Quest card state

`lessonBegin` stores session context as custom properties on the quest card instance (auto-serialised):

- `inLesson` -- suppresses reminders and prevents double-attendance
- `lessonStart` -- scheduled start as unix timestamp, read by `lessonTime`
- `lastAttended` -- slot start timestamp, persists after lesson ends to suppress reminders and re-attendance for the same slot
- `startHour`, `npcId` -- read by `endLesson` for cleanup

`endLesson` reads these from the active card (found via `inLesson`), catches up time to the scheduled end, increments `attended`, and releases the professor.

### Auto-start

When the player is already in the classroom at lesson start, `lessonAutoStart` offers a "Start Lesson" button. This is triggered by classroom `onTime` hooks.

## Attendance and Completion

Each quest card tracks an `attended` counter. The `afterUpdate` hook checks `attended >= LESSONS_REQUIRED` (currently 3) and completes the quest.

## Reminders

The `lessonReminders` hook checks each slot on the current day:

- Skipped if `lastAttended >= slotStartTime` (already attended this slot)
- **Before start**: info urgency -- "Basic Aetherics at 11am"
- **During lesson window**: urgent -- "Late for Basic Aetherics!"
- **After end**: no reminder

Suppressed while `inLesson` is true, or if the quest is completed/failed.

## Professors

Each timetable entry has an `npc` field. Professor definitions live in `src/story/school/Professors.ts` with `followSchedule`-based movement. `lessonBegin` moves the professor to the classroom and sets the scene NPC (enabling `say()` formatting). `endLesson` runs the professor's `onMove` hook to release them.

## Adding a New Lesson

1. Add a timetable entry to `TIMETABLE`
2. Add a `CardDefinition` with `afterUpdate` attendance check and `reminders: lessonReminders`
3. Add a `LessonDefinition` to `LESSONS` with a `body` of `lessonTime()` segments
4. Register the card with `registerCardDefinition`
5. Register the professor NPC (or reuse an existing one)

The `enrollLessons` script iterates `TIMETABLE` keys, so new entries are enrolled automatically.
