/**
 * Calculate the number of interval boundaries crossed between two values.
 *
 * This is useful for triggering periodic effects that should fire at fixed
 * intervals (e.g., every 15 minutes, every hour) regardless of how values
 * change.
 *
 * @param prev - The previous value
 * @param current - The current value
 * @param interval - The interval size
 * @returns The number of interval boundaries crossed
 *
 * @example
 * // Value advances from 890 to 920 with 60-unit intervals
 * intervalsCrossed(890, 920, 60) // Returns 1 (crossed the 900 boundary)
 *
 * @example
 * // Value advances from 100 to 250 with 60-unit intervals
 * intervalsCrossed(100, 250, 60) // Returns 2 (crossed 120 and 180 boundaries)
 */
export function intervalsCrossed(prev: number, current: number, interval: number): number {
  return Math.floor(current / interval) - Math.floor(prev / interval)
}
