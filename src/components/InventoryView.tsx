import { useGame } from '../context/GameContext'
import { ItemView } from './ItemView'

export function InventoryView() {
  const { game } = useGame()

  if (!game) {
    return null
  }

  const inventory = game.player.inventory

  if (inventory.length === 0) {
    return (
      <div className="inventory">
        <p>Inventory is empty</p>
      </div>
    )
  }

  return (
    <div className="inventory">
      <h3>Inventory</h3>
      <div className="inventory-items">
        {inventory.map((item, index) => (
          <ItemView key={`${item.id}-${index}`} item={item} />
        ))}
      </div>
    </div>
  )
}
