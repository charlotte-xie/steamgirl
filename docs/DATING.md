# Dating System

The dating system provides a reusable mechanic for NPC dates. It builds on the [Card System](./CARDS.md) with a dedicated `Date` card type and a registry of NPC-specific date plans.

## Overview

A date follows this lifecycle:

1. **Invitation** -- An NPC invites the player (typically during a flirt interaction). The player can accept or decline.
2. **Card Created** -- Accepting creates a `Date` card with the meeting time, location, and NPC reference. Reminders escalate as the time approaches.
3. **Meeting** -- The NPC moves to the meeting location at the arranged time and waits (default 2 hours). If the player arrives, the NPC greets them with Cancel/Go options. If the player doesn't show, a no-show penalty fires.
4. **Date Scene** -- The date itself is an arbitrary `Script` -- typically a `scenes()` sequence with branching, skill checks, and player choices.
5. **Completion** -- The date ends with an affection bonus and card cleanup.

## Architecture

### DatePlan

Each NPC registers a `DatePlan` that defines all NPC-specific content:

```typescript
interface DatePlan {
  npcId: string              // NPC registry ID (e.g. 'tour-guide')
  npcDisplayName: string     // For reminder text (e.g. 'Rob')
  meetLocation: string       // Location ID for the meeting point
  meetLocationName: string   // For reminder text (e.g. 'the City Centre')
  waitMinutes?: number       // How long the NPC waits (default 120)

  dateScene: Script          // The date itself -- any Script

  // Optional lifecycle overrides (all Script type)
  onGreeting?: Script        // NPC greets player at meeting point
  onCancel?: Script          // Player cancels at the meeting point
  onNoShow?: Script          // Player doesn't show up
  onComplete?: Script        // Date finishes successfully
}
```

All behaviour fields are `Script` -- they can be imperative functions, DSL instructions, or registered script names. This makes the system fully DSL-scriptable.

### Script Builders

`Dating.ts` exports factory functions that produce sensible default scripts:

| Builder | Purpose | Key Parameters |
|---------|---------|----------------|
| `standardGreeting(greeting?)` | NPC says hello, offers Cancel/Go options | Custom greeting text |
| `standardCancel(response?, penalty?)` | Affection penalty, card removed | Response text, penalty amount (default 20) |
| `standardNoShow(name, narration?, penalty?)` | No-show narration, affection penalty | NPC name, narration text, penalty (default 15) |
| `standardComplete(bonus?)` | Affection bonus, card removed | Bonus amount (default 15) |
| `endDate()` | DSL instruction to end the date successfully | *(none -- NPC auto-detected from card)* |
| `branch(label, ...instructions)` | Player choice that continues the scene sequence | Label + inline instructions for a single branch scene |
| `branch(label, scenes)` | Multi-scene player choice | Label + `Instruction[][]` for multi-scene branches |

`endDate()` is a convenience DSL builder that produces the `dateComplete` instruction. It automatically resolves the NPC from the active date card, so date scenes can be NPC-independent. Use it as the last instruction in a date scene.

Use the script builders as defaults or override with fully custom scripts:

```typescript
registerDatePlan({
  npcId: 'tour-guide',
  // ... use builders for standard behaviour:
  onGreeting: standardGreeting('"You came! Shall we?"'),
  onCancel: standardCancel('"Oh. Maybe another time."', 20),
  // ... or use a fully custom script:
  onComplete: (game: Game) => {
    // Custom completion logic
  },
})
```

### Date Card

The `date` card stores per-instance state:

| Property | Type | Purpose |
|----------|------|---------|
| `npc` | string | NPC ID for lookup in the date plan registry |
| `meetTime` | number | Unix seconds for the meeting time |
| `meetLocation` | string | Location ID for the meeting point |
| `dateStarted` | boolean | Set to `true` when the NPC greets the player |
| `completed` | boolean | Set on successful completion |
| `failed` | boolean | Set on no-show |

The card definition provides escalating reminders:

- **Before the day**: "Date with Rob tomorrow at 6pm" (info)
- **On the day, before meeting time**: "Meet Rob in the City Centre at 6pm today" (info)
- **During the wait window**: "Rob is waiting for you in the City Centre!" (urgent)

The `afterUpdate` hook detects no-shows: if `game.time` passes the deadline (meetTime + waitMinutes), it runs the `onNoShow` script.

### Lifecycle Scripts

Four global scripts handle the date lifecycle, registered by `Dating.ts`:

| Script | Trigger | Action |
|--------|---------|--------|
| `dateApproach` | Player arrives at meeting location | Sets `dateStarted = true`, runs `onGreeting` |
| `dateCancel` | Player chooses Cancel | Runs `onCancel` (affection penalty, cleanup) |
| `dateStart` | Player chooses Go | Runs `dateScene` |
| `dateComplete` | Date scene ends successfully | Runs `onComplete` (affection bonus, cleanup) |

### NPC Integration

NPCs need three hooks to support dates:

- **`onMove`** -- During the date window, move to the meeting location instead of following the normal schedule.
- **`onWait`** -- If the player is waiting at the meeting location during the date window, trigger `dateApproach`.
- **`onApproach`** -- If the player clicks the NPC at the meeting location during the date window, trigger `dateApproach`.

## Writing Date Scenes

### Linear Dates

The simplest date is a linear `scenes()` sequence:

```typescript
dateScene: scenes(
  [move('lake', 15), say('"Here we are!"')],
  [text('You enjoy the view.'), say('"Lovely, isn\'t it?"')],
  [say('"I had a wonderful time."'), endDate()],
)
```

Each array is one scene. `scenes()` adds automatic Continue buttons between them. The last scene should call `dateComplete` to trigger the completion script.

### Branching with Player Choices

Add options within a scene to let the player choose a path. When a scene contains options, `scenes()` does *not* add an automatic Continue -- the player's choice drives progression.

```typescript
scenes(
  // Scene 1: Set-up
  [say('"Shall we go to the lake or the pier?"')],
  // Scene 2: Player chooses
  [
    branch('The lake', [
      [move('lake', 10), say('"The lake is beautiful tonight."')],
      [say('"Glad we came here."'), endDate()],
    ]),
    branch('The pier', [
      [move('pier', 10), say('"I love the pier at night."')],
      [say('"What a view."'), endDate()],
    ]),
  ],
)
```

`branch(label, scenes)` hands control to the scenes engine with a different sequence of scenes depending on the player's choice. If there are scenes after the branching scene, the engine automatically continues to them after the branch finishes.

### Branching with Conditions

Use `cond()` inside a scene to gate content on stats, items, or affection:

```typescript
scenes(
  [
    say('"That was lovely."'),
    // Only attempt a kiss if affection is high enough
    cond(
      npcStat('my-npc', 'affection', 40),
      seq(
        say('"May I... may I kiss you?"'),
        branch('Kiss him', text('You share a gentle kiss.'), addNpcStat('affection', 5, 'my-npc')),
        branch('Not yet', say('"Of course. No rush."')),
      ),
      // Default: too early for a kiss
      say('"I had a really lovely time tonight."'),
    ),
  ],
)
```

### Skill Check Gates

Use `skillCheck()` to gate special events on player ability:

```typescript
// As a predicate in cond()
cond(
  skillCheck('Perception', 10),
  seq(
    text('You notice a shooting star streak across the sky.'),
    say('"Did you see that? Make a wish!"'),
  ),
  text('The stars are beautiful tonight.'),
)

// With inline callbacks
skillCheck('Charm', 15,
  [say('"You always know just what to say."'), addNpcStat('affection', 3, 'my-npc')],
  [text('You stumble over your words, but he smiles anyway.')],
)
```

### Intimacy Choices

A common pattern is offering the player a choice between showing more intimacy or holding back:

```typescript
[
  text('He moves a little closer on the bench.'),
  branch('Lean against him',
    text('You lean against his shoulder. He tenses for a moment, then relaxes.'),
    addNpcStat('affection', 3, 'my-npc'),
    say('"This is nice."'),
  ),
  branch('Stay where you are',
    text('You keep a comfortable distance. He glances at you and smiles.'),
    say('"It\'s peaceful here, isn\'t it?"'),
  ),
]
```

### Exiting to Common Scripts

A date scene can break out to any common script -- NPC interact scripts, shared mechanics, or custom functions:

```typescript
// Run an NPC interaction script mid-date
[
  say('"Want to grab a drink from that stall?"'),
  option('Sure', 'interact', { script: 'buyDrink' }),
  branch('No thanks', text('You politely decline.')),
]

// Call any global script
[endDate()]
```

This lets date scenes share code with the rest of the game rather than duplicating behaviour.

### Nested Scenes in Branches

For complex branching, nest `scenes()` inside `cond()`:

```typescript
cond(
  npcStat('my-npc', 'affection', 30),
  scenes(
    [say('"I know a secret spot. Follow me!"')],
    [text('He leads you to a hidden garden.'), say('"Nobody else knows about this place."')],
    [addNpcStat('affection', 5, 'my-npc'), endDate()],
  ),
  scenes(
    [say('"Shall we head back? It\'s getting late."')],
    [text('You walk back through the quiet streets.'), endDate()],
  ),
)
```

This produces entirely different scene sequences based on the NPC's affection level.

## Invitation Mechanics

The invitation is NPC-specific code (not part of the generic system). A typical pattern:

1. Player flirts with an NPC (requires a skill like Flirtation > 0)
2. Conditions checked: skill test, affection threshold, no existing date card
3. NPC asks the player out
4. Player accepts (date card created) or declines

```typescript
// In flirt script (imperative)
const canInvite = game.player.skillTest('Flirtation', 10)
  && npc.affection > 20
  && !game.player.hasCard('date')

if (canInvite) {
  npc.say('"Would you fancy going for a walk tomorrow evening?"')
  game.addOption('interact', { script: 'dateAccept' }, 'Accept')
  game.addOption('interact', { script: 'dateDecline' }, 'Decline')
}
```

The accept script creates the card:

```typescript
dateAccept: (game: Game) => {
  const tomorrow = new Date(game.date)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(18, 0, 0, 0)
  const meetTime = Math.floor(tomorrow.getTime() / 1000)

  game.addCard('date', 'Date', {
    npc: 'tour-guide',
    meetTime,
    meetLocation: 'default',
    dateStarted: false,
  })
}
```

## Key Source Files

| File | Contents |
|------|----------|
| `src/story/Dating.ts` | DatePlan interface, registry, card definition, lifecycle scripts, script builders |
| `src/model/Card.ts` | `CardType` union (includes `'Date'`) |
| `src/screens/QuestsScreen.tsx` | Shows Date cards alongside Quest cards |
| `src/story/npc/Rob.ts` | First NPC date plan implementation |
| `src/story/World.ts` | Imports `Dating.ts` before NPC files |
