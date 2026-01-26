# Hunger System

Hunger is a time-based survival mechanic that applies escalating penalties when the player goes too long without eating.

## How It Works

The player has a `lastEat` timer that records when they last ate. After a **4-hour grace period**, each minute has a **0.3% chance** of the Peckish effect appearing. Once a hunger effect is active, it can escalate further over time using the same random-chance-per-minute mechanism.

## Severity Chain

Hunger uses the card system's `replaces`/`subsumedBy` relationships to form a clean escalation chain:

```
Peckish --> Hungry --> Starving
```

| Level | Hunger Level | Stat Penalties | Escalation |
|-------|-------------|----------------|------------|
| **Peckish** | 50 | Willpower -5 | 0.3%/min to Hungry |
| **Hungry** | 100 | Perception -5, Wits -5, Charm -5, Willpower -10 | 0.3%/min to Starving |
| **Starving** | 150 | Strength -10, Agility -10, Perception -20, Wits -20, Charm -20, Willpower -20 | -- |

Each level's `hungerLevel` value represents the total food quantity needed to go from that state to no hunger.

## Eating and Hunger Removal

Eating food calls `eatFood(game, quantity)` which resets the `lastEat` timer and calls `removeHunger(game, quantity)`. Typical food quantities:

| Quantity | Example |
|----------|---------|
| 20 | Small snack |
| 50 | Large snack |
| 100 | Full meal |
| 200 | Huge meal |

Each **50 units** of food removes one hunger level, downgrading to the next lower severity:

- **Starving** + 50 food --> **Hungry**
- **Hungry** + 50 food --> **Peckish**
- **Peckish** + 50 food --> no hunger

If the remaining quantity is less than 50, there is a proportional chance of removing one further level (e.g. 20 remaining = 40% chance).

A full meal (100) eaten while Starving downgrades to Peckish. A huge meal (200) clears Starving entirely with food to spare.

## Probability Model

The random escalation uses a compound probability model: over *n* minutes, the chance of the event **not** occurring is `(1 - p)^n`, where *p* is 0.003. This means the expected wait is roughly 330 minutes (~5.5 hours) for each transition, but with natural variance -- sometimes it happens quickly, sometimes it takes much longer.
