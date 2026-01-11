import { SceneOverlay } from './SceneOverlay'
import { NavOverlay } from './NavOverlay'
import { ActivityOverlay } from './ActivityOverlay'
import { Location } from '../model/Location'
import { useGame } from '../context/GameContext'

interface LocationViewProps {
  location: Location
}

export function LocationView({ location }: LocationViewProps) {
  const { game } = useGame()
  const template = location.template
  
  // Determine which image to use based on time
  let locationImage = template.image
  if (game && template.nightImage) {
    const currentDate = new Date(game.time * 1000)
    const currentHour = currentDate.getHours()
    // Between 8pm (20:00) and 6am (06:00)
    if (currentHour >= 20 || currentHour < 6) {
      locationImage = template.nightImage
    }
  }
  
  const scene = game?.scene
  const sceneHasOptions = scene && scene.options.length > 0
  const sceneHasContent = scene && scene.content.length > 0
  const showLocationLinks = !(sceneHasOptions)
  const showActivities = template.activities && template.activities.length > 0 && !sceneHasOptions

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(locationImage && {
          backgroundImage: `url(${locationImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }),
      }}
    >
      <div style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {!locationImage && <p>No Location</p>}
      </div>
      <div className="overlays-container">
        {(sceneHasContent||sceneHasContent) && <SceneOverlay scene={scene} />}
      </div>
      <div className="bottom-overlays">
        {showActivities && <ActivityOverlay />}
        {showLocationLinks && <NavOverlay />}
      </div>
    </div>
  )
}
