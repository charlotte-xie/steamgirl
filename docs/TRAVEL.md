# Travel & Navigation

This document covers the travel system: how locations connect, how the player moves between them, and how new areas are discovered.

## Location Links

Each location defines a `links` array of connections to other locations.

```typescript
interface LocationLink {
  dest: LocationId           // Target location
  time: number               // Travel time in minutes
  label?: string             // Custom link text (default: destination name)
  travel?: boolean           // Show under "Travel" instead of "Places"
  cost?: number              // Krona cost (shown as "X min, Y kr")
  checkAccess?: (game) => string | null  // Returns error message if blocked
  onFollow?: Script          // Runs before travel; can interrupt via scene
  alwaysShow?: boolean       // Show even if destination is undiscovered
}
```

**Navigation display** splits links into two groups:

- **Travel**: Links between `mainLocation` areas, or links with `travel: true`
- **Places**: All other links (sub-locations, entrances, etc.)

Only links to **discovered** destinations appear. Undiscovered links are completely hidden, unless the link has `alwaysShow: true` — in which case the link is visible regardless of discovery state. Following an `alwaysShow` link auto-discovers the destination (via the `go` script's standard discovery step). This is used for subway entrances: the stairs down are always visible, and taking the subway discovers the underground station.

## The `go` Script

`go` is the primary travel action, triggered when the player clicks a navigation link. It runs through a series of steps:

1. **Find the link** from the current location's links array
2. **Check access** — call `checkAccess`; abort with message if blocked
3. **Run `onFollow`** — execute any pre-travel script; **abort if a scene is created** (e.g., confirmation dialogue, NPC encounter)
4. **Increment visit counter** on the destination
5. **Pass time** via `timeLapse(link.time)`
6. **Move the player** to the destination
7. **Mark discovered** — set `destination.discovered = true`
8. **Fire arrival hooks** — `onFirstArrive` (first visit only), then `onArrive`

### `move` vs `go`

`move` is a low-level script that simply updates `currentLocation` and refreshes NPC presence. It does **not** pass time, increment visits, mark discovery, or fire arrival hooks. Use `move` in cutscenes and scripted sequences (e.g., the city tour) where you control the pacing manually.

## Discovery

Locations can be marked `secret: true` in their definition. Secret locations start **undiscovered** — they won't appear in navigation links until explicitly discovered.

```typescript
registerLocation('backstreets', {
  name: 'Backstreets',
  secret: true,  // Hidden until discovered
  // ...
})
```

Locations are discovered in three ways:

1. **Automatically via `go`** — arriving at a location always sets `discovered = true`
2. **Via the `discoverLocation` script** — explicitly reveals a location, optionally with announcement text and colour
3. **Directly setting `discovered = true`** — in imperative scripts (e.g., `discoverAllLocations` for debug)

Discovery is designed to be a one-way latch: once discovered, a location stays discovered permanently.

### Discovery Through Exploration

The primary discovery mechanism is the Explore activity at each location. Explore uses a `cond` with `and(not(locationDiscovered(...)), skillCheck(...))` predicates to reveal nearby areas:

```typescript
cond(
  // Try to discover the Market
  and(not(locationDiscovered('market')), skillCheck('Perception', 0)),
  discoverLocation('market', 'You find a marketplace...', '#3b82f6'),
  // Normal time-of-day encounters...
  hourBetween(6, 12), random(...morning),
  hourBetween(12, 18), random(...afternoon),
  // ...
)
```

Because `and` short-circuits, the skill check is only rolled when the location hasn't been discovered yet. Each exploration attempt can discover at most one new location.

### Discovery Order

From the starting location (station), the intended discovery flow is:

- **Station** → explore to discover **subway-terminus**
- **Station** → walk to **City Centre** (always available)
- **City Centre** → explore to discover **Market**, **University**, **Backstreets**
- **University** → explore to discover **The Lake**, **subway-university**
- **Backstreets** → explore to discover **Lowtown**
- **Market** → explore to discover **The Lake** (alternate path)

The **city tour** (Rob Hayes NPC at the station) is a shortcut that discovers all key locations in one go: University, Lake, Market, Backstreets, and subway-university.

## Subway System

The subway is an underground railway connecting five stations. Subway links use the `travel: true` flag to appear under the Travel section.

### Fare & Time

```
Base cost:  1 Krona
Per stop:   1 Krona
Base time:  2 minutes
Per stop:   4 minutes
```

Stations on the line (in order): Docks → Lowtown → Terminus → University → Airport.

Distance is the absolute number of stops between origin and destination. Example: Terminus to Airport = 2 stops = 3 Kr fare, 10 min travel time.

### Subway Travel Flow

Subway links use both `checkAccess` and `onFollow`:

1. **`checkAccess`** blocks travel if the player doesn't have enough Krona
2. **`onFollow`** runs a 0–8 minute wait for the train (interruptible — NPCs can approach during the wait)
3. If no scene interrupts, the fare is deducted and the `go` script continues with time passage and movement

### Subway Discovery

Subway stations start as `secret: true`. They are discovered through:
- Exploring the **station** (discovers subway-terminus)
- Exploring the **university** (discovers subway-university)
- The **city tour** mentions the subway at the university stop (discovers subway-university)

## Activities

Locations can define activities — interactive options that appear at the location alongside navigation links.

```typescript
interface LocationActivity {
  name: string
  symbol?: string                         // Display symbol (e.g., 'S', 'H', '◎')
  script: Script                          // Action when clicked
  condition?: Script                      // Predicate — hidden if falsy
  checkAccess?: (game) => string | null   // Disabled with message if blocked
}
```

Activities are filtered by `condition` at render time. Common patterns:

- `hourBetween(7, 19)` — only available during certain hours
- `(g) => !g.getLocation('bedroom').discovered` — only before a condition is met
- Complex date/time checks for one-off events

## Access Control

Both links and activities support `checkAccess` functions that return an error message when access is blocked, or `null` when allowed.

```typescript
checkAccess: (game) => {
  const hour = Math.floor(game.hourOfDay)
  return (hour < 7 || hour > 21)
    ? 'The university is closed.'
    : null
}
```

Blocked links/activities are shown but disabled in the UI, with the error message displayed as a tooltip.

## `onFollow` Pattern

The `onFollow` hook on links is a powerful tool for creating narrative travel sequences:

- **Confirmation dialogues**: Create a scene with options; if the player declines, travel is aborted
- **Conditional costs**: Deduct items or currency before travel completes
- **Random events**: Run a wait that may trigger encounters; travel aborts if an encounter scene starts

The key mechanism: if `onFollow` creates a scene (adds options), the `go` script detects `game.inScene` and aborts the remaining travel steps.
