/**
 * Script Registry and Infrastructure
 *
 * This module provides the script registry (where scripts are registered and
 * looked up) and the interpolation system for template strings.
 *
 * Core script implementations are in src/model/scripts/:
 * - gameActions.ts  — timeLapse, move, inventory, stats, reputation
 * - controlFlow.ts  — seq, when, cond, random, menu, skillCheck
 * - predicates.ts   — stat checks, conditions, boolean logic
 * - content.ts      — text, paragraph, say, option, npcLeaveOption
 * - cards.ts        — addQuest, completeQuest, addEffect, addTrait
 * - playerActions.ts — wait, go, navigation, conversations, items
 * - npcAI.ts        — plan, basePlanner, beAt, idle, approachPlayer
 *
 * Story-specific scripts (that depend on game world content) belong in story/Utility.ts
 */

import type { Game } from './Game'
import type { InlineContent } from './Format'
import { createRegistry } from '../utils/registry'

// ============================================================================
// SCRIPT TYPES
// ============================================================================

/** A script function - the imperative form */
export type ScriptFn = (game: Game, params: Record<string, unknown>) => unknown

/** An instruction is a script call: [scriptName, params] tuple - the declarative form */
export type Instruction = [string, Record<string, unknown>]

/**
 * A Script can be any of:
 * - ScriptFn: A function (imperative) - (game, params) => result
 * - Instruction: A tuple [scriptName, params] (declarative) - use seq() for multiple
 * - string: A registered script name
 */
export type Script = ScriptFn | Instruction | string

/** Check if a value is a ScriptFn (function) */
export function isScriptFn(value: unknown): value is ScriptFn {
  return typeof value === 'function'
}

/** Check if a value is an Instruction tuple */
export function isInstruction(value: unknown): value is Instruction {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'string'
}

// ============================================================================
// SCRIPT REGISTRY
// ============================================================================

const scriptRegistry = createRegistry<ScriptFn>('Script')

export function makeScript(name: string, script: ScriptFn): void {
  scriptRegistry.register(name, script)
}

export function makeScripts(scripts: Record<string, ScriptFn>): void {
  scriptRegistry.registerAll(scripts)
}

export function getScript(name: string): ScriptFn | undefined {
  return scriptRegistry.get(name)
}

export function getAllScripts(): Record<string, ScriptFn> {
  return scriptRegistry.getAll()
}

// ============================================================================
// ACCESSOR PATTERN — expression chaining support
// ============================================================================

/**
 * An Accessor is returned by a script to support expression chaining.
 * When game.run('foo:bar') is called, script 'foo' returns an Accessor,
 * then accessor.resolve(game, ':bar') is called with the raw rest of the expression.
 * When no rest is present, accessor.default(game) is called.
 */
export interface Accessor {
  default(game: Game): unknown
  resolve(game: Game, rest: string): unknown
}

export function isAccessor(value: unknown): value is Accessor {
  return value != null && typeof value === 'object' && 'resolve' in value
    && typeof (value as Accessor).resolve === 'function'
}

/**
 * Parse an argline like "(rob)" or "(rob):rest" from the start of a rest string.
 * Returns the content inside parens and the remaining string after the closing paren.
 * If rest doesn't start with '(', returns undefined.
 */
export function parseArgs(rest: string): { argline: string, tail: string } | undefined {
  if (!rest.startsWith('(')) return undefined
  const close = rest.indexOf(')')
  if (close === -1) return undefined
  const after = rest.slice(close + 1)
  // Strip leading colon from tail — tail should never start with ':'
  const tail = after.startsWith(':') ? after.slice(1) : after
  return { argline: rest.slice(1, close), tail }
}

// ============================================================================
// STRING INTERPOLATION
// ============================================================================

function isContent(value: unknown): value is InlineContent {
  return value != null && typeof value === 'object' && 'type' in value
}

function interpolationError(expression: string): InlineContent {
  return { type: 'text', text: `{${expression}}`, color: '#ff4444' }
}

/**
 * Resolve a single interpolation expression via game.run.
 * game.run handles expression syntax (colons, parens, accessor chaining).
 * If the final result is an Accessor with no remaining expression, calls .default().
 */
function resolveExpression(game: Game, expression: string): string | InlineContent {
  if (!expression) {
    return { type: 'text', text: '{}', color: '#ff4444' }
  }

  try {
    let resolved: unknown = game.run(expression)

    // If game.run returned an Accessor (no chaining syntax), call default
    if (isAccessor(resolved)) {
      resolved = resolved.default(game)
    }

    if (typeof resolved === 'string') return resolved
    if (isContent(resolved)) return resolved
  } catch {
    // Script not found or other error
  }

  return interpolationError(expression)
}

/**
 * Parse and resolve {scriptName} expressions in a template string.
 * Each {name} calls game.run(name) and uses the result as text content.
 * Use {{ and }} for literal braces. Unknown scripts produce red error text.
 */
export function interpolateString(game: Game, template: string): (string | InlineContent)[] {
  const result: (string | InlineContent)[] = []
  let i = 0
  let literal = ''

  while (i < template.length) {
    const ch = template[i]

    // Escaped braces: {{ → {, }} → }
    if (ch === '{' && template[i + 1] === '{') {
      literal += '{'
      i += 2
      continue
    }
    if (ch === '}' && template[i + 1] === '}') {
      literal += '}'
      i += 2
      continue
    }

    // Start of expression
    if (ch === '{') {
      const end = template.indexOf('}', i + 1)
      if (end === -1) {
        // No closing brace — treat as literal
        literal += ch
        i++
        continue
      }

      // Flush accumulated literal text
      if (literal) {
        result.push(literal)
        literal = ''
      }

      const scriptName = template.slice(i + 1, end).trim()
      result.push(resolveExpression(game, scriptName))

      i = end + 1
      continue
    }

    literal += ch
    i++
  }

  // Flush remaining literal
  if (literal) {
    result.push(literal)
  }

  return result
}

// Core script implementations are in src/model/scripts/*.ts
// They are imported via src/model/scripts/index.ts (side-effect imports for registration)
