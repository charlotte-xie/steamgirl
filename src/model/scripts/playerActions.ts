/** Core player action scripts: wait, go, navigation, conversations, item interactions. */

import type { Game } from '../Game'
import { speech, colour, COLOURS } from '../Format'
import { getLocation } from '../Location'
import { getItem } from '../Item'
import { type ScriptFn, type Instruction, makeScripts } from '../Scripts'

const playerActionScripts: Record<string, ScriptFn> = {
  /**
   * Conscious wait at current location.
   *
   * Time advances in 10-minute chunks. After each chunk, event hooks fire:
   *   1. NPC plan ticks (via tickNPCs) — planner-driven actions and movement
   *   2. Location onTick — system-level checks (indecency, curfew, etc.)
   *   3. Location onWait — ambient events, random encounters
   *
   * If any hook creates a scene (adds options), the wait stops immediately.
   * The optional `then` script only runs if no scene was created.
   *
   * @param minutes - Total wait duration (default 15)
   * @param text - Narrative text displayed at the start of the wait
   * @param then - Script to run after the wait completes (skipped if a scene interrupts)
   */
  wait: (game: Game, params: { minutes?: number; text?: string; then?: { script: string; params?: Record<string, unknown> } } = {}) => {
    const totalMinutes = params.minutes ?? 15
    if (typeof totalMinutes !== 'number' || totalMinutes < 0) {
      throw new Error('wait script requires minutes (non-negative number)')
    }
    if (params.text) {
      game.add(params.text)
    }

    // Process in 10min chunks so events can interrupt long waits
    const CHUNK = 10
    let remaining = totalMinutes
    while (remaining > 0) {
      const chunk = Math.min(remaining, CHUNK)
      game.timeLapse(chunk) /* Should never trigger scenes */
      remaining -= chunk

      // Tick NPC AI plans (planner-enabled NPCs)
      game.tickNPCs()
      if (game.inScene) return

      // Location onTick hook — system-level checks (indecency, curfew, etc.)
      const onTick = game.location.template.onTick
      if (onTick) {
        game.run(onTick, { minutes: chunk })
      }
      if (game.inScene) return // onTick created a scene — stop waiting

      // Location onWait hook — ambient events, random encounters
      const onWait = game.location.template.onWait
      if (onWait) {
        game.run(onWait, { minutes: chunk })
      }
      if (game.inScene) return // Location created a scene — stop waiting
    }

    // All chunks completed without interruption — run follow-up script
    const t = params.then
    if (t?.script) {
      game.run(t.script, t.params ?? {})
    }
  },

  /** Navigate to a given location (checks links, triggers arrival scripts, time lapse, etc.) */
  go: (game: Game, params: { location?: string; minutes?: number } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('go script requires a location parameter')
    }

    const locationFromRegistry = getLocation(locationId)
    if (!locationFromRegistry) {
      throw new Error(`Location not found: ${locationId}`)
    }

    const currentLocation = game.location
    const link = currentLocation.template.links?.find((l: { dest: string }) => l.dest === locationId)

    if (!link) {
      const locationName = locationFromRegistry.name || locationId
      game.add(`You can't see a way to ${locationName}.`)
      return
    }

    if (link.checkAccess) {
      const accessReason = link.checkAccess(game)
      if (accessReason) {
        game.add(accessReason)
        return
      }
    }

    if (link.onFollow) {
      game.run(link.onFollow)
      if (game.inScene) {
        return
      }
    }

    const gameLocation = game.getLocation(locationId)
    const isFirstVisit = gameLocation.numVisits === 0
    gameLocation.numVisits++

    const minutes = params.minutes !== undefined ? params.minutes : (link.time ?? 1)
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('go script minutes must be a non-negative number')
    }
    game.timeLapse(minutes)

    game.run('move', { location: locationId })

    gameLocation.discovered = true

    // Position NPCs before arrival hooks so they're already present
    game.tickNPCs()

    if (isFirstVisit && gameLocation.template.onFirstArrive) {
      game.run(gameLocation.template.onFirstArrive)
    }

    if (!game.inScene && gameLocation.template.onArrive) {
      game.run(gameLocation.template.onArrive)
    }
  },

  /** Discover a location - sets discovered flag and optionally displays text */
  discoverLocation: (game: Game, params: {
    location?: string
    text?: string
    colour?: string
  } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('discoverLocation script requires a location parameter')
    }

    const gameLocation = game.getLocation(locationId)
    if (gameLocation.discovered) return

    gameLocation.discovered = true

    if (params.text) {
      const displayColor = params.colour || COLOURS.discovery
      game.add(colour(params.text, displayColor))
    }
  },

  /** End the current NPC conversation with optional text. Sets lastInteraction to prevent immediate afterUpdate re-triggers. */
  endConversation: (game: Game, params: { text?: string; reply?: string } = {}) => {
    const text = params.text ?? 'You politely end the conversation.'
    game.add(text)
    if (params.reply) {
      if (game.scene.npc) {
        const npc = game.npc
        npc.say(params.reply)
      } else {
        game.add(speech(params.reply, '#a8d4f0'))
      }
    }
    // Mark interaction so NPC afterUpdate respects cooldown
    if (game.scene.npc) {
      game.npc.stats.set('lastInteraction', game.time)
    }
  },

  /** End the current scene with optional text */
  endScene: (game: Game, params: { text?: string } = {}) => {
    if (params.text) {
      game.add(params.text)
    }
  },

  /** Leave the current shop (clearScene removes scene.shop automatically) */
  leaveShop: (game: Game, params: { text?: string } = {}) => {
    if (params.text) {
      game.add(params.text)
    }
  },

  /** Run a named activity at the current location */
  runActivity: (game: Game, params: { activity?: string } = {}) => {
    const name = params.activity
    if (!name || typeof name !== 'string') {
      throw new Error('runActivity script requires an activity parameter (string name)')
    }
    const activities = game.location.template.activities || []
    const act = activities.find((a: { name: string }) => a.name === name)
    if (!act) {
      game.add('Activity not found.')
      return
    }
    game.run(act.script)
  },

  /** Run the current location's onRelax if defined; otherwise a generic message. */
  relaxAtLocation: (game: Game) => {
    const onRelax = game.location.template.onRelax
    if (onRelax) {
      game.run(onRelax)
    } else {
      game.add("There's nothing particularly relaxing to do here.")
    }
  },

  /** Examine an item (run its onExamine script) */
  examineItem: (game: Game, params: { item?: string } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('examineItem script requires an item parameter (string id)')
    }
    const def = getItem(itemId)
    if (!def?.onExamine) {
      game.add('Nothing happens.')
      return
    }
    game.run(def.onExamine)
  },

  /** Consume an item (run its onConsume script and remove from inventory) */
  consumeItem: (game: Game, params: { item?: string } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('consumeItem script requires an item parameter (string id)')
    }
    const def = getItem(itemId)
    if (!def?.onConsume) {
      game.add('You cannot use that.')
      return
    }
    const has = game.player.inventory.some((i) => i.id === itemId && i.number >= 1)
    if (!has) {
      game.add("You don't have that item.")
      return
    }
    game.player.removeItem(itemId, 1)
    game.player.calcStats()
    game.run(def.onConsume)
  },

  /** Run a named script on an NPC */
  interact: (game: Game, params: { npc?: string; script?: string; params?: object } = {}) => {
    const npcId = params.npc ?? game.scene.npc
    const scriptName = params.script
    if (!npcId || typeof npcId !== 'string') {
      throw new Error('interact script requires an npc parameter (or an active NPC scene) and a script parameter')
    }
    if (!scriptName || typeof scriptName !== 'string') {
      throw new Error('interact script requires a script parameter (string name)')
    }
    const npc = game.getNPC(npcId)
    const script = npc.template.scripts?.[scriptName]
    if (!script) {
      throw new Error(`NPC ${npcId} has no script "${scriptName}"`)
    }
    npc.stats.set('lastInteraction', game.time)
    game.timeLapse(1)
    game.run(script, (params.params ?? {}) as Record<string, unknown>)
  },

  /** Approach an NPC to talk to them */
  approach: (game: Game, params: { npc?: string } = {}) => {
    const npcId = params.npc
    if (!npcId || typeof npcId !== 'string') {
      throw new Error('approach script requires an npc parameter (string id)')
    }

    const npc = game.getNPC(npcId)
    const npcDef = npc.template

    // Plan-based AI: tick the NPC's plan before greeting (date intercept, leaving, etc.)
    // Skip if scene.npc is already set — means AI triggered this approach (e.g. approachPlayer)
    if (npc.plan && game.scene.npc !== npcId) {
      game.scene.npc = npcId
      npc.plan = game.run(npc.plan) as Instruction
      if (game.inScene) return // NPC plan created a scene — skip normal approach
      if (npc.location !== game.currentLocation) {
        game.add(`{npc} leaves before you can reach {npc:him}.`)
        return
      }
    }

    npc.approachCount++

    game.scene.npc = npcId
    game.scene.hideNpcImage = false

    // Use onFirstApproach for first meeting, onApproach for subsequent
    const isFirstApproach = npc.approachCount === 1
    const script = isFirstApproach && npcDef.onFirstApproach
      ? npcDef.onFirstApproach
      : npcDef.onApproach

    if (script) {
      game.run(script)
    } else {
      const displayName = npc.nameKnown > 0 && npcDef.name
        ? npcDef.name
        : (npcDef.uname || npcDef.description || npcDef.name || 'The NPC')
      game.add(`${displayName} isn't interested in talking to you.`)
    }
  },

  /** Push remaining scene pages onto the top stack frame. step() handles Continue. */
  pushPages: (game: Game, params: { pages?: Instruction[] }) => {
    if (!params.pages?.length) return
    game.topFrame.pages.unshift(...params.pages)
  },

  /** Push a sub-scene that replaces the current content and options.
   *  Use for interrupts (e.g. NPC initiates something mid-scene) where the player
   *  must respond to the sub-scene before the outer scene can continue. */
  replaceScene: (game: Game, params: { pages?: Instruction[] }) => {
    if (!params.pages || params.pages.length === 0) return
    game.topFrame.pages.unshift(...params.pages)
    game.clearScene()
    game.step()
  },
}

makeScripts(playerActionScripts)
