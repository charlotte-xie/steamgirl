import { Button } from '../components/Button'
import { useGame } from '../context/GameContext'

export function StartScreen() {
  const { newGame, loadGame } = useGame()
  const hasSavedGame = localStorage.getItem('gameSave') !== null

  const handleContinue = () => {
    const saved = localStorage.getItem('gameSave')
    if (saved) {
      loadGame(saved)
    }
  }

  const handleNewGame = () => {
    newGame()
  }

  const handleLoadGame = () => {
    // TODO: Implement file picker or load dialog
    const saved = localStorage.getItem('gameSave')
    if (saved) {
      loadGame(saved)
    }
  }

  const handleSettings = () => {
    // TODO: Implement settings
  }

  return (
    <div className="button-row">
      <Button color="#f97316" disabled={!hasSavedGame} onClick={handleContinue}>
        Continue
      </Button>
      <Button color="#22c55e" onClick={handleNewGame}>
        New Game
      </Button>
      <Button color="#3b82f6" onClick={handleLoadGame}>
        Load Game
      </Button>
      <Button color="#a855f7" onClick={handleSettings}>
        Settings
      </Button>
    </div>
  )
}

