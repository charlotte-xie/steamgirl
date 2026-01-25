import { Button } from './Button'
import { useGame } from '../context/GameContext'
import { useGameLoader } from '../context/GameLoaderContext'
import { Clock } from './Clock'
import { WaitPanel } from './WaitPanel'
import { Game } from '../model/Game'
import { StatsPanel } from './StatsPanel'
import { EffectTag } from './EffectTag'
import { AvatarPanel } from './AvatarPanel'
import { ScreenSwitcher, type ScreenId } from './ScreenSwitcher'

interface PlayerPanelProps {
  currentScreen: ScreenId
  onScreenChange: (screen: ScreenId) => void
}

export function PlayerPanel({ currentScreen, onScreenChange }: PlayerPanelProps) {
  const { game, setGame } = useGame()
  const { quickRestart, saveGame, loadGameSave, hasManualSave } = useGameLoader()

  const effectCards = game.player.cards.filter(card => card && card.type === 'Effect') || []

  return (
    <div className="player-panel panel-elevated" style={{ height: '100%' }}>
      <AvatarPanel />

      <div className="widget-container">
        <Clock />
        <WaitPanel />
      </div>

      <div className="status-panel">
        <StatsPanel />

        {effectCards.length > 0 && (
          <div className="effects-section">
            <h4>Effects</h4>
            <div className="effects-list">
              {effectCards.map((card, index) => (
                <EffectTag key={`${card.id}-${index}`} card={card} />
              ))}
            </div>
          </div>
        )}
      </div>

      <ScreenSwitcher currentScreen={currentScreen} onScreenChange={onScreenChange} />

      <div className="dev-controls">
        <Button onClick={() => quickRestart({ replace: true })}>
          Restart
        </Button>
        <Button onClick={() => saveGame(game)}>
          Save
        </Button>
        <Button
          disabled={!hasManualSave}
          onClick={() => {
            const g = loadGameSave()
            if (g) setGame(g)
          }}
        >
          Load
        </Button>
        <Button onClick={() => setGame(Game.fromJSON(JSON.stringify(game.toJSON())))}>
          Reload
        </Button>
      </div>
    </div>
  )
}
