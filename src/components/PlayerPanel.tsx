import { Button } from './Button'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { Clock } from './Clock'
import { InventoryView } from './InventoryView'
import { Game } from '../model/Game'

export function PlayerPanel() {
  const navigate = useNavigate()
  const { game, newGame, saveGame, loadGame, setGame } = useGame()

  return (
    <div className="player-panel panel-elevated" style={{ height: '100%' }}>
      <div className="avatar-container">
        <div className="avatar-frame">
          <div className="rivet rivet-tl"></div>
          <div className="rivet rivet-tr"></div>
          <div className="rivet rivet-bl"></div>
          <div className="rivet rivet-br"></div>
          <div className="avatar-rivet avatar-rivet-bl"></div>
          <div className="avatar-rivet avatar-rivet-br"></div>
          <div className="avatar-placeholder">
            <img 
              src="/girl/SteamGirl.png" 
              alt="Player Avatar"
            />
          </div>
        </div>
      </div>

      <main className="game-canvas canvas-framed" >
        <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <p>Name: {game?.player.name || 'Unknown'}</p>
          <Clock />
          <InventoryView />
        </div>
      </main>

      <div className="dev-controls">
        <Button onClick={() => { newGame() }}>
          Restart
        </Button>
        <Button onClick={saveGame}>
          Save
        </Button>
        <Button onClick={loadGame}>
          Load
        </Button>
        <Button onClick={() => {
          if (game) {
            const gameJson = JSON.stringify(game.toJSON())
            const reloadedGame = Game.fromJSON(gameJson)
            setGame(reloadedGame)
          }
        }}>
          Reload
        </Button>
        <Button onClick={() => navigate('/start')}>
          Home
        </Button>
      </div>
    </div> 
  )
}
