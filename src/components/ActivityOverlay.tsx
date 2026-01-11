import { useGame } from '../context/GameContext'
import { Thumbnail } from './Thumbnail'
import type { LocationActivity } from '../model/Location'
import { Game } from '../model/Game'

export function ActivityOverlay() {
  const { game, setGame } = useGame()

  if (!game) {
    return null
  }

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
    if (!game) return
    
    // Clear the scene before running the script
    game.clearScene()
    
    // Run the script (may modify game state)
    activity.script(game, {})
    
    // Run afterUpdate scripts for all cards
    game.player.cards.forEach(card => {
      const cardDef = card.template
      if (cardDef.afterUpdate) {
        cardDef.afterUpdate(game, {})
      }
    })
    
    // Trigger a React update by deserializing/reserializing to create a new reference
    // This forces re-render so the UI reflects the script changes
    const gameJson = JSON.stringify(game.toJSON())
    const updatedGame = Game.fromJSON(gameJson)
    setGame(updatedGame)
    
    // Auto-save after script execution
    localStorage.setItem('gameSave', gameJson)
  }

  return (
    <div className="activities">
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
  )
}
