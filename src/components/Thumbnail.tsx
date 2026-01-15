interface ThumbnailProps {
  image?: string
  name: string
  subtitle?: string
  symbol?: string
  onClick?: () => void
  title?: string
  disabled?: boolean
  disabledReason?: string
}

export function Thumbnail({ image, name, subtitle, symbol, onClick, title, disabled, disabledReason }: ThumbnailProps) {
  const tooltip = disabled && disabledReason ? disabledReason : (title || name)
  
  return (
    <button
      className={`thumbnail ${disabled ? 'thumbnail-disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      title={tooltip}
      disabled={disabled}
    >
      {image ? (
        <img
          src={image}
          alt={name}
          className="thumbnail-image"
        />
      ) : (
        <div className="thumbnail-placeholder">
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
