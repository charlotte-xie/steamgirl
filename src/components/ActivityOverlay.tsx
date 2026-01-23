import { useGame } from '../context/GameContext'
import { Thumbnail } from './Thumbnail'
import type { LocationActivity } from '../model/Location'

export function ActivityOverlay() {
  const { game, runScript } = useGame()

  const activities = game.location.template.activities || []
  
  if (activities.length === 0) {
    return null
  }

  // Filter activities by condition: if condition exists, run it and only show if it returns true
  // Default to true if no condition
  const visibleActivities = activities.filter((activity) => {
    if (!activity.condition) {
      return true
    }
    const result = activity.condition(game, {})
    return Boolean(result)
  })

  if (visibleActivities.length === 0) {
    return null
  }

  const handleActivityClick = (activity: LocationActivity) => {
    runScript('runActivity', { activity: activity.name })
  }

  return (
    <div className="overlay-group">
      <div className="overlay-group-title">Activities</div>
      <div className="overlay-group-content">
      {visibleActivities.map((activity, index) => (
        <Thumbnail
          key={index}
          image={activity.image}
          name={activity.name}
          symbol={activity.symbol}
          onClick={() => handleActivityClick(activity)}
          title={activity.name}
        />
      ))}
      </div>
    </div>
  )
}
