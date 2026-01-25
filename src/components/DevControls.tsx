import { useGame } from '../context/GameContext'
import { useGameLoader } from '../context/GameLoaderContext'
import { Game } from '../model/Game'

export function DevControls() {
  const { game, setGame, refresh } = useGame()
  const { quickRestart, saveGame, loadGameSave, hasManualSave } = useGameLoader()

  return (
    <div className="dev-controls-overlay">
      <button className="dev-btn" onClick={() => quickRestart({ replace: true })} title="Restart game">
        <span className="dev-btn-icon">↺</span>
        <span className="dev-btn-label">Restart</span>
      </button>
      <button className="dev-btn" onClick={() => saveGame(game)} title="Save game">
        <span className="dev-btn-icon">💾</span>
        <span className="dev-btn-label">Save</span>
      </button>
      <button
        className="dev-btn"
        disabled={!hasManualSave}
        onClick={() => {
          const g = loadGameSave()
          if (g) setGame(g)
        }}
        title="Load saved game"
      >
        <span className="dev-btn-icon">📂</span>
        <span className="dev-btn-label">Load</span>
      </button>
      <button
        className="dev-btn"
        onClick={() => setGame(Game.fromJSON(JSON.stringify(game.toJSON())))}
        title="Reload current state"
      >
        <span className="dev-btn-icon">🔄</span>
        <span className="dev-btn-label">Reload</span>
      </button>
      <button
        className="dev-btn"
        onClick={() => { game.player.addItem('crown', 1000); refresh() }}
        title="Add 1000 Krona"
      >
        <span className="dev-btn-icon">💰</span>
        <span className="dev-btn-label">+1k Kr</span>
      </button>
    </div>
  )
}
