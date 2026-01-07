import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { DemoControls } from './DemoControls'
import { StartScreen } from './StartScreen'
import { Button } from '../components/Button'

export function GameScreen() {
  const { game, returnToStart } = useGame()
  const [showDemo, setShowDemo] = useState(false)

  return (
    <div className="game-screen">
      <div className="game-ui panel-elevated">
        <header className="game-header">
          <h1>Game Screen</h1>
          <p className="subtitle text-muted">Full-screen React view</p>
        </header>

        <main className="game-canvas canvas-framed">
          {showDemo ? (
            <DemoControls />
          ) : game ? (
            <div>
              <p>Game loaded! Score: {game.score ?? 0}</p>
              <p>Player: {game.player.name ?? 'Unnamed'}</p>
            </div>
          ) : (
            <StartScreen />
          )}
        </main>

        <div className="dev-controls">
          <Button color="#ef4444" onClick={() => setShowDemo(!showDemo)}>
            {showDemo ? 'Back to Game' : 'Dev: Demo Controls'}
          </Button>
          {game && (
            <Button color="#6b7280" onClick={returnToStart}>
              Return to Start
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

