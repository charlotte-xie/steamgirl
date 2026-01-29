import type { Item } from '../model/Item'
import { capitalise } from '../model/Text'
import { getItemIcon } from './ItemIcons'

interface ItemIconProps {
  item: Item
  showNumber?: boolean
  showLocked?: boolean // Show locked badge even without showNumber
}

export function ItemIcon({ item, showNumber = false, showLocked = false }: ItemIconProps) {
  const itemDef = item.template
  const displayNumber = showNumber && itemDef.stackable && item.number > 1
  const displayWorn = showNumber && item.worn && !item.locked
  const displayLocked = (showNumber || showLocked) && item.worn && item.locked

  const IconSvg = itemDef.icon ? getItemIcon(itemDef.icon) : undefined

  return (
    <div className="item-icon-container">
      <div className="item-icon-placeholder">
        {IconSvg ? <IconSvg /> : capitalise(itemDef.name).charAt(0)}
      </div>
      {displayNumber && (
        <span className="item-number-badge">{item.number}</span>
      )}
      {displayWorn && (
        <span className="item-number-badge worn">w</span>
      )}
      {displayLocked && (
        <span className="item-number-badge locked">🔒</span>
      )}
    </div>
  )
}
