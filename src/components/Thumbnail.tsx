interface ThumbnailProps {
  image?: string
  name: string
  subtitle?: string
  symbol?: string
  onClick?: () => void
  title?: string
}

export function Thumbnail({ image, name, subtitle, symbol, onClick, title }: ThumbnailProps) {
  return (
    <button
      className="thumbnail"
      onClick={onClick}
      title={title || name}
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
