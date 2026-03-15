/** Core control flow scripts: seq, when, cond, random, menu, exitScene, skillCheck. */

import type { Game } from '../Game'
import type { StatName } from '../Stats'
import { type ScriptFn, type Instruction, makeScripts } from '../Scripts'
import { exec, isTruthy, execAll } from './helpers'

const controlFlowScripts: Record<string, ScriptFn> = {
  /** Execute a sequence of instructions */
  seq: (game: Game, params: { instructions?: Instruction[] }) => {
    if (!params.instructions) return
    execAll(game, params.instructions)
  },

  /** Conditional execution - runs instructions if condition is truthy */
  when: (game: Game, params: { condition?: Instruction; then?: Instruction[] }) => {
    if (!params.condition || !params.then) return
    const result = exec(game, params.condition)
    if (isTruthy(result)) {
      execAll(game, params.then)
    }
  },

  /** Multi-branch conditional */
  cond: (game: Game, params: { branches?: { condition: Instruction; then: Instruction }[]; default?: Instruction }) => {
    if (!params.branches) return

    for (const branch of params.branches) {
      const result = exec(game, branch.condition)
      if (isTruthy(result)) {
        exec(game, branch.then)
        return
      }
    }

    if (params.default) {
      exec(game, params.default)
    }
  },

  /**
   * Pick one entry at random from an eligible pool and execute it.
   *
   * Supports conditional entries via `when()`: if a child is a `when` instruction,
   * its condition is evaluated first — only passing entries join the pool.
   * Non-`when` children are always eligible.
   *
   * Example: random(when(hasReputation('gangster', { min: 40 }), 'Feared text'), 'Default text')
   */
  random: (game: Game, params: { children?: (Instruction | null | undefined | false | 0)[] }) => {
    if (!params.children || params.children.length === 0) return

    // Build the eligible pool: when-gated entries are conditional, others always eligible
    // Falsy entries are silently skipped (supports && patterns and manual construction)
    const pool: Instruction[][] = []
    for (const child of params.children) {
      if (!child) continue
      if (Array.isArray(child) && child[0] === 'when') {
        const whenParams = child[1] as { condition?: Instruction; then?: Instruction[] }
        if (whenParams.condition && whenParams.then) {
          if (exec(game, whenParams.condition)) {
            pool.push(whenParams.then)
          }
        }
      } else {
        pool.push([child])
      }
    }

    if (pool.length === 0) return
    const chosen = pool[Math.floor(Math.random() * pool.length)]
    execAll(game, chosen)
  },

  /**
   * Repeatable choice menu. Pushes a self-reference onto the current stack
   * frame so the menu re-shows after any option's content exhausts.
   * exit() inside option content clears the stack, breaking the loop.
   */
  menu: (game: Game, params: { items?: Instruction[] }) => {
    const items = params.items
    if (!items || items.length === 0) return
    const menuSelf: Instruction = ['menu', params]
    game.topFrame.pages.unshift(menuSelf)
    for (const item of items) {
      game.run(item)
    }
  },

  /** Clear the stack and optionally run content. Used inside option content to break out of loops/scenes. */
  exitScene: (game: Game, params: { then?: Instruction[] }) => {
    game.scene.stack = []
    if (params.then) {
      for (const instr of params.then) {
        game.run(instr)
      }
    }
  },

  /** Perform a skill test. Returns boolean if no callbacks provided, otherwise executes callbacks. */
  skillCheck: (game: Game, params: {
    skill?: string
    difficulty?: number
    onSuccess?: Instruction
    onFailure?: Instruction
  }): boolean | void => {
    if (!params.skill) return false
    const difficulty = params.difficulty ?? 0
    const success = game.player.skillTest(params.skill as StatName, difficulty)

    // If no callbacks, return boolean (predicate mode)
    if (!params.onSuccess && !params.onFailure) {
      return success
    }

    // Execute appropriate callback
    if (success && params.onSuccess) {
      exec(game, params.onSuccess)
    } else if (!success && params.onFailure) {
      exec(game, params.onFailure)
    }

    return success
  },
}

makeScripts(controlFlowScripts)
