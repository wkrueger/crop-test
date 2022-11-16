import immer, { setAutoFreeze } from "immer"
import { v4 } from "uuid"
setAutoFreeze(false)

interface Coord {
  x: number
  y: number
}

export interface Area {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  class?: string
}

type Pos = "0" | "1" | "2"
type HandlePos = `${Pos}${Pos}`
type CoordKeys = "x1" | "y1" | "x2" | "y2"

export const handleInfo: Record<string, { x: CoordKeys | ""; y: CoordKeys | "" }> = {
  "00": { x: "x1", y: "y1" },
  "10": { x: "", y: "y1" },
  "20": { x: "x2", y: "y1" },
  "21": { x: "x2", y: "" },
  "22": { x: "x2", y: "y2" },
  "12": { x: "", y: "y2" },
  "02": { x: "x1", y: "y2" },
  "01": { x: "x1", y: "" },
}

export class Editor {
  state = {
    mode: "add" as "add" | "edit",
    areasIdx: {} as Record<string, Area>,
    selectedArea: null as null | string,
    dragging: null as null | {
      dragStart: Coord
      dragCurrent: Coord
      threshold: boolean
      areaId: string | null
      areaFeature: "border" | HandlePos | null
    },
    addMode: null as null | { areaId: string },
    editMode: null as null | {
      areaId: string
      areaFeature: "border" | HandlePos
      initialArea: Area
    },
  }

  changeListeners = [] as ((s: this["state"]) => void)[]

  addListener(fn: (s: this["state"]) => void) {
    this.changeListeners.push(fn)
  }

  close() {
    this.changeListeners = []
  }

  setMode(mode: "add" | "edit") {
    this.setState(state => {
      state.mode = mode
      if (mode === "add") {
        state.selectedArea = null
      }
    })
  }

  mouseDown(coord: Coord, areaId: string | null, areaFeature: "border" | HandlePos | null) {
    if (this.state.dragging) return

    this.setState(state => {
      state.dragging = {
        dragStart: coord,
        dragCurrent: coord,
        threshold: false,
        areaId,
        areaFeature,
      }
    })
  }

  mouseMove(coord: Coord) {
    if (!this.state.dragging) return
    const state = this.state
    state.dragging!.dragCurrent = coord

    const diff: [number, number] = [
      state.dragging!.dragCurrent.x - state.dragging!.dragStart.x,
      state.dragging!.dragCurrent.y - state.dragging!.dragStart.y,
    ]
    if (!state.dragging!.threshold) {
      const distance = Math.sqrt(Math.pow(diff[0], 2) + Math.pow(diff[1], 2))
      if (distance > 20) {
        state.dragging!.threshold = true
        this.setState(state => {
          this.dragStart(state)
        })
      }
    }
    if (!state.dragging?.threshold) {
      return
    }

    this.dragTick(coord, diff)
  }

  mouseUp(coord: Coord) {
    this.state.dragging!.dragCurrent = coord
    if (this.state.dragging?.threshold) {
      this.dragEnd(coord)
    } else {
      this.mouseClick()
    }
    this.state.dragging = null
  }

  protected setState(fn: (state: typeof this["state"]) => void) {
    const oldState = this.state
    this.state = immer(this.state, draft => {
      fn(draft)
    })
    if (oldState !== this.state) {
      this.dispatchChange()
    }
  }

  protected dispatchChange() {
    for (const listener of this.changeListeners) {
      listener(this.state)
    }
  }

  protected dragStart(state: this["state"]) {
    const coord = state.dragging!.dragCurrent!
    const areaId = state.dragging!.areaId!
    const areaFeature = state.dragging!.areaFeature!

    if (state.mode === "add") {
      const id = v4()
      state.areasIdx[id] = {
        id,
        x1: coord.x,
        y1: coord.y,
        x2: coord.x,
        y2: coord.y,
        class: "creating",
      }
      state.addMode = { areaId: id }
    } else if (state.mode === "edit") {
      if (!areaId) return
      if (!areaFeature) return
      const area = state.areasIdx[areaId]
      state.editMode = { areaId, areaFeature, initialArea: { ...area } }
      area.class = "moving"
    }
  }

  protected dragTick(coord: Coord, diff: [number, number]) {
    if (this.state.addMode) {
      this.setState(state => {
        const area = state.areasIdx[state.addMode!.areaId]
        area.x2 = coord.x
        area.y2 = coord.y
      })
    } else if (this.state.editMode) {
      this.setState(state => {
        const feature = state.editMode!.areaFeature
        if (feature === "border") {
          const area = state.areasIdx[state.editMode!.areaId]
          const initialArea = state.editMode!.initialArea!

          area.x1 = initialArea.x1 + diff[0]
          area.x2 = initialArea.x2 + diff[0]
          area.y1 = initialArea.y1 + diff[1]
          area.y2 = initialArea.y2 + diff[1]
        } else {
          const area = state.areasIdx[state.editMode!.areaId]

          const mapping = handleInfo[state.editMode!.areaFeature]
          if (mapping.x) {
            area[mapping.x] = coord.x
          }
          if (mapping.y) {
            area[mapping.y] = coord.y
          }
        }
      })
    }
  }

  protected dragEnd(coord: Coord) {
    this.mouseMove(coord)

    this.setState(state => {
      if (state.addMode) {
        const areaId = state.addMode!.areaId
        const area = state.areasIdx[areaId]
        area.class = undefined
      } else if (state.editMode) {
        const areaId = state.editMode!.areaId
        const area = state.areasIdx[areaId]
        area.class = undefined
      }

      state.dragging = null
      state.addMode = null
      state.editMode = null
    })
  }

  protected mouseClick() {
    if (this.state.mode === "edit") {
      const areaId = this.state.dragging?.areaId || null
      this.setState(state => {
        state.selectedArea = areaId
      })
    }
  }
}
