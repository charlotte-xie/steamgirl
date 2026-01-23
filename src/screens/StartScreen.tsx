import { Button } from '../components/Button'
import { CenteredContent } from '../components/CenteredContent'
import { useGameLoader } from '../context/GameLoaderContext'
import { useNavigate } from 'react-router-dom'

export function StartScreen() {
  const { newGame, loadGame, continueGame, hasGame } = useGameLoader()
  const navigate = useNavigate()

  const handleSettings = () => {
    // TODO: Implement settings
  }

  const handleDemo = () => {
    navigate('/demo')
  }

  return (
    <CenteredContent>
      <div className="button-column">
        <Button color="#f97316" disabled={!hasGame} onClick={() => continueGame()}>
          Continue
        </Button>
        <Button color="#22c55e" onClick={newGame}>
          New Game
        </Button>
        <Button color="#3b82f6" onClick={() => loadGame()}>
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

