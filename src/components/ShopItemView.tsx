import { Item, getItem } from '../model/Item'
import { capitalise } from '../model/Text'
import { ItemIcon } from './ItemIcon'
import { Button } from './Button'

interface ShopItemViewProps {
  itemId: string
  price: number
  ownedCount: number
  canAfford: boolean
  selected?: boolean
  onClick?: () => void
  onBuy: () => void
}

export function ShopItemView({ itemId, price, ownedCount, canAfford, selected, onClick, onBuy }: ShopItemViewProps) {
  const itemDef = getItem(itemId)
  if (!itemDef) return null

  const displayItem = new Item(itemId, 1)

  return (
    <div className={`shop-item-view ${selected ? 'selected' : ''}`} onClick={onClick}>
      <ItemIcon item={displayItem} />
      <div className="shop-item-info">
        <span className="shop-item-name">{capitalise(itemDef.name)}</span>
        {ownedCount > 0 && (
          <span className="shop-item-owned">Owned ({ownedCount})</span>
        )}
      </div>
      <div className="shop-item-price">
        {price} Kr
      </div>
      <span onClick={e => e.stopPropagation()}>
        <Button
          disabled={!canAfford}
          title={!canAfford ? 'Not enough Krona' : undefined}
          size="small"
          onClick={onBuy}
        >
          Buy
        </Button>
      </span>
    </div>
  )
}
