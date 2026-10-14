export type Flag = "low" | "out"

export type ListPlace = "buy" | "later"

export type Item = {
  id: string
  name: string
  flag: Flag | null
  list: ListPlace | null
}

export type PantryState = {
  items: Item[]
}

export const STARTERS = ["Olive oil", "Rice", "Eggs", "Oats", "Salt", "Pasta", "Black pepper"]

export function flagLabel(flag: Flag) {
  return flag === "low" ? "Running low" : "Out"
}
