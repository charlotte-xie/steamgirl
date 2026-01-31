import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Game } from '../model/Game'
import { getScript, type Instruction } from '../model/Scripts'
import { GAME_SAVE, GAME_SAVE_AUTO, DEBUG_MODE } from '../constants/storage'
import type { Specialty } from '../screens/NewCharacterScreen'
import type { Hairstyle } from '../model/Player'

export type CharacterOptions = {
  name: string
  specialty: Specialty | null
  hairstyle?: Hairstyle
}

type GameContextType = {
  game: Game
  setGame: (game: Game) => void
  runScript: (action: string | Instruction) => void
  dismissScene: () => void
  initializeCharacter: (options: CharacterOptions) => void
  refresh: () => void
  updateCounter: number
}

const throwMissing = (): never => {
  throw new Error('useGame must be used within a GameProvider')
}

const GameContext = createContext<GameContextType>({
  game: undefined! as Game,
  setGame: throwMissing,
  runScript: throwMissing,
  dismissScene: throwMissing,
  initializeCharacter: throwMissing,
  refresh: throwMissing,
  updateCounter: 0,
})

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

function getDebugFromStorage(): boolean {
  const stored = localStorage.getItem(DEBUG_MODE)
  if (stored !== null) return stored === 'true'
  return isLocalhost
}

function loadFromState(state: Record<string, unknown> | null): Game | null {
  try {
    let json: string | null = null
    if (state?.gameJson && typeof state.gameJson === 'string') {
      // New game passed via navigation state (avoids overwriting autosave)
      json = state.gameJson
    } else if (state?.source === 'loadGame') {
      json = localStorage.getItem(GAME_SAVE)
    } else {
      // For continueGame or page reload (no source), use autosave
      json = localStorage.getItem(GAME_SAVE_AUTO)
    }
    const game = json ? Game.fromJSON(json) : null
    if (game) game.isDebug = getDebugFromStorage()
    return game
  } catch (e) {
    console.error('Failed to load game from storage:', e)
    console.error('Autosave JSON length:', localStorage.getItem(GAME_SAVE_AUTO)?.length ?? 'none')
    return null
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { state } = useLocation()
  const [game, setGame] = useState<Game | null>(() => loadFromState(state))
  const [updateCounter, setUpdateCounter] = useState(0)

  if (!game) {
    return <Navigate to="/start" replace />
  }

  const runScript = (action: string | Instruction) => {
    game.takeAction(action)
    game.afterAction()
    setUpdateCounter((c) => c + 1)
    localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(game.toJSON()))
  }

  const dismissScene = () => {
    game.dismissScene()
    setUpdateCounter((c) => c + 1)
  }

  const refresh = () => {
    setUpdateCounter((c) => c + 1)
  }

  const initializeCharacter = (options: CharacterOptions) => {
    // Run the init script to set up the game
    const init = getScript('init')
    if (init) init(game, { specialty: options.specialty })

    // Override the player name and hairstyle with the user's choices
    game.player.name = options.name
    game.player.hairstyle = options.hairstyle ?? 'buns'

    // Apply specialty bonuses (if a specialty was chosen)
    if (options.specialty) {
      switch (options.specialty) {
        case 'Aetherics':
          game.player.basestats.set('Aetherics', (game.player.basestats.get('Aetherics') ?? 0) + 10)
          game.player.basestats.set('Perception', (game.player.basestats.get('Perception') ?? 0) + 5)
          break
        case 'Mechanics':
          game.player.basestats.set('Mechanics', (game.player.basestats.get('Mechanics') ?? 0) + 10)
          game.player.basestats.set('Wits', (game.player.basestats.get('Wits') ?? 0) + 5)
          break
        case 'Flirtation':
          game.player.basestats.set('Flirtation', (game.player.basestats.get('Flirtation') ?? 0) + 10)
          game.player.basestats.set('Charm', (game.player.basestats.get('Charm') ?? 0) + 5)
          break
      }
    }

    // Recalculate stats after applying bonuses
    game.player.calcStats()

    // Save the game
    setUpdateCounter((c) => c + 1)
    localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(game.toJSON()))
  }

  return (
    <GameContext.Provider
      value={{ game, setGame, runScript, dismissScene, initializeCharacter, refresh, updateCounter }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame(): GameContextType {
  return useContext(GameContext)
}
