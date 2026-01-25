// Outfit management utilities

export type OutfitName = string
export type OutfitData = Record<OutfitName, string[]>  // outfit name -> array of item IDs

/**
 * Get the list of item IDs that make up an outfit
 */
export function getOutfitItems(outfits: OutfitData, name: OutfitName): string[] {
  return outfits[name] ?? []
}

/**
 * Get all outfit names
 */
export function getOutfitNames(outfits: OutfitData): OutfitName[] {
  return Object.keys(outfits)
}

/**
 * Check if an outfit exists
 */
export function hasOutfit(outfits: OutfitData, name: OutfitName): boolean {
  return name in outfits
}

/**
 * Create or update an outfit with the given item IDs
 */
export function saveOutfit(outfits: OutfitData, name: OutfitName, itemIds: string[]): OutfitData {
  return {
    ...outfits,
    [name]: [...itemIds]
  }
}

/**
 * Delete an outfit
 */
export function deleteOutfit(outfits: OutfitData, name: OutfitName): OutfitData {
  const { [name]: _, ...rest } = outfits
  return rest
}

/**
 * Rename an outfit
 */
export function renameOutfit(outfits: OutfitData, oldName: OutfitName, newName: OutfitName): OutfitData {
  if (oldName === newName || !(oldName in outfits)) {
    return outfits
  }
  const { [oldName]: items, ...rest } = outfits
  return {
    ...rest,
    [newName]: items
  }
}
