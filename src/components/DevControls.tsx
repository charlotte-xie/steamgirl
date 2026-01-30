import { useGame } from '../context/GameContext'
import { useGameLoader } from '../context/GameLoaderContext'
import { Game } from '../model/Game'
import { STAT_NAMES, SKILL_NAMES } from '../model/Stats'
import { GAME_SAVE_AUTO } from '../constants/storage'

export function DevControls() {
  const { game, setGame, refresh } = useGame()
  const { quickRestart, saveGame, loadGameSave, hasManualSave } = useGameLoader()

  /** Recalculate stats, trigger re-render, and auto-save after any dev mutation. */
  const applyAndSave = () => {
    game.player.calcStats()
    refresh()
    localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(game.toJSON()))
  }

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
        onClick={() => refresh()}
        title="Force re-render"
      >
        <span className="dev-btn-icon">⟳</span>
        <span className="dev-btn-label">Refresh</span>
      </button>
      <button
        className="dev-btn"
        onClick={() => { game.player.addItem('crown', 1000); applyAndSave() }}
        title="Add 1000 Krona"
      >
        <span className="dev-btn-icon">💰</span>
        <span className="dev-btn-label">+1k Kr</span>
      </button>
      <button
        className="dev-btn"
        onClick={() => {
          game.player.cards = game.player.cards.filter(c => c.type !== 'Effect')
          applyAndSave()
        }}
        title="Remove all effects"
      >
        <span className="dev-btn-icon">✕</span>
        <span className="dev-btn-label">-Effects</span>
      </button>
      <button
        className="dev-btn"
        onClick={() => {
          for (const stat of STAT_NAMES) {
            const cur = game.player.basestats.get(stat) ?? 0
            game.player.basestats.set(stat, Math.min(100, cur + 10))
          }
          for (const skill of SKILL_NAMES) {
            const cur = game.player.basestats.get(skill) ?? 0
            game.player.basestats.set(skill, Math.min(100, cur + 10))
          }
          applyAndSave()
        }}
        title="Add +10 to all stats and skills"
      >
        <span className="dev-btn-icon">+</span>
        <span className="dev-btn-label">Stats+</span>
      </button>
    </div>
  )
}
