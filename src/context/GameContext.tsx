import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Game } from '../model/Game'
import { GAME_SAVE, GAME_SAVE_AUTO } from '../constants/storage'

type GameContextType = {
  game: Game
  setGame: (game: Game) => void
  runScript: (name: string, params?: {}) => void
  dismissScene: () => void
}

const throwMissing = (): never => {
  throw new Error('useGame must be used within a GameProvider')
}

const GameContext = createContext<GameContextType>({
  game: undefined! as Game,
  setGame: throwMissing,
  runScript: throwMissing,
  dismissScene: throwMissing,
})

function loadFromStorage(source: unknown): Game | null {
  try {
    let json: string | null = null
    if (source === 'loadGame') {
      json = localStorage.getItem(GAME_SAVE)
    } else if (source === 'newGame' || source === 'continueGame') {
      json = localStorage.getItem(GAME_SAVE_AUTO)
    } else {
      json = localStorage.getItem(GAME_SAVE) ?? localStorage.getItem(GAME_SAVE_AUTO)
    }
    return json ? Game.fromJSON(json) : null
  } catch (e) {
    console.error('Failed to load game from storage:', e)
    return null
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { state } = useLocation()
  const [game, setGame] = useState<Game | null>(() => loadFromStorage(state?.source))
  const [, setUpdateCounter] = useState(0)

  if (!game) {
    return <Navigate to="/start" replace />
  }

  const runScript = (name: string, params: {} = {}) => {
    game.takeAction(name, params)
    game.afterAction()
    setUpdateCounter((c) => c + 1)
    localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(game.toJSON()))
  }

  const dismissScene = () => {
    game.clearScene()
    setUpdateCounter((c) => c + 1)
  }

  return (
    <GameContext.Provider
      value={{ game, setGame, runScript, dismissScene }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame(): GameContextType {
  return useContext(GameContext)
}
