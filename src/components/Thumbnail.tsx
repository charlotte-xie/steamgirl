import { assetUrl } from '../utils/assetUrl'

interface ThumbnailProps {
  image?: string
  name: string
  subtitle?: string
  symbol?: string
  onClick?: () => void
  title?: string
  disabled?: boolean
  disabledReason?: string
  selected?: boolean
}

export function Thumbnail({ image, name, subtitle, symbol, onClick, title, disabled, disabledReason, selected }: ThumbnailProps) {
  const tooltip = disabled && disabledReason ? disabledReason : (title || name)

  return (
    <button
      className={`thumbnail${disabled ? ' thumbnail-disabled' : ''}${selected ? ' thumbnail-selected' : ''}`}
      onClick={disabled ? undefined : onClick}
      title={tooltip}
      disabled={disabled}
    >
      {image ? (
        <img
          src={assetUrl(image)}
          alt={name}
          className="thumbnail-image"
        />
      ) : (
        <div className="thumbnail-image">
          {symbol || '?'}
        </div>
      )}
      <div>
        <p className="thumbnail-name">{name}</p>
        {subtitle && <p className="thumbnail-subtitle">{subtitle}</p>}
      </div>
    </button>
  )
}
