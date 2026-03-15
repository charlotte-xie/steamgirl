/** Core card management scripts: addQuest, completeQuest, addEffect, addTrait. */

import type { Game } from '../Game'
import { type ScriptFn, makeScripts } from '../Scripts'

const cardScripts: Record<string, ScriptFn> = {
  /** Add a quest card */
  addQuest: (game: Game, params: { questId?: string; args?: Record<string, unknown> }) => {
    if (!params.questId) return
    game.addQuest(params.questId, params.args ?? {})
  },

  /** Complete a quest card */
  completeQuest: (game: Game, params: { questId?: string }) => {
    if (!params.questId) return
    game.completeQuest(params.questId)
  },

  /** Add an effect card */
  addEffect: (game: Game, params: { effectId?: string; args?: Record<string, unknown> }) => {
    if (!params.effectId) return
    game.addEffect(params.effectId, params.args ?? {})
  },

  /** Add a trait card */
  addTrait: (game: Game, params: { traitId?: string; args?: Record<string, unknown> }) => {
    if (!params.traitId) return
    game.addTrait(params.traitId, params.args ?? {})
  },
}

makeScripts(cardScripts)
