import { forwardRef } from 'react'
import { useGame } from '../context/GameContext'
import { assetUrl } from '../utils/assetUrl'
import { getItemZOrder } from '../model/Item'

/** Base model layers rendered back-to-front beneath clothing */
const BASE_LAYERS = [
  '/images/steamgirl/BackArm.PNG',
  '/images/steamgirl/GirlBase.PNG',
  '/images/steamgirl/FrontArm.PNG',
  '/images/steamgirl/HairBuns.PNG',
]

/**
 * Renders the player avatar as layered images: base model layers,
 * then worn clothing sorted by z-order (layer + position).
 */
export const AvatarImage = forwardRef<HTMLDivElement>(function AvatarImage(_, ref) {
  const { game } = useGame()

  const clothingLayers = game.player.getWornItems()
    .filter(item => item.template.image)
    .sort((a, b) => getItemZOrder(a.template) - getItemZOrder(b.template))

  return (
    <div className="avatar-placeholder" ref={ref} data-avatar>
      {BASE_LAYERS.map(src => (
        <img key={src} className="avatar-layer" src={assetUrl(src)} alt="" />
      ))}
      {clothingLayers.map(item => {
        const tint = item.template.imageTint
        const imageSrc = assetUrl(item.template.image!)
        return tint ? (
          <div key={item.id} className="avatar-layer avatar-tint">
            <img src={imageSrc} alt={item.template.name} />
            <div
              className="avatar-tint-overlay"
              style={{
                backgroundColor: tint,
                maskImage: `url(${imageSrc})`,
                WebkitMaskImage: `url(${imageSrc})`,
                maskSize: 'cover',
                WebkitMaskSize: 'cover',
              }}
            />
          </div>
        ) : (
          <img
            key={item.id}
            className="avatar-layer"
            src={assetUrl(item.template.image!)}
            alt={item.template.name}
          />
        )
      })}
    </div>
  )
})
