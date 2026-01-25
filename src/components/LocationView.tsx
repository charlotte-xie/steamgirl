import { SceneOverlay } from './SceneOverlay'
import { ShopOverlay } from './ShopOverlay'
import { NavOverlay } from './NavOverlay'
import { ActivityOverlay } from './ActivityOverlay'
import { NPCOverlay } from './NPCOverlay'
import { Location } from '../model/Location'
import { useGame } from '../context/GameContext'
import { assetUrl } from '../utils/assetUrl'

interface LocationViewProps {
  location: Location
}

export function LocationView({ location }: LocationViewProps) {
  const { game } = useGame()
  game.beforeAction()

  const template = location.template
  let locationImage = template.image
  if (template.nightImage) {
    const currentHour = Math.floor(game.hourOfDay)
    if (currentHour >= 20 || currentHour < 6) {
      locationImage = template.nightImage
    }
  }

  const scene = game.scene
  const hasShop = !!scene.shop
  const sceneHasOptions = scene.options.length > 0
  const sceneHasContent = scene.content.length > 0
  const showLocationLinks = !sceneHasOptions && !hasShop
  const showActivities = !!(template.activities && template.activities.length > 0 && !sceneHasOptions && !hasShop)
  const showNPCs = game.npcsPresent.length > 0 && !sceneHasOptions && !hasShop

  return (
    <div
      className="location-view"
      style={{
        ...(locationImage && {
          backgroundImage: `url(${assetUrl(locationImage)})`,
        }),
      }}
    >
      <div style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {!locationImage && <p>No Location</p>}
      </div>
      <div className="overlays-container">
        {hasShop && <ShopOverlay shop={scene.shop!} />}
        {!hasShop && (sceneHasContent || sceneHasOptions) && <SceneOverlay scene={scene} />}
      </div>
      <div className="bottom-overlays">
        {showActivities && <ActivityOverlay />}
        {showNPCs && <NPCOverlay />}
        {showLocationLinks && <NavOverlay />}
      </div>
    </div>
  )
}
