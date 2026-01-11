import { SceneOverlay } from './SceneOverlay'
import { NavOverlay } from './NavOverlay'
import { Location } from '../model/Location'
import { useGame } from '../context/GameContext'

interface LocationViewProps {
  location: Location
}

export function LocationView({ location }: LocationViewProps) {
  const { game } = useGame()
  const locationImage = location.template.image
  const scene = game?.scene
  const sceneHasOptions = scene && scene.options.length > 0
  const sceneHasContent = scene && scene.content.length > 0
  const showLocationLinks = !(sceneHasOptions)

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
        {showLocationLinks && <NavOverlay />}
      </div>
    </div>
  )
}
