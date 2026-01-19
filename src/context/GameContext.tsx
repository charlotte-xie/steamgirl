import { createContext, useContext, useState, type ReactNode } from 'react'
import { Game } from '../model/Game'
import { getScript } from '../model/Scripts'

const GAME_SAVE = 'gameSave'       // manual save/load
const GAME_SAVE_AUTO = 'gameSaveAuto' // autosave during play

type GameContextType = {
  game: Game | null
  setGame: (game: Game | null) => void
  loadGame: () => boolean
  continueGame: () => boolean
  newGame: () => void
  saveGame: () => void
  clearGame: () => void
  returnToStart: () => void
  runScript: (name: string, params?: {}) => any
}

// Default value that throws if context is accessed outside provider
const throwMissingProvider = (): never => {
  throw new Error('useGame must be used within a GameProvider')
}

const GameContext = createContext<GameContextType>({
  game: null,
  setGame: throwMissingProvider,
  loadGame: throwMissingProvider,
  continueGame: throwMissingProvider,
  newGame: throwMissingProvider,
  saveGame: throwMissingProvider,
  clearGame: throwMissingProvider,
  returnToStart: throwMissingProvider,
  runScript: throwMissingProvider,
})

export function GameProvider({ children }: { children: ReactNode }) {
  // Initialize game from localStorage on mount: prefer manual save, then autosave
  const initializeGame = (): Game | null => {
    try {
      const saved = localStorage.getItem(GAME_SAVE) ?? localStorage.getItem(GAME_SAVE_AUTO)
      if (saved) {
        return Game.fromJSON(saved)
      }
    } catch (error) {
      console.error('Failed to initialize game from localStorage:', error)
    }
    return null
  }

  const [game, setGame] = useState<Game | null>(initializeGame)
  const [, setUpdateCounter] = useState(0)

  /** Load from manual save (gameSave) only. */
  const loadGame = (): boolean => {
    try {
      const saved = localStorage.getItem(GAME_SAVE)
      if (!saved) return false
      setGame(Game.fromJSON(saved))
      return true
    } catch (error) {
      console.error('Failed to load game:', error)
      return false
    }
  }

  /** Continue: load from autosave. */
  const continueGame = (): boolean => {
    try {
      const saved = localStorage.getItem(GAME_SAVE_AUTO)
      if (!saved) return false
      setGame(Game.fromJSON(saved))
      return true
    } catch (error) {
      console.error('Failed to continue game:', error)
      return false
    }
  }

  const newGame = () => {
    const newGameInstance = new Game()
    // Run init script when game is created
    const initScript = getScript('init')
    if (initScript) {
      initScript(newGameInstance, {})
    }
    setGame(newGameInstance)
    localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(newGameInstance.toJSON()))
  }

  const saveGame = () => {
    if (game) {
      localStorage.setItem(GAME_SAVE, JSON.stringify(game.toJSON()))
    }
  }

  const clearGame = () => {
    setGame(null)
  }

  const returnToStart = () => {
    if (game) {
      localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(game.toJSON()))
    }
    setGame(null)
  }

  const runScript = (name: string, params: {} = {}) => {
    if (!game) {
      throw new Error('Cannot run script: no game loaded')
    }
    
    // Take the action (clears scene, runs script)
    game.takeAction(name, params)
    
    // Run after-action effects (card updates, NPC movement, etc.)
    game.afterAction()
    
    // Trigger a React update by incrementing a counter
    // This forces re-render without serialization/deserialization
    setUpdateCounter(prev => prev + 1)
    
    // autoSave
    localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(game.toJSON()))
  }

  return (
    <GameContext.Provider value={{ game, setGame, loadGame, continueGame, newGame, saveGame, clearGame, returnToStart, runScript }}>
      {children}
    </GameContext.Provider>
  )
} 

export function useGame(): GameContextType {
  return useContext(GameContext)
}

