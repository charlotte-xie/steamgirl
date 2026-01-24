import { useGame } from '../context/GameContext'
import { Widget } from './Widget'

export function WaitPanel() {
  const { game, runScript } = useGame()
  const inScene = game.inScene

  return (
    <Widget>
      <div className="wait-layout">
        <div className="wait-label">Wait…</div>
        <div className="clock-wait-buttons">
          {([1, 10, 60, 360] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="clock-wait-btn"
              disabled={inScene}
              onClick={() => runScript('wait', { minutes: m, text: 'You wait for a while.' })}
              title={`Wait ${m} minute${m === 1 ? '' : 's'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </Widget>
  )
}
