import type { Flag, Item, ListPlace, PantryState } from "./types"

const KEY = "pantry-v3"
const PREVIOUS = ["pantry-v2", "pantry-v1"]

export const emptyState: PantryState = { items: [] }

function normalize(name: string) {
  return name.trim().toLowerCase()
}

function isFlag(value: unknown): value is Flag {
  return value === "low" || value === "out"
}

function isList(value: unknown): value is ListPlace {
  return value === "buy" || value === "later"
}

function fromPrevious(raw: string): PantryState | null {
  try {
    const parsed = JSON.parse(raw) as {
      items?: Array<{ id?: string; name?: string; needed?: boolean; flag?: unknown; list?: unknown }>
      pantry?: Array<{ id?: string; name?: string }>
      list?: Array<{ id?: string; name?: string; pantryId?: string; checked?: boolean }>
    }

    if (Array.isArray(parsed.items)) {
      const items: Item[] = []
      for (const entry of parsed.items) {
        const name = entry.name?.trim()
        if (!name) continue
        const needed = Boolean(entry.needed)
        items.push({
          id: entry.id || crypto.randomUUID(),
          name,
          flag: isFlag(entry.flag) ? entry.flag : needed ? "low" : null,
          list: isList(entry.list) ? entry.list : needed ? "buy" : null,
        })
      }
      return { items }
    }

    if (!Array.isArray(parsed.pantry) && !Array.isArray(parsed.list)) return null
    const items: Item[] = []
    const seen = new Set<string>()
    for (const entry of parsed.pantry ?? []) {
      const name = entry.name?.trim()
      if (!name) continue
      const key = normalize(name)
      if (seen.has(key)) continue
      seen.add(key)
      const needed = (parsed.list ?? []).some(
        (item) =>
          !item.checked &&
          (item.pantryId === entry.id || normalize(item.name ?? "") === key),
      )
      items.push({
        id: entry.id || crypto.randomUUID(),
        name,
        flag: needed ? "low" : null,
        list: needed ? "buy" : null,
      })
    }
    for (const entry of parsed.list ?? []) {
      if (entry.checked) continue
      const name = entry.name?.trim()
      if (!name) continue
      const key = normalize(name)
      if (seen.has(key)) continue
      seen.add(key)
      items.push({
        id: entry.id || crypto.randomUUID(),
        name,
        flag: "low",
        list: "buy",
      })
    }
    return { items }
  } catch {
    return null
  }
}

export function loadState(): PantryState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PantryState
      if (Array.isArray(parsed.items)) return parsed
    }
    for (const key of PREVIOUS) {
      const older = localStorage.getItem(key)
      if (!older) continue
      const migrated = fromPrevious(older)
      if (migrated) return migrated
    }
    return emptyState
  } catch {
    return emptyState
  }
}

export function saveState(state: PantryState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}
