/** Create a typed registry with duplicate detection and standard lookup methods. */
export function createRegistry<T>(kind: string) {
  const store: Record<string, T> = {}
  return {
    register(id: string, definition: T): void {
      if (id in store) throw new Error(`Duplicate ${kind} ID: '${id}'`)
      store[id] = definition
    },
    registerAll(definitions: Record<string, T>): void {
      for (const [id, def] of Object.entries(definitions))
        this.register(id, def)
    },
    get(id: string): T | undefined { return store[id] },
    getOrThrow(id: string): T {
      const def = store[id]
      if (!def) throw new Error(`${kind} definition not found: '${id}'`)
      return def
    },
    has(id: string): boolean { return id in store },
    getAll(): Record<string, T> { return { ...store } },
  }
}
