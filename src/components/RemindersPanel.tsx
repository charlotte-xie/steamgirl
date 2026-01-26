import { useGame } from '../context/GameContext'

export function RemindersPanel() {
  const { game } = useGame()
  const reminders = game.reminders

  if (reminders.length === 0) return null

  return (
    <div className="reminders-panel">
      {reminders.map((r, i) => (
        <div key={i} className={`reminder-item reminder-${r.urgency}`} title={r.detail}>
          <span className="reminder-bullet" />
          <span className="reminder-text">{r.text}</span>
        </div>
      ))}
    </div>
  )
}
