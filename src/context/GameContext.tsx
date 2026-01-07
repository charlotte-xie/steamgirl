import { createContext, useContext, useState, type ReactNode } from 'react'
import { Game, type GameData } from '../model/Game'

type GameContextType = {
  game: Game | null
  setGame: (game: Game | null) => void
  loadGame: (data: string | GameData) => void
  newGame: () => void
  saveGame: () => void
  clearGame: () => void
  returnToStart: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game | null>(null)

  const loadGame = (data: string | GameData) => {
    try {
      const loadedGame = Game.fromJSON(data)
      setGame(loadedGame)
      localStorage.setItem('gameSave', JSON.stringify(loadedGame.toJSON()))
    } catch (error) {
      console.error('Failed to load game:', error)
    }
  }

  const newGame = () => {
    const newGameInstance = new Game()
    setGame(newGameInstance)
    localStorage.setItem('gameSave', JSON.stringify(newGameInstance.toJSON()))
  }

  const saveGame = () => {
    if (game) {
      localStorage.setItem('gameSave', JSON.stringify(game.toJSON()))
    }
  }

  const clearGame = () => {
    setGame(null)
    localStorage.removeItem('gameSave')
  }

  const returnToStart = () => {
    if (game) {
      // Save current game state to autosave slot before returning to start
      localStorage.setItem('gameSave', JSON.stringify(game.toJSON()))
    }
    setGame(null)
  }

  return (
    <GameContext.Provider value={{ game, setGame, loadGame, newGame, saveGame, clearGame, returnToStart }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

