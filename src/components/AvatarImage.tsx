import { forwardRef } from 'react'
import { assetUrl } from '../utils/assetUrl'

/**
 * Renders the player avatar image. Used by AvatarPanel and can be
 * captured as a thumbnail via the `captureAvatar` utility.
 */
export const AvatarImage = forwardRef<HTMLDivElement>(function AvatarImage(_, ref) {
  return (
    <div className="avatar-placeholder" ref={ref} data-avatar>
      <img src={assetUrl('/girl/SteamGirl.png')} alt="Player Avatar" />
    </div>
  )
})
