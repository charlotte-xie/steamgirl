import { Button } from '../components/Button'
import { CenteredContent } from '../components/CenteredContent'
import { useGame } from '../context/GameContext'
import { useNavigate } from 'react-router-dom'

export function StartScreen() {
  const { game, newGame, loadGame, continueGame } = useGame()
  const navigate = useNavigate()
  
  // Check if a Game is present (either in context or saved in localStorage)
  const hasGame = game !== null || localStorage.getItem('gameSave') !== null || localStorage.getItem('gameSaveAuto') !== null

  const handleContinue = () => {
    if (continueGame()) {
      navigate('/game')
    }
  }

  const handleNewGame = () => {
    newGame()
    navigate('/game')
  }

  const handleLoadGame = () => {
    // TODO: Implement file picker or load dialog
    if (loadGame()) {
      navigate('/game')
    }
  }

  const handleSettings = () => {
    // TODO: Implement settings
  }

  const handleDemo = () => {
    navigate('/demo')
  }

  return (
    <CenteredContent>
      <div className="button-column">
        <Button color="#f97316" disabled={!hasGame} onClick={handleContinue}>
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
        <Button color="#eab308" onClick={handleDemo}>
          Demo
        </Button>
      </div>
    </CenteredContent>
  )
}

