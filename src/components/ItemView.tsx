import type { Item } from '../model/Item'
import { Tooltip } from './Tooltip'
import { capitalise } from '../model/Text'
import { ItemIcon } from './ItemIcon'

type ItemViewProps = {
  item: Item
  selected?: boolean
  onClick?: () => void
}

export function ItemView({ item, selected = false, onClick }: ItemViewProps) {
  const itemDef = item.template

  const content = (
    <div className={`item-view ${selected ? 'selected' : ''} ${item.worn ? 'worn' : ''}`} onClick={onClick}>
      <ItemIcon item={item} showNumber />
      <div className="item-info">
        <span className="item-name">{capitalise(itemDef.name)}</span>
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
