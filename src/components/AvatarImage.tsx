import { forwardRef } from 'react'
import { useGame } from '../context/GameContext'
import { assetUrl } from '../utils/assetUrl'
import { getItemZOrder } from '../model/Item'

/**
 * Renders the player avatar image with layered clothing.
 * Worn items with an `image` field are rendered as transparent PNGs
 * on top of the base image, sorted by z-order (layer + position).
 */
export const AvatarImage = forwardRef<HTMLDivElement>(function AvatarImage(_, ref) {
  const { game } = useGame()

  const layers = game.player.getWornItems()
    .filter(item => item.template.image)
    .sort((a, b) => getItemZOrder(a.template) - getItemZOrder(b.template))

  return (
    <div className="avatar-placeholder" ref={ref} data-avatar>
      <img src={assetUrl('/girl/SteamGirl.png')} alt="Player Avatar" />
      {layers.map(item => (
        <img
          key={item.id}
          className="avatar-layer"
          src={assetUrl(item.template.image!)}
          alt={item.template.name}
        />
      ))}
    </div>
  )
})
