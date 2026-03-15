/** Core game action scripts: time, movement, inventory, stats, reputation. */

import type { Game } from '../Game'
import { colour, COLOURS } from '../Format'
import { type StatName, type MeterName, MAIN_STAT_INFO, SKILL_INFO, METER_INFO } from '../Stats'
import type { TimerName } from '../Player'
import { capitalise } from '../Text'
import { type ClothingPosition, type ClothingLayer } from '../Item'
import { getReputation, type ReputationId } from '../Faction'
import { type ScriptFn, makeScripts } from '../Scripts'

const gameActionScripts: Record<string, ScriptFn> = {
  /** Advance the game's time by a given number of seconds/minutes */
  timeLapse: (game: Game, params: { seconds?: number, minutes?: number, untilTime?: number } = {}) => {
    let seconds = params.seconds ?? 0
    let minutes = params.minutes ?? 0

    // If untilTime is provided (as hour of day, e.g., 10 or 10.25 for 10:15am)
    if (params.untilTime !== undefined) {
      if (typeof params.untilTime !== 'number') {
        throw new Error('timeLapse untilTime must be a number (hour of day, e.g., 10 or 10.25)')
      }

      const targetHour = params.untilTime
      const currentHour = game.hourOfDay

      // Only advance if target is in the future on the same day
      if (currentHour < targetHour) {
        const hoursDifference = targetHour - currentHour
        seconds = Math.floor(hoursDifference * 3600)
        minutes = 0
      } else {
        seconds = 0
        minutes = 0
      }
    }

    if (typeof seconds !== 'number' || seconds < 0) {
      throw new Error('timeLapse requires a non-negative number of seconds')
    }
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('timeLapse requires a non-negative number of minutes')
    }

    const totalSeconds = seconds + (minutes * 60)

    if (totalSeconds > 0) {
      game.time += totalSeconds

      // Deplete energy over time (1 per 15-minute boundary crossed) - but not while sleeping
      if (!game.player.sleeping) {
        const energyTicks = game.calcTicks(totalSeconds, 15 * 60) // 15 minutes in seconds
        if (energyTicks > 0) {
          const currentEnergy = game.player.basestats.get('Energy') ?? 0
          const newEnergy = Math.max(0, currentEnergy - energyTicks)
          game.player.basestats.set('Energy', newEnergy)
        }
      }

      // Call onTime for all player cards
      const cards = [...game.player.cards]
      for (const card of cards) {
        const cardDef = card.template
        if (cardDef.onTime && typeof cardDef.onTime === 'function') {
          cardDef.onTime(game, card, totalSeconds)
        }
      }

      // Run standard time-based effect accumulation (hunger, etc.)
      // This runs after onTime so newly added cards don't get onTime in the same tick
      game.run('timeEffects', { seconds: totalSeconds })

      // If hour boundary crossed, update NPC presence (skip during scenes)
      if (!game.inScene) {
        const hoursCrossed = game.calcTicks(totalSeconds, 60 * 60) // 1 hour in seconds
        if (hoursCrossed > 0) {
          game.updateNPCsPresent()
        }
      }
    }
  },

  /** Unconditionally move the player to a location (instant teleport). Optionally advance time after moving. */
  move: (game: Game, params: { location?: string; minutes?: number } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('move script requires a location parameter')
    }
    game.getLocation(locationId)
    game.moveToLocation(locationId)
    if (params.minutes && params.minutes > 0) {
      game.timeLapse(params.minutes)
    }
  },

  /** Set the current scene's NPC */
  setNpc: (game: Game, params: { npc?: string } = {}) => {
    const npcId = params.npc
    if (!npcId || typeof npcId !== 'string') {
      throw new Error('setNpc script requires an npc parameter')
    }
    game.scene.npc = npcId
  },

  /** Hide the NPC image in the current scene */
  hideNpcImage: (game: Game) => {
    game.scene.hideNpcImage = true
  },

  /** Show the NPC image in the current scene */
  showNpcImage: (game: Game) => {
    game.scene.hideNpcImage = false
  },

  /** Mark the current scene NPC's name as known to the player */
  learnNpcName: (game: Game) => {
    const npcId = game.scene.npc
    if (!npcId) return
    const npc = game.getNPC(npcId)
    npc.nameKnown = 1
  },

  /** Add an item to the player's inventory */
  gainItem: (game: Game, params: { text?: string; item?: string; number?: number } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('gainItem script requires an item parameter')
    }

    const number = params.number ?? 1
    if (typeof number !== 'number' || number < 0) {
      throw new Error('gainItem script requires a non-negative number')
    }

    if (params.text) {
      game.add({ type: 'text', text: params.text, color: '#ffeb3b' })
    }

    game.player.addItem(itemId, number)
    game.player.calcStats()
  },

  /** Remove an item from the player's inventory */
  loseItem: (game: Game, params: { item?: string; number?: number } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('loseItem script requires an item parameter')
    }

    const number = params.number ?? 1
    if (typeof number !== 'number' || number < 0) {
      throw new Error('loseItem script requires a non-negative number')
    }

    game.player.removeItem(itemId, number)
    game.player.calcStats()
  },

  /** Wear an item the player already has in inventory */
  wearItem: (game: Game, params: { item?: string } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('wearItem script requires an item parameter')
    }
    game.player.wearItem(itemId)
    game.player.calcStats()
  },

  /** Unwear clothing. Optionally filter by position and/or layer. Respects locks unless force is true. */
  stripAll: (game: Game, params: { force?: boolean; position?: ClothingPosition; layer?: ClothingLayer } = {}) => {
    game.player.stripAll(params.force ?? false, params.position, params.layer)
    game.player.calcStats()
  },

  /** Ensure essential clothing slots are covered (chest & hips, under & inner layers). No-op if already dressed. */
  fixClothing: (game: Game) => {
    const p = game.player
    const slots: [ClothingPosition, ClothingLayer][] = [
      ['chest', 'under'], ['chest', 'inner'],
      ['hips', 'under'], ['hips', 'inner'],
    ]
    let dressed = false
    for (const [position, layer] of slots) {
      if (p.getWornAt(position, layer)) continue
      // Find an unworn item that covers this slot
      const item = p.inventory.find(i =>
        !i.worn && i.template.layer === layer && i.template.positions?.includes(position)
      )
      if (item) {
        p.wearItem(item)
        dressed = true
      }
    }
    if (dressed) {
      p.calcStats()
      game.add('You hastily fix your clothing.')
    }
  },

  /** Remove clothing for bed — keeps underwear (under layer) and items tagged as nightwear. */
  undressForBed: (game: Game) => {
    const p = game.player
    let removed = false
    for (const item of p.inventory) {
      if (!item.worn) continue
      if (item.locked) continue
      if (item.template.layer === 'under') continue
      if (item.template.nightwear) continue
      item.worn = false
      removed = true
    }
    if (removed) {
      p.calcStats()
      game.add('You undress for bed.')
    }
  },

  /** Save the current outfit under a name (for later restoration with wearOutfit). */
  saveOutfit: (game: Game, params: { name?: string } = {}) => {
    const name = params.name
    if (!name || typeof name !== 'string') {
      throw new Error('saveOutfit script requires a name parameter')
    }
    game.player.saveOutfit(name)
  },

  /** Restore a previously saved outfit by name. Strips current clothes and re-dresses. */
  wearOutfit: (game: Game, params: { name?: string; delete?: boolean } = {}) => {
    const name = params.name
    if (!name || typeof name !== 'string') {
      throw new Error('wearOutfit script requires a name parameter')
    }
    game.player.wearOutfit(name)
    if (params.delete) {
      game.player.deleteOutfit(name)
    }
    game.player.calcStats()
  },

  /** Strip all clothing and wear a list of items. Items not in inventory are skipped. */
  changeOutfit: (game: Game, params: { items?: string[]; force?: boolean } = {}) => {
    const items = params.items
    if (!items || !Array.isArray(items)) {
      throw new Error('changeOutfit script requires an items array')
    }
    game.player.stripAll(params.force ?? false)
    for (const id of items) {
      game.player.wearItem(id)
    }
    game.player.calcStats()
  },

  /** Modify a base stat with optional display text and color */
  addStat: (game: Game, params: {
    stat?: StatName
    change?: number
    min?: number
    max?: number
    colour?: string
    text?: string
    chance?: number
    hidden?: boolean
  }) => {
    const statName = params.stat
    if (!statName || typeof statName !== 'string') {
      throw new Error('addStat script requires a stat parameter')
    }
    if (!(statName in MAIN_STAT_INFO || statName in SKILL_INFO || statName in METER_INFO)) {
      throw new Error(`addStat: unknown stat '${statName}'`)
    }

    const change = params.change
    if (typeof change !== 'number') {
      throw new Error('addStat script requires a change parameter')
    }

    const chance = params.chance ?? 1.0
    if (typeof chance !== 'number' || chance < 0 || chance > 1) {
      throw new Error('addStat chance must be a number between 0 and 1')
    }

    if (Math.random() > chance) {
      return
    }

    const currentValue = game.player.basestats.get(statName as StatName) || 0
    let newValue = currentValue + change

    const min = params.min ?? 0
    const max = params.max ?? 100
    newValue = Math.max(min, Math.min(max, newValue))
    const actualChange = newValue - currentValue

    if ((actualChange == 0) || (Math.sign(actualChange) != Math.sign(change))) {
      return
    }

    game.player.basestats.set(statName as StatName, newValue)
    game.player.calcStats()

    if (!params.hidden) {
      let displayColor: string
      if (params.colour) {
        displayColor = params.colour
      } else {
        const meterInfo = METER_INFO[statName as MeterName]
        if (meterInfo) {
          displayColor = change > 0 ? meterInfo.gainColor : meterInfo.lossColor
        } else {
          displayColor = change > 0 ? COLOURS.positive : COLOURS.negative
        }
      }

      let displayText: string
      if (params.text) {
        displayText = params.text
      } else {
        const sign = change > 0 ? '+' : ''
        displayText = `${capitalise(statName)} ${sign}${change}`
      }

      if (actualChange !== 0) {
        game.add(colour(displayText, displayColor))
      }
    }
  },

  /** Recalculate stats based on basestats and modifiers */
  calcStats: (game: Game) => {
    game.player.calcStats()
  },

  /** Record the current game time to a named timer */
  recordTime: (game: Game, params: { timer?: string }) => {
    if (!params.timer || typeof params.timer !== 'string') {
      throw new Error('recordTime requires a timer parameter (string name)')
    }
    game.player.setTimer(params.timer as TimerName, game.time)
  },

  /** Modify an NPC stat (e.g. affection) with optional display text and clamping */
  addNpcStat: (game: Game, params: {
    npc?: string
    stat?: string
    change?: number
    max?: number
    min?: number
    hidden?: boolean
  }) => {
    const npcId = params.npc ?? game.scene.npc
    if (!npcId) throw new Error('addNpcStat requires an npc parameter or active scene NPC')
    const stat = params.stat
    if (!stat) throw new Error('addNpcStat requires a stat parameter')
    const change = params.change
    if (typeof change !== 'number') throw new Error('addNpcStat requires a change parameter')

    const npc = game.getNPC(npcId)

    const current = npc.stats.get(stat) ?? 0
    let newValue = current + change
    if (params.max !== undefined) newValue = Math.min(newValue, params.max)
    if (params.min !== undefined) newValue = Math.max(newValue, params.min)
    const actualChange = newValue - current
    if (actualChange === 0) return

    npc.stats.set(stat, newValue)

    if (!params.hidden) {
      const sign = actualChange > 0 ? '+' : ''
      const color = actualChange > 0 ? COLOURS.positive : COLOURS.negative
      game.add(colour(`${capitalise(stat)} ${sign}${actualChange}`, color))
    }
  },

  /** Set an NPC's location directly */
  setNpcLocation: (game: Game, params: { npc?: string; location?: string | null }) => {
    const npcId = params.npc ?? game.scene.npc
    if (!npcId) throw new Error('setNpcLocation requires an npc parameter or active scene NPC')
    const npc = game.npcs.get(npcId)
    if (!npc) throw new Error(`setNpcLocation: NPC not found '${npcId}'`)
    npc.location = params.location ?? null
  },

  /** Modify a faction reputation score (0-100) with optional display and clamping */
  addReputation: (game: Game, params: {
    reputation?: string
    change?: number
    min?: number
    max?: number
    hidden?: boolean
    chance?: number
  }) => {
    const repName = params.reputation
    if (!repName || typeof repName !== 'string') {
      throw new Error('addReputation requires a reputation parameter')
    }
    const repDef = getReputation(repName as ReputationId)
    if (!repDef) {
      throw new Error(`addReputation: unknown reputation '${repName}'`)
    }

    const change = params.change
    if (typeof change !== 'number') {
      throw new Error('addReputation requires a change parameter')
    }

    const chance = params.chance ?? 1.0
    if (typeof chance !== 'number' || chance < 0 || chance > 1) {
      throw new Error('addReputation chance must be a number between 0 and 1')
    }
    if (Math.random() > chance) return

    const current = game.player.reputation.get(repName) ?? 0
    let newValue = current + change
    const min = params.min ?? 0
    const max = params.max ?? 100
    newValue = Math.max(min, Math.min(max, newValue))
    const actualChange = newValue - current

    if (actualChange === 0 || Math.sign(actualChange) !== Math.sign(change)) return

    game.player.reputation.set(repName, newValue)

    if (!params.hidden) {
      const displayColor = change > 0 ? repDef.gainColor : repDef.lossColor
      const sign = change > 0 ? '+' : ''
      game.add(colour(`${repDef.name} ${sign}${change}`, displayColor))
    }
  },
}

makeScripts(gameActionScripts)
