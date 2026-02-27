/** Convert a Map to a plain Record for JSON serialisation. */
export function mapToRecord<V>(map: Map<string, V>): Record<string, V> {
  const record: Record<string, V> = {}
  map.forEach((value, key) => { record[key] = value })
  return record
}

/** Convert a plain Record back to a Map. */
export function recordToMap<V>(record: Record<string, V>): Map<string, V> {
  return new Map(Object.entries(record))
}
