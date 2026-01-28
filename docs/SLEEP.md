# Sleep System

The sleep system handles rest and energy restoration. Implementation is in `src/story/Sleep.ts`.

## Overview

Sleep restores Energy over time. The rate of restoration and constraints depend on the sleep context (nap vs full sleep) and environment (bed quality).

## Energy Restoration

Energy is restored at a base rate per minute of sleep. Higher quality beds increase this rate, meaning less sleep time is needed to restore the same amount of energy.

## Sleep Types

### Full Sleep
- No maximum duration limit
- Continues until fully rested, interrupted by alarm, or minimum time reached
- Sets the `lastSleep` timer on completion
- Requires the player to be tired (below energy threshold) to initiate

### Nap
- Has a maximum duration cap
- Does not set `lastSleep` timer
- If player is not tired, maximum duration is further reduced
- Useful for topping up energy during the day

## Parameters

The `sleep` script accepts:

- **alarm**: Hour of day to force wakeup (e.g., 7 for 7am, 11 for checkout)
- **max**: Maximum sleep duration in minutes (defines this as a nap)
- **min**: Minimum sleep duration in minutes
- **quality**: Modifier for energy gain rate (1.0 = standard bed)

## Constraints

Sleep duration is calculated to restore full energy, then constrained by:

1. **Minimum** - ensures at least some rest occurs
2. **Maximum** - caps nap duration
3. **Alarm** - wakes player at specified hour
4. **Energy threshold** - prevents full sleep when not tired

## Wakeup Messages

The system generates contextual messages based on:

- **Wakeup reason**: naturally rested, alarm, hit max duration, or hit min duration
- **Final energy level**: affects tone (well-rested vs still tired)
- **Sleep duration**: included in the message for context

## Bed Quality

Different sleeping locations have different quality modifiers:

- Standard lodgings: baseline quality
- Hotel rooms: slightly improved quality
- Luxury suites: best quality (fastest energy restoration)

Higher quality means faster energy gain, resulting in shorter sleep times needed to fully restore energy.

## Integration

Sleep activities are added to bedroom locations with appropriate parameters:

- Lodgings bedroom: standard alarm time (early morning)
- Hotel rooms: later alarm (checkout time), improved quality
- Naps available anytime, full sleep restricted to evening/night hours
