import { Clock } from './Clock'
import { StatsPanel } from './StatsPanel'
import { AvatarPanel } from './AvatarPanel'
import { ScreenSwitcher, type ScreenId } from './ScreenSwitcher'

interface PlayerPanelProps {
  currentScreen: ScreenId
  onScreenChange: (screen: ScreenId) => void
}

export function PlayerPanel({ currentScreen, onScreenChange }: PlayerPanelProps) {
  return (
    <div className="player-panel panel-elevated" style={{ height: '100%' }}>
      <AvatarPanel />

      <div className="widget-container">
        <Clock />
      </div>

      <div className="status-panel">
        <StatsPanel />
      </div>

      <ScreenSwitcher currentScreen={currentScreen} onScreenChange={onScreenChange} />
    </div>
  )
}
