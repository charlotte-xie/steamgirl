import { useGame } from '../context/GameContext'
import { getLocation } from '../model/Location'
import { Thumbnail } from './Thumbnail'
import type { LocationLink } from '../model/Location'

export function NavOverlay() {
  const { game, runScript } = useGame()
  const links = game.location.template.links || []
  const currentMain = game.location.template.mainLocation === true

  if (links.length === 0) {
    return null
  }

  const handleLocationClick = (link: LocationLink) => {
    if (link.checkAccess) {
      const accessReason = link.checkAccess(game)
      if (accessReason) {
        game.add(accessReason)
        return
      }
    }
    runScript('go', { location: link.dest, minutes: link.time })
  }

  // Filter to discovered or alwaysShow, then split into Travel (both main) vs Places (rest)
  const discovered = links.filter((link) => game.getLocation(link.dest).discovered || link.alwaysShow)

  const travelLinks: LocationLink[] = []
  const placeLinks: LocationLink[] = []
  for (const link of discovered) {
    const destDef = getLocation(link.dest)
    const destMain = destDef?.mainLocation === true
    if (link.travel === true) {
      travelLinks.push(link)
    } else if (currentMain && destMain) {
      travelLinks.push(link)
    } else {
      placeLinks.push(link)
    }
  }

  if (travelLinks.length === 0 && placeLinks.length === 0) {
    return null
  }

  const renderGroup = (title: string, groupLinks: LocationLink[]) => {
    if (groupLinks.length === 0) return null
    return (
      <div className="overlay-group" key={title}>
        <div className="overlay-group-title">{title}</div>
        <div className="overlay-group-content">
          {groupLinks.map((link, index) => {
            const targetLocation = getLocation(link.dest)
            if (!targetLocation) return null
            const imageLocation = link.imageLocation ? getLocation(link.imageLocation) : undefined
            const image = imageLocation?.image ?? targetLocation.image
            const accessReason = link.checkAccess ? link.checkAccess(game) : null
            const isDisabled = !!accessReason
            const displayName = link.label ?? targetLocation.name ?? link.dest
            const timeCost = link.cost != null && link.cost > 0
              ? `${link.time} min, ${link.cost} kr`
              : `${link.time} min`
            return (
              <Thumbnail
                key={`${link.dest}-${index}`}
                image={image}
                name={displayName}
                subtitle={timeCost}
                onClick={() => handleLocationClick(link)}
                title={`${displayName} (${timeCost})`}
                disabled={isDisabled}
                disabledReason={accessReason || undefined}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="nav-links">
      {renderGroup('Places', placeLinks)}
      {renderGroup('Travel', travelLinks)}
    </div>
  )
}
