# Hunger System

Hunger is a time-based survival mechanic that applies escalating penalties when the player goes too long without eating.

## How It Works

The player has a `lastEat` timer that records when they last ate. After a **4-hour grace period**, each minute has a **0.3% chance** of the Peckish effect appearing. Once a hunger effect is active, it can escalate further over time using the same random-chance-per-minute mechanism.

## Severity Chain

Hunger uses the card system's `replaces`/`subsumedBy` relationships to form a clean escalation chain:

```
Peckish --> Hungry --> Starving
```

- **Peckish** -- mild hunger. Applies a small Willpower penalty. Each minute has a 0.3% chance of escalating to Hungry.
- **Hungry** -- replaces Peckish. Applies penalties to Perception, Wits, Charm, and Willpower. Each minute has a 0.3% chance of escalating to Starving.
- **Starving** -- replaces Peckish and Hungry. Applies severe penalties across all stats.

Eating a meal resets the `lastEat` timer and removes any active hunger effects. The grace period then starts fresh.

## Probability Model

The random escalation uses a compound probability model: over *n* minutes, the chance of the event **not** occurring is `(1 - p)^n`, where *p* is 0.003. This means the expected wait is roughly 330 minutes (~5.5 hours) for each transition, but with natural variance -- sometimes it happens quickly, sometimes it takes much longer.
