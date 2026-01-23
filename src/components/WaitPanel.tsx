import { useGame } from '../context/GameContext'
import { Widget } from './Widget'

export function WaitPanel() {
  const { game, runScript } = useGame()
  const inScene = game.inScene

  return (
    <Widget>
      <div style={{ position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', color: '#f4e4c4', fontSize: '14px', fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '0.1em' }}>
        Wait…
      </div>
      <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
        <div className="clock-wait-buttons">
          {([1, 10, 60] as const).map((m) => (
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
