/** Look up a definition in a registry, throwing a descriptive error if not found. */
export function getDefinition<T>(registry: Record<string, T>, id: string, kind: string): T {
  const def = registry[id]
  if (!def) throw new Error(`${kind} definition not found: ${id}`)
  return def
}
