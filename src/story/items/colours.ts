/**
 * colours.ts - Shared colour table and generator for tinted clothing variants.
 *
 * Each tintable base item (bra, panties, socks) gets a full set of colour
 * variants registered automatically. White is the untinted base colour.
 */

import { registerItemDefinition, tintedItem, extendItem, type ItemId, type ItemDefinition } from '../../model/Item'

/** A clothing colour with its display name, tint hex, and icon colour. */
interface ClothingColour {
  name: string
  /** Multiply-blend tint for the avatar image. Undefined = no tint (white base). */
  tint?: string
  /** Icon colour override. Falls back to the tint value if not set. */
  colour?: string
}

/**
 * Master colour table for tintable clothing.
 * Keys are used as ID suffixes (e.g. 'bra-black', 'socks-navy').
 */
export const CLOTHING_COLOURS: Record<string, ClothingColour> = {
  white:    { name: 'white',    colour: '#c0b8b0' },
  cream:    { name: 'cream',    tint: '#f0e8d0', colour: '#c8b888' },
  pink:     { name: 'pink',     tint: '#f2a0b0', colour: '#d08090' },
  red:      { name: 'red',      tint: '#cc3333', colour: '#b03030' },
  burgundy: { name: 'burgundy', tint: '#662233', colour: '#803040' },
  navy:     { name: 'navy',     tint: '#223355', colour: '#304060' },
  grey:     { name: 'grey',     tint: '#888888', colour: '#787878' },
  black:    { name: 'black',    tint: '#222222', colour: '#383838' },
}

/**
 * Register a full set of colour variants for a tintable base item.
 *
 * @param baseId      - The white base item to extend (must already be registered)
 * @param idPrefix    - Prefix for generated IDs (e.g. 'bra' → 'bra-black')
 * @param nameLabel   - Display name for the garment (e.g. 'bra' → 'red bra')
 * @param descFn      - Returns a description for the colour name
 * @param whiteId     - ID to use for the white variant (if different from baseId, registers an alias)
 */
export function registerColourVariants(
  baseId: ItemId,
  idPrefix: string,
  nameLabel: string,
  descFn: (colourName: string) => string,
  whiteId?: string,
): void {
  for (const [key, colour] of Object.entries(CLOTHING_COLOURS)) {
    const id = `${idPrefix}-${key}`

    if (key === 'white') {
      // White is the untinted base — just register under the colour ID if needed
      if (whiteId && whiteId !== id) continue // already registered under its own ID
      const overrides: Partial<ItemDefinition> = {
        name: `${colour.name} ${nameLabel}`,
        description: descFn(colour.name),
      }
      if (colour.colour) overrides.colour = colour.colour
      registerItemDefinition(id, extendItem(baseId, overrides))
    } else {
      registerItemDefinition(id, tintedItem(baseId, colour.tint!, {
        name: `${colour.name} ${nameLabel}`,
        description: descFn(colour.name),
        ...(colour.colour ? { colour: colour.colour } : {}),
      }))
    }
  }
}
