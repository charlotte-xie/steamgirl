# Dating System

The dating system provides a reusable mechanic for NPC dates. It builds on the [Card System](./CARDS.md) with a dedicated `Date` card type and a registry of NPC-specific date plans.

## Overview

A date follows this lifecycle:

1. **Invitation** -- An NPC invites the player (typically during a flirt interaction). The player can accept or decline.
2. **Card Created** -- Accepting creates a `Date` card with the meeting time, location, and NPC reference. Reminders escalate as the time approaches.
3. **Meeting** -- The NPC moves to the meeting location at the arranged time and waits (default 2 hours). If the player arrives, the NPC greets them with Cancel/Go options. If the player doesn't show, a no-show penalty fires.
4. **Date Scene** -- The date itself is an arbitrary `Script` -- typically a `scenes()` sequence with branching, skill checks, and player choices.
5. **Completion** -- The date ends with card cleanup and NPC returned to schedule. Affection changes should happen during the date scenes themselves, not as a flat completion bonus.

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
| `standardGreeting(greeting?, goLabel?)` | NPC says hello, offers Cancel/Go options | Custom greeting text; accept button label (defaults to "Go with him/her/them" using NPC pronouns) |
| `standardCancel(response?, penalty?)` | Affection penalty, card removed | Response text, penalty amount (default 20) |
| `standardNoShow(name, narration?, penalty?)` | No-show narration, affection penalty | NPC name, narration text, penalty (default 15) |
| `standardComplete(bonus?)` | Card removed, optional affection bonus | Bonus amount (default 15; use 0 if affection is handled in-scene) |
| `endDate()` | DSL instruction to end the date successfully | *(none -- NPC auto-detected from card)* |
| `branch(label, ...instructions)` | Player choice that continues the scene sequence | Label + inline instructions for a single branch scene |
| `branch(label, scenes)` | Multi-scene player choice | Label + `Instruction[][]` for multi-scene branches |

`endDate()` is a convenience DSL builder that produces the `dateComplete` instruction. It automatically resolves the NPC from the active date card, so date scenes can be NPC-independent. Use it as the last instruction in a date scene.

The `standardCancel`, `standardNoShow`, and `standardComplete` builders use the `addNpcStat` script internally for affection changes, so any game-wide behaviour (logging, events, display) applies consistently.

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

The `date` card stores per-instance state typed by the `DateCardData` interface:

```typescript
interface DateCardData {
  npc: string          // NPC ID for lookup in the date plan registry
  meetTime: number     // Unix seconds for the meeting time
  meetLocation: string // Location ID for the meeting point
  dateStarted: boolean // Set to true when the NPC greets the player
}
```

Use `dateCardData(card)` for type-safe access to these properties rather than casting manually. The card also uses the standard `completed` and `failed` flags from the Card base.

The card definition provides escalating reminders:

- **Before the day**: "Date with Rob tomorrow at 6pm" (info)
- **On the day, before meeting time**: "Meet Rob in the City Centre at 6pm today" (info)
- **During the wait window**: "Rob is waiting for you in the City Centre!" (urgent)

The `afterUpdate` hook handles two responsibilities:
1. **NPC positioning** -- During the wait window, moves the NPC to the meeting location. This runs after `onMove`, so the NPC's normal schedule is set first, then the date card overrides the position.
2. **No-show detection** -- If `game.time` passes the deadline (meetTime + waitMinutes), runs the `onNoShow` script.

### Lifecycle Scripts

Four global scripts handle the date lifecycle, registered by `Dating.ts`:

| Script | Trigger | Action |
|--------|---------|--------|
| `dateApproach` | Player arrives at meeting location | Sets `dateStarted = true`, runs `onGreeting` |
| `dateCancel` | Player chooses Cancel | Runs `onCancel` (affection penalty, cleanup) |
| `dateStart` | Player chooses Go | Runs `dateScene` |
| `dateComplete` | Date scene ends successfully | Runs `onComplete` (cleanup, optional affection bonus) |

### NPC Integration

NPCs use `maybeApproach` to support dates. NPC positioning is handled automatically by the Date card's `afterUpdate` -- NPC `onMove` hooks do not need date logic.

**`maybeApproach`** is called before `onWait` (each 10-minute chunk) and before `onApproach`. If it creates a scene, the wait/approach is cancelled. Use it for date intercepts via `handleDateApproach`:

```typescript
import { handleDateApproach } from '../Dating'

registerNPC('my-npc', {
  pronouns: PRONOUNS.he,  // Used by standardGreeting for "Go with him"

  // onMove only needs normal scheduling — date positioning is automatic
  onMove: (game) => {
    npc.followSchedule(game, [[9, 18, 'station']])
  },

  // Date intercept — only thing that should go here
  maybeApproach: (game) => {
    handleDateApproach(game, 'my-npc')
  },

  // Normal wait/approach logic — no date guards needed
  onWait: (game) => { /* ... */ },
  onApproach: seq(/* ... */),
})
```

NPCs should set `pronouns` on their definition (using `PRONOUNS.he`, `PRONOUNS.she`, or `PRONOUNS.they`) so that `standardGreeting` generates the correct accept button label (e.g. "Go with him").

## Affection Tiers

NPC affection ranges from 0 to 100. These tiers guide content gating and NPC behaviour:

| Range | Tier | Description |
|-------|------|-------------|
| 1--20 | Mild Like | Friendly warmth. NPC enjoys the player's company. |
| 20--40 | Active Interest | Clear attraction. NPC seeks out the player, flirts back, asks for dates. |
| 40--60 | Real Affection | Genuine emotional bond. Intimate moments, vulnerability, first kisses. |
| 60--80 | Strong Love | Deep commitment. NPC prioritises the player, opens up fully. |
| 80--100 | Infatuation / Obsession | Potentially dangerous intensity. Jealousy, possessiveness, or unhealthy attachment may emerge. |

The rate at which affection grows is NPC-specific. A warm, open character like Rob might reach Active Interest quickly through casual flirting, while a guarded gangster might require completing dangerous tasks before budging past Mild Like. Use `max` caps on `addNpcStat` to enforce per-interaction ceilings, and document each NPC's affection budget in their source file.

## Relationships

Relationships track the formal status between the player and NPCs. They interact closely with the dating system — relationship status can gate different date sequences, condition greetings, and unlock new options like breakup.

### Data Model

The `Player` class has a `relationships` field:

```typescript
type Relationship = 'boyfriend' | 'girlfriend' | 'partner' | 'rival' | 'enemy' | string

// In Player:
relationships: Map<string, Relationship>
```

The map key is the NPC ID (e.g. `'tour-guide'`). Serialised as `Record<string, string>` in save data — empty maps are omitted.

### DSL Helpers

| Helper | Type | Description |
|--------|------|-------------|
| `hasRelationship(relationship?, npc?)` | Predicate | Check if a relationship exists. If `relationship` omitted, checks for any relationship. If `npc` omitted, infers from current scene NPC. |
| `setRelationship(relationship, npc?)` | Action | Set a relationship. Pass empty string `''` to clear. If `npc` omitted, infers from current scene NPC. |
| `chance(probability)` | Predicate | Runtime random check (0–1). Useful for gating relationship proposals. |

### Core Scripts

```typescript
// In Scripts.ts:
hasRelationship: (game, { relationship?, npc? }) => boolean
setRelationship: (game, { relationship?, npc? }) => void
chance: (game, { probability? }) => boolean
```

### Patterns

**Conditioning content on relationship:**

```typescript
cond(
  hasRelationship('boyfriend'),
  say('There you are, love!'),       // boyfriend greeting
  say('Hello again!'),                // default greeting
)
```

**Proposing a relationship (probabilistic):**

```typescript
cond(
  and(
    npcStat('affection', { min: 51 }),
    not(hasRelationship()),
    chance(0.3),
  ),
  seq(
    say('Would you want to be together? Properly?'),
    branch('Yes', setRelationship('boyfriend'), addNpcStat('affection', 5)),
    branch('Not ready', addNpcStat('affection', -10)),
  ),
)
```

**Breaking up:**

```typescript
setRelationship('')  // clears the relationship (empty string is falsy → deletes)
addNpcStat('affection', -40, { min: 5 })
```

**Dispatching different date sequences:**

```typescript
dateScene: cond(
  hasRelationship('boyfriend'),
  robBoyfriendDate(),
  robNormalDate(),
),
```

### Integration with Dating

- **Date greeting** can be conditioned on relationship for warmer boyfriend-specific text
- **Date scenes** can dispatch to entirely different sequences based on relationship
- **Walk-home / farewell** scenes can skip the "may I kiss you?" gate for boyfriends and auto-kiss instead
- **Relationship proposals** are gated by affection thresholds, `not(hasRelationship())`, and `chance()` to avoid repetition
- **Breakup** is offered as an option during chat interactions when a relationship exists

## NPC Visits

NPCs can visit the player in bedroom locations (`isBedroom: true` on the location definition). This is separate from the date system — visits are casual drop-ins that happen outside of dates.

### Location Flag

Mark any location where NPCs can stay overnight:

```typescript
bedroom: {
  name: 'Bedroom',
  isBedroom: true,
  // ...
}
```

The `inBedroom()` DSL predicate checks this flag. Use it instead of hardcoding location IDs.

### Visit Triggers

Visits use the `onWaitAway` NPC hook, which fires during waits for NPCs that are **not** at the player's location. The standard `onWait` only fires for present NPCs, so `onWaitAway` is needed for NPCs arriving from elsewhere.

```typescript
onWaitAway: (game: Game) => {
  if (
    game.player.relationships.get('my-npc') === 'boyfriend' &&
    game.location.template.isBedroom &&
    game.hourOfDay >= 18 && game.hourOfDay < 22 &&
    !game.player.hasCard('date') &&
    Math.random() < 0.2
  ) {
    game.scene.npc = 'my-npc'
    game.scene.hideNpcImage = false
    game.run('interact', { script: 'npcVisit' })
  }
},
```

### Keeping NPCs in Bedrooms

In `onMove`, check the `isBedroom` flag to keep a visiting NPC in place while the player is there:

```typescript
onMove: (game: Game) => {
  const npc = game.getNPC('my-npc')
  const loc = npc.location ? game.getLocation(npc.location) : undefined
  if (loc?.template.isBedroom && npc.location === game.currentLocation) return
  npc.followSchedule(game, [[9, 18, 'station']])
},
```

When the player leaves, the next `onMove` tick returns the NPC to their normal schedule.

### Chat Loop Pattern

Room interactions use a repeatable chat loop — a `seq` with `random` flavour text and options that cycle back:

```typescript
lodgingsChat: seq(
  random(
    say('Random line 1.'),
    say('Random line 2.'),
  ),
  option('Chat', 'npc:lodgingsChat'),
  option('Kiss him', 'npc:lodgingsKiss'),
  npcLeaveOption('You leave Rob to it for now.', undefined, 'Do something else'),
  option('Ask him to leave', 'npc:leaveLodgings'),
),
```

### Exiting Chat Without Removing the NPC

Use `npcLeaveOption` with custom text and label to end the conversation while the NPC stays in the room. The player can approach them again to resume chatting.

```typescript
// Ends the scene — NPC stays in location, player returns to free movement
npcLeaveOption('You leave them to it for now.', undefined, 'Do something else')
```

This is distinct from a "leave" script that calls `moveNpc(npcId, null)` to actually send the NPC away:

```typescript
// Sends NPC away — they return to their normal schedule
leaveLodgings: seq(
  say('Right. I should probably head off.'),
  moveNpc('my-npc', null),
),
```

### Chaining from Dates

A date's walk-home scene can offer a visit invitation. End the date first, then transition into the visit:

```typescript
branch('Come back to mine',
  endDate(),                          // clean up date card first
  move('bedroom', 5),
  moveNpc('my-npc', 'bedroom'),
  say('I thought you\'d never ask.'),
  npcInteract('lodgingsChat'),        // enter the visit chat loop
),
branch('Goodnight',
  say('Goodnight, love.'),
  endDate(),
),
```

### onApproach Routing

When an NPC can be in multiple room types, use `cond` with location checks in `onApproach`:

```typescript
onApproach: seq(
  cond(
    inLocation('dorm-suite'),
    npcInteract('roomChat'),       // hotel room chat
    inBedroom(),
    npcInteract('lodgingsChat'),   // lodgings chat
    seq(/* ...normal approach... */),
  ),
),
```

## Writing Date Scenes

Date scenes use the standard DSL (`scenes()`, `branch()`, `cond()`, `skillCheck()`). See [SCRIPTING.md](./SCRIPTING.md) for the full DSL reference.

### Key Patterns

**Linear date** -- a `scenes()` sequence ending with `endDate()`:

```typescript
dateScene: scenes(
  [move('lake', 15), say('"Here we are!"')],
  [text('You enjoy the view.'), say('"Lovely, isn\'t it?"')],
  [say('"I had a wonderful time."'), endDate()],
)
```

**Branching** -- `branch()` inside a scene lets the player choose a path. Scenes after the branching scene auto-resume:

```typescript
[
  branch('The lake', [
    [move('lake', 10), say('"The lake is beautiful tonight."')],
  ]),
  branch('The pier', [
    [move('pier', 10), say('"I love the pier at night."')],
  ]),
],
[say('"I had a wonderful time."'), endDate()],  // runs after either branch
```

**Conditional content** -- use `cond()` with `npcStat()` to fork scenes by affection or stats. Nest `scenes()` inside `cond()` for entirely different sequences per state.

**Intimacy choices** -- offer `branch()` pairs (lean in / hold back) to let the player shape the dynamic.

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
