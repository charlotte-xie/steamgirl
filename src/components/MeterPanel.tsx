import { useGame } from '../context/GameContext'
import { METER_INFO, type MeterName } from '../model/Stats'
import { SteamGauge } from './SteamGauge'

// Primary meters shown as gauges
const GAUGE_METERS: MeterName[] = ['Energy', 'Composure', 'Mood']

// Secondary meters shown as bars (only when value > 0)
const BAR_METERS: MeterName[] = ['Arousal', 'Stress', 'Pain']

export function MeterPanel() {
  const { game } = useGame()

  // Filter bar meters to show only those with value > 0
  const visibleBarMeters = BAR_METERS.filter(meterName => {
    const value = game.player.stats.get(meterName) || 0
    return value > 0
  })

  return (
    <div className="meter-panel">
      {/* Gauge meters in a row */}
      <div className="meter-gauges">
        {GAUGE_METERS.map((meterName) => {
          const meterValue = game.player.stats.get(meterName) || 0
          const meterInfo = METER_INFO[meterName]
          const tooltip = `${meterName} = ${meterValue}\n${meterInfo.description}`
          return (
            <SteamGauge
              key={meterName}
              value={meterValue}
              label={meterName}
              color={meterInfo.gainColor}
              description={tooltip}
            />
          )
        })}
      </div>

      {/* Bar meters below (only shown when active) */}
      {visibleBarMeters.length > 0 && (
        <div className="meter-bars">
          {visibleBarMeters.map((meterName) => {
            const meterValue = game.player.stats.get(meterName) || 0
            const meterInfo = METER_INFO[meterName]
            const percent = Math.max(0, Math.min(100, meterValue))

            const tooltip = `${meterName} = ${meterValue}\n${meterInfo.description}`

            return (
              <div key={meterName} className="meter-bar-row">
                <span
                  className="meter-bar-label"
                  title={tooltip}
                >
                  {meterName}
                </span>
                <div className="meter-bar-track">
                  <div
                    className="meter-bar-fill"
                    style={{
                      width: `${percent}%`,
                      background: `linear-gradient(90deg, ${meterInfo.gainColor}, ${meterInfo.gainColor}dd)`,
                    }}
                  />
                </div>
                <span className="meter-bar-value">{meterValue}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
