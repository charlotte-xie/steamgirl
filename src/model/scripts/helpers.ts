/**
 * Shared helper functions for core script modules.
 * These are internal to the scripting system — not part of the public API.
 */

import type { Game } from '../Game'
import type { InlineContent } from '../Format'
import { type Instruction, isInstruction, interpolateString } from '../Scripts'

/** Destructure and execute an instruction and return its result */
export function exec(game: Game, instruction: Instruction): unknown {
  const [scriptName, params] = instruction
  return game.run(scriptName, params)
}

/**
 * Evaluate a script result as truthy/falsy for predicates.
 *
 * - `true` / `false` — as-is
 * - numbers: `> 0` is truthy, `0` and negatives are falsy
 * - `null`, `undefined`, `''` — falsy
 * - everything else — JS truthiness
 *
 * This is the single source of truth for predicate evaluation across
 * `when`, `cond`, `not`, `and`, `or`, and gated random entries.
 */
export function isTruthy(value: unknown): boolean {
  if (typeof value === 'number') return value > 0
  return !!value
}

/** Execute a sequence of instructions */
export function execAll(game: Game, instructions: Instruction[]): void {
  for (const instr of instructions) {
    exec(game, instr)
  }
}

/** Resolve an array of parts (strings or Instructions) into resolved content */
export function resolveParts(game: Game, parts: (string | Instruction)[]): (string | InlineContent)[] {
  const result: (string | InlineContent)[] = []
  for (const part of parts) {
    if (typeof part === 'string') {
      // Fast path: no braces means no interpolation needed
      if (!part.includes('{')) {
        result.push(part)
      } else {
        result.push(...interpolateString(game, part))
      }
    } else if (isInstruction(part)) {
      const resolved = exec(game, part)
      // If the instruction returned InlineContent, add it
      if (resolved && typeof resolved === 'object' && 'type' in resolved) {
        result.push(resolved as InlineContent)
      }
    }
  }
  return result
}
