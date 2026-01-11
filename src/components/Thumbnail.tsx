interface ThumbnailProps {
  image?: string
  name: string
  subtitle?: string
  onClick?: () => void
  title?: string
}

export function Thumbnail({ image, name, subtitle, onClick, title }: ThumbnailProps) {
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
          ?
        </div>
      )}
      <div>
        <p>{name}</p>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </button>
  )
}
