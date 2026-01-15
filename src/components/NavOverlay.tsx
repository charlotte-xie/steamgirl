import { useGame } from '../context/GameContext'
import { getLocation } from '../model/Location'
import { Thumbnail } from './Thumbnail'
import type { LocationLink } from '../model/Location'

export function NavOverlay() {
  const { game, runScript } = useGame()

  if (!game) {
    return null
  }

  const links = game.location.template.links || []
  
  if (links.length === 0) {
    return null
  }

  const handleLocationClick = (link: LocationLink) => {
    if (game) {
      // Check access before allowing navigation
      if (link.checkAccess) {
        const accessReason = link.checkAccess(game)
        if (accessReason) {
          game.add(accessReason)
          return
        }
      }
      runScript('go', { location: link.dest, minutes: link.time })
    }
  }

  // Filter links to only show discovered locations
  const discoveredLinks = links.filter(link => {
    const gameLocation = game.getLocation(link.dest)
    
    // If secret, default to false (undiscovered), otherwise true (discovered)
    return gameLocation.discovered
  })

  if (discoveredLinks.length === 0) {
    return null
  }

  return (
    <div className="nav-links">
      {discoveredLinks.map((link, index) => {
        const targetLocation = getLocation(link.dest)
        if (!targetLocation) return null

        // Check if access is denied
        const accessReason = link.checkAccess ? link.checkAccess(game) : null
        const isDisabled = !!accessReason

        return (
          <Thumbnail
            key={index}
            image={targetLocation.image}
            name={targetLocation.name || link.dest}
            subtitle={`${link.time} min`}
            onClick={() => handleLocationClick(link)}
            title={`${targetLocation.name || link.dest} (${link.time} min)`}
            disabled={isDisabled}
            disabledReason={accessReason || undefined}
          />
        )
      })}
    </div>
  )
}
