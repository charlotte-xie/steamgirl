# Washing System

Washing is a simple hygiene mechanic. Taking a shower or bath refreshes the player and grants temporary stat bonuses.

## How It Works

When the player washes (shower or bath), these things happen:

1. The `lastWash` timer is recorded.
2. The **Fresh** effect is applied.
3. Makeup is removed

Handled by the shared `takeWash()` function, so any future washing activity automatically gets the same behaviour.

## Fresh Effect

The Fresh effect is gained by washing and grants bonuses while active. It wears off gradually:

- For the first **30 minutes** after the last wash, the effect is stable.
- After 30 minutes, each minute has a **1% chance** of the effect disappearing.

This gives an expected duration of roughly 130 minutes (~2 hours) total, but with natural variance. Currently two activities grant the Fresh effect:


## Location Activities

Washing is typically done in locations.

- **Take Shower** -- quick wash, takes 10 minutes of game time.
- **Relaxing Bath** -- longer wash, takes 60 minutes of game time.

Both are available most bathrooms.
