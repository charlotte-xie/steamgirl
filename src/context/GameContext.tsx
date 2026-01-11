import { createContext, useContext, useState, type ReactNode } from 'react'
import { Game } from '../model/Game'
import { runScript as runScriptImpl } from '../model/Scripts'

type GameContextType = {
  game: Game | null
  setGame: (game: Game | null) => void
  loadGame: () => boolean
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
  newGame: throwMissingProvider,
  saveGame: throwMissingProvider,
  clearGame: throwMissingProvider,
  returnToStart: throwMissingProvider,
  runScript: throwMissingProvider,
})

export function GameProvider({ children }: { children: ReactNode }) {
  // Initialize game from localStorage on mount
  const initializeGame = (): Game | null => {
    try {
      const saved = localStorage.getItem('gameSave')
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

  const loadGame = (): boolean => {
    try {
      const saved = localStorage.getItem('gameSaveManual')
      if (!saved) {
        return false
      }
      const loadedGame = Game.fromJSON(saved)
      setGame(loadedGame)
      return true
    } catch (error) {
      console.error('Failed to load game:', error)
      return false
    }
  }

  const newGame = () => {
    const newGameInstance = new Game()
    // Run start script when game is created
    runScriptImpl('start', newGameInstance, {})
    setGame(newGameInstance)
    localStorage.setItem('gameSave', JSON.stringify(newGameInstance.toJSON()))
  }

  const saveGame = () => {
    if (game) {
      localStorage.setItem('gameSaveManual', JSON.stringify(game.toJSON()))
    }
  }

  const clearGame = () => {
    setGame(null)
  }

  const returnToStart = () => {
    if (game) {
      // Save current game state to autosave slot before returning to start
      localStorage.setItem('gameSave', JSON.stringify(game.toJSON()))
    }
    setGame(null)
  }

  const runScript = (name: string, params: {} = {}) => {
    if (!game) {
      throw new Error('Cannot run script: no game loaded')
    }
    
    // Clear the scene before running a new script
    game.clearScene()
    
    // Run the script (may modify game state)
    const result = runScriptImpl(name, game, params)
    
    // Run afterUpdate scripts for all cards
    game.player.cards.forEach(card => {
      const cardDef = card.template
      if (cardDef.afterUpdate) {
        cardDef.afterUpdate(game, {})
      }
    })
    
    // Trigger a React update by incrementing a counter
    // This forces re-render without serialization/deserialization
    setUpdateCounter(prev => prev + 1)
    
    // Auto-save after script execution
    localStorage.setItem('gameSave', JSON.stringify(game.toJSON()))
    
    return result
  }

  return (
    <GameContext.Provider value={{ game, setGame, loadGame, newGame, saveGame, clearGame, returnToStart, runScript }}>
      {children}
    </GameContext.Provider>
  )
} 

export function useGame(): GameContextType {
  return useContext(GameContext)
}

