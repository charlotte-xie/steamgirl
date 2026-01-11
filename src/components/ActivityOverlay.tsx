import { useGame } from '../context/GameContext'
import { Thumbnail } from './Thumbnail'
import type { LocationActivity } from '../model/Location'

export function ActivityOverlay() {
  const { game, runScript } = useGame()

  if (!game) {
    return null
  }

  const activities = game.location.template.activities || []
  
  if (activities.length === 0) {
    return null
  }

  const handleActivityClick = (activity: LocationActivity) => {
    const [scriptName, params] = activity.script
    runScript(scriptName, params)
  }

  return (
    <div className="activities">
      {activities.map((activity, index) => (
        <Thumbnail
          key={index}
          image={activity.image}
          name={activity.name}
          onClick={() => handleActivityClick(activity)}
          title={activity.name}
        />
      ))}
    </div>
  )
}
