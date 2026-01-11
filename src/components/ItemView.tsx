import { Item } from '../model/Item'
import { MouseOver } from './MouseOver'

type ItemViewProps = {
  item: Item
}

export function ItemView({ item }: ItemViewProps) {
  const itemDef = item.template
  const showNumber = itemDef.stackable && item.number > 1
  const iconSize = 48

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
    <div className="item-view">
      {iconContent}
      <span className="item-name">{itemDef.name}</span>
    </div>
  )

  if (itemDef.description) {
    return (
      <MouseOver hoverContent={
        <div className="hover-panel">
          <p style={{ margin: 0 }}>{itemDef.description}</p>
        </div>
      }>
        {content}
      </MouseOver>
    )
  }

  return content
}