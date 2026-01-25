import type { Item } from '../model/Item'
import { capitalise } from '../model/Text'
import { assetUrl } from '../utils/assetUrl'

interface ItemIconProps {
  item: Item
  showNumber?: boolean
}

export function ItemIcon({ item, showNumber = false }: ItemIconProps) {
  const itemDef = item.template
  const displayNumber = showNumber && itemDef.stackable && item.number > 1
  const displayWorn = showNumber && item.worn

  return (
    <div className="item-icon-container">
      {itemDef.image ? (
        <img
          src={assetUrl(itemDef.image)}
          alt={itemDef.name}
          className="item-icon"
        />
      ) : (
        <div className="item-icon-placeholder">
          {capitalise(itemDef.name).charAt(0)}
        </div>
      )}
      {displayNumber && (
        <span className="item-number-badge">{item.number}</span>
      )}
      {displayWorn && (
        <span className="item-number-badge worn">w</span>
      )}
    </div>
  )
}
