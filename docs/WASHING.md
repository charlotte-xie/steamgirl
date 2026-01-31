# Washing System

Washing is a simple hygiene mechanic. Taking a shower or bath refreshes the player and grants the temporary **Fresh** effect.

## How It Works

When the player washes (shower or bath), the shared `takeWash()` function:

1. Records the `lastWash` timer
2. Applies the **Fresh** effect
3. Removes makeup

## Fresh Effect

The Fresh effect grants stat bonuses while active. It wears off gradually:

- For the first **30 minutes** after washing, the effect is stable.
- After 30 minutes, each minute has a **1% chance** of disappearing.

Expected duration: ~130 minutes (~2 hours) total, with natural variance.

## Washing Activities

Available in most bathroom locations:

- **Take Shower** -- 10 minutes of game time
- **Relaxing Bath** -- 60 minutes of game time

Implementation is in `src/story/Sleep.ts` (shared with bedroom activities).
