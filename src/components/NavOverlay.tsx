import { useGame } from '../context/GameContext'
import { getLocation } from '../model/Location'
import { getScript } from '../model/Scripts'
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
    const targetLocation = getLocation(link.dest)
    if (targetLocation && game) {
      const goScript = getScript('go')
      if (goScript) {
        runScript('go', { location: link.dest, time: link.time })
      }
    }
  }

  return (
    <div className="nav-links">
      {links.map((link, index) => {
        const targetLocation = getLocation(link.dest)
        if (!targetLocation) return null

        return (
          <button
            key={index}
            className="nav-link-thumbnail"
            onClick={() => handleLocationClick(link)}
            title={`${targetLocation?.name || link.dest} (${link.time} min)`}
          >
            {targetLocation?.image && (
              <img
                src={targetLocation.image}
                alt={targetLocation?.name || link.dest}
                className="nav-link-image"
              />
            )}
            <div>
              <p>{targetLocation?.name || link.dest}</p>
              <p>({link.time} min)</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
