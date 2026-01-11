import { Item } from '../model/Item'
import { Tooltip } from './Tooltip'

type ItemViewProps = {
  item: Item
  selected?: boolean
  onClick?: () => void
}

export function ItemView({ item, selected = false, onClick }: ItemViewProps) {
  const itemDef = item.template
  const showNumber = itemDef.stackable && item.number > 1
  const iconSize = 32

  const iconContent = (
    <div className="item-icon-container">
      {itemDef.image ? (
        <img 
          src={itemDef.image} 
          alt={itemDef.name}
          className="item-icon"
          style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        />
      ) : (
        <div 
          className="item-icon-placeholder"
          style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        >
          {itemDef.name.charAt(0).toUpperCase()}
        </div>
      )}
      {showNumber && (
        <span className="item-number-badge">{item.number}</span>
      )}
    </div>
  )

  const content = (
    <div className={`item-view ${selected ? 'selected' : ''}`} onClick={onClick}>
      {iconContent}
      <div className="item-info">
        <span className="item-name">{itemDef.name}</span>
      </div>
    </div>
  )

  // Only show tooltip if item is not selected (to avoid tooltip conflicts with details area)
  if (itemDef.description && !selected) {
    return (
      <Tooltip content={<div style={{ margin: 0 }}>{itemDef.description}</div>}>
        {content}
      </Tooltip>
    )
  }

  return content
}