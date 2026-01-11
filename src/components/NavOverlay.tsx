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
      runScript('go', { location: link.dest, minutes: link.time })
    }
  }

  return (
    <div className="nav-links">
      {links.map((link, index) => {
        const targetLocation = getLocation(link.dest)
        if (!targetLocation) return null

        return (
          <Thumbnail
            key={index}
            image={targetLocation.image}
            name={targetLocation.name || link.dest}
            subtitle={`${link.time} min`}
            onClick={() => handleLocationClick(link)}
            title={`${targetLocation.name || link.dest} (${link.time} min)`}
          />
        )
      })}
    </div>
  )
}
