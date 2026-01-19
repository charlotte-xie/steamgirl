import { createContext, useContext, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Game } from '../model/Game'
import { getScript } from '../model/Scripts'
import { GAME_SAVE, GAME_SAVE_AUTO } from '../constants/storage'

type GameLoaderContextType = {
  newGame: (opts?: { replace?: boolean }) => void
  loadGame: () => boolean
  continueGame: () => boolean
  hasGame: boolean
  hasManualSave: boolean
  loadGameSave: () => Game | null
  saveGame: (game: Game) => void
  returnToStart: (game: Game) => void
  clearGame: () => void
}

const throwMissingProvider = (): never => {
  throw new Error('useGameLoader must be used within a GameLoaderProvider')
}

const GameLoaderContext = createContext<GameLoaderContextType>({
  newGame: throwMissingProvider,
  loadGame: throwMissingProvider,
  continueGame: throwMissingProvider,
  hasGame: false,
  hasManualSave: false,
  loadGameSave: throwMissingProvider,
  saveGame: throwMissingProvider,
  returnToStart: throwMissingProvider,
  clearGame: throwMissingProvider,
})

export function GameLoaderProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const newGame = (opts?: { replace?: boolean }) => {
    const g = new Game()
    const init = getScript('init')
    if (init) init(g, {})
    localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(g.toJSON()))
    const state = opts?.replace ? { source: 'newGame' as const, _t: Date.now() } : { source: 'newGame' as const }
    navigate('/game', { state, replace: opts?.replace })
  }

  const loadGame = (): boolean => {
    if (!localStorage.getItem(GAME_SAVE)) return false
    navigate('/game', { state: { source: 'loadGame' } })
    return true
  }

  const continueGame = (): boolean => {
    if (!localStorage.getItem(GAME_SAVE_AUTO)) return false
    navigate('/game', { state: { source: 'continueGame' } })
    return true
  }

  const hasGame = !!(localStorage.getItem(GAME_SAVE) ?? localStorage.getItem(GAME_SAVE_AUTO))
  const hasManualSave = !!localStorage.getItem(GAME_SAVE)

  const loadGameSave = (): Game | null => {
    try {
      const json = localStorage.getItem(GAME_SAVE)
      return json ? Game.fromJSON(json) : null
    } catch (e) {
      console.error('Failed to load game from storage:', e)
      return null
    }
  }

  const saveGame = (game: Game) => {
    localStorage.setItem(GAME_SAVE, JSON.stringify(game.toJSON()))
  }

  const returnToStart = (game: Game) => {
    localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(game.toJSON()))
    navigate('/start')
  }

  const clearGame = () => {
    navigate('/start')
  }

  return (
    <GameLoaderContext.Provider
      value={{
        newGame,
        loadGame,
        continueGame,
        hasGame,
        hasManualSave,
        loadGameSave,
        saveGame,
        returnToStart,
        clearGame,
      }}
    >
      {children}
    </GameLoaderContext.Provider>
  )
}

export function useGameLoader(): GameLoaderContextType {
  return useContext(GameLoaderContext)
}
