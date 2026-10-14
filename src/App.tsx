import { useEffect, useMemo, useState } from "react"
import { loadState, saveState } from "./storage"
import { STARTERS, flagLabel, type Item, type PantryState } from "./types"

type Screen = "pantry" | "list"

function uid() {
  return crypto.randomUUID()
}

function normalize(name: string) {
  return name.trim().toLowerCase()
}

function byName(a: Item, b: Item) {
  return a.name.localeCompare(b.name)
}

export default function App() {
  const [state, setState] = useState<PantryState>(() => loadState())
  const [screen, setScreen] = useState<Screen>("pantry")
  const [draft, setDraft] = useState("")
  const [laterOpen, setLaterOpen] = useState(false)

  useEffect(() => {
    saveState(state)
  }, [state])

  const pantry = useMemo(
    () =>
      state.items
        .filter((item) => item.flag !== "out" && (item.list === null || item.flag === "low"))
        .sort(byName),
    [state.items],
  )
  const buying = useMemo(
    () => state.items.filter((item) => item.list === "buy").sort(byName),
    [state.items],
  )
  const later = useMemo(
    () => state.items.filter((item) => item.list === "later").sort(byName),
    [state.items],
  )
  const suggestions = STARTERS.filter(
    (name) => !state.items.some((item) => normalize(item.name) === normalize(name)),
  )

  function update(id: string, patch: Partial<Item>) {
    setState((current) => ({
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  function addHave(name: string) {
    const clean = name.trim()
    if (!clean) return
    setState((current) => {
      if (current.items.some((item) => normalize(item.name) === normalize(clean))) return current
      return { items: [{ id: uid(), name: clean, flag: null, list: null }, ...current.items] }
    })
    setDraft("")
  }

  function addNeed(name: string) {
    const clean = name.trim()
    if (!clean) return
    setState((current) => {
      const existing = current.items.find((item) => normalize(item.name) === normalize(clean))
      if (!existing) {
        return { items: [{ id: uid(), name: clean, flag: null, list: "buy" }, ...current.items] }
      }
      if (existing.list === "buy") return current
      return {
        items: current.items.map((item) =>
          item.id === existing.id
            ? { ...item, list: "buy", flag: item.flag === "out" ? "out" : (item.flag ?? "low") }
            : item,
        ),
      }
    })
    setDraft("")
  }

  function toggleLow(id: string) {
    setState((current) => ({
      items: current.items.map((item) => {
        if (item.id !== id) return item
        if (item.flag === "low") return { ...item, flag: null, list: null }
        return { ...item, flag: "low", list: item.list ?? "buy" }
      }),
    }))
  }

  function markOut(id: string) {
    update(id, { flag: "out", list: "buy" })
  }

  function bought(id: string) {
    update(id, { flag: null, list: null })
  }

  function skip(id: string) {
    setState((current) => ({
      items: current.items.flatMap((item) => {
        if (item.id !== id) return [item]
        if (item.flag !== "low") return []
        return [{ ...item, flag: null, list: null }]
      }),
    }))
  }

  function saveForLater(id: string) {
    update(id, { list: "later" })
  }

  function putBack(id: string) {
    update(id, { list: "buy" })
  }

  function remove(id: string) {
    setState((current) => ({ items: current.items.filter((item) => item.id !== id) }))
  }

  return (
    <div className="page">
      <header className="top">
        <h1>{screen === "pantry" ? "Pantry" : "Shopping list"}</h1>
      </header>

      {screen === "pantry" ? (
        <section>
          <form
            className="add"
            onSubmit={(event) => {
              event.preventDefault()
              addHave(draft)
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add something you have"
              aria-label="Add something you have"
            />
          </form>

          {pantry.length === 0 ? <p className="quiet">Nothing in the pantry yet.</p> : null}
          <ul className="items">
            {pantry.map((item) => (
              <li key={item.id}>
                <div className="item-main">
                  <p className="item-name">{item.name}</p>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className={item.flag === "low" ? "lit low" : ""}
                    aria-pressed={item.flag === "low"}
                    onClick={() => toggleLow(item.id)}
                  >
                    Running low
                  </button>
                  <button type="button" onClick={() => markOut(item.id)}>
                    Out
                  </button>
                  <button type="button" className="text" onClick={() => remove(item.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {suggestions.length > 0 ? (
            <div className="starters">
              <p>Common items</p>
              {suggestions.map((name) => (
                <button key={name} type="button" onClick={() => addHave(name)}>
                  {name}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <section>
          <form
            className="add"
            onSubmit={(event) => {
              event.preventDefault()
              addNeed(draft)
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add something you need"
              aria-label="Add something you need"
            />
          </form>
          {buying.length === 0 ? <p className="quiet">Nothing to buy.</p> : null}
          <ul className="items">
            {buying.map((item) => (
              <BuyRow
                key={item.id}
                item={item}
                onBought={() => bought(item.id)}
                onSkip={() => skip(item.id)}
                onLater={() => saveForLater(item.id)}
              />
            ))}
          </ul>

          <div className="later">
            <button
              type="button"
              className="later-toggle"
              aria-expanded={laterOpen}
              onClick={() => setLaterOpen((open) => !open)}
            >
              <span>Saved for later</span>
              <span>{later.length}</span>
            </button>
            {laterOpen ? (
              later.length === 0 ? (
                <p className="quiet">Nothing saved.</p>
              ) : (
                <ul className="items">
                  {later.map((item) => (
                    <li key={item.id}>
                      <div className="item-main">
                        <p className="item-name">{item.name}</p>
                        {item.flag ? <span className={`flag ${item.flag}`}>{flagLabel(item.flag)}</span> : null}
                      </div>
                      <div className="actions">
                        <button type="button" onClick={() => putBack(item.id)}>
                          To list
                        </button>
                        <button type="button" onClick={() => bought(item.id)}>
                          I bought
                        </button>
                        <button type="button" onClick={() => skip(item.id)}>
                          Not getting
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>
        </section>
      )}

      <nav className="nav" aria-label="Sections">
        <button type="button" className={screen === "pantry" ? "on" : ""} onClick={() => setScreen("pantry")}>
          Pantry
        </button>
        <button type="button" className={screen === "list" ? "on" : ""} onClick={() => setScreen("list")}>
          Shopping list
          {buying.length > 0 ? <span className="count">{buying.length}</span> : null}
        </button>
      </nav>
    </div>
  )
}

function BuyRow({
  item,
  onBought,
  onSkip,
  onLater,
}: {
  item: Item
  onBought: () => void
  onSkip: () => void
  onLater: () => void
}) {
  return (
    <li>
      <div className="item-main">
        <p className="item-name">{item.name}</p>
        {item.flag ? <span className={`flag ${item.flag}`}>{flagLabel(item.flag)}</span> : null}
      </div>
      <div className="actions">
        <button type="button" className="primary" onClick={onBought}>
          I bought
        </button>
        <button type="button" onClick={onSkip}>
          Not getting
        </button>
        <button type="button" onClick={onLater}>
          Save for later
        </button>
      </div>
    </li>
  )
}
