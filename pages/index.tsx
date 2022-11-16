import clsx from "clsx"
import { Fragment, useLayoutEffect, useMemo, useReducer, useRef } from "react"
import { Area, Editor, handleInfo } from "../components/Editor"

const HANDLE_SIZE = 8

export default function Home() {
  const editor = useMemo(() => new Editor(), [])

  const $canvas = useRef<HTMLDivElement>()

  const [, forceUpdate] = useReducer(() => ({}), {})

  useLayoutEffect(() => {
    const current = $canvas.current!
    function mouseDownEvent(this: any, event: any) {
      const areaId = event.target?.dataset?.areaId || null
      const handleType = event.target?.dataset?.handle || null
      const { x, y } = current.getBoundingClientRect()
      editor.mouseDown({ x: event.clientX - x, y: event.clientY - y }, areaId, handleType)
    }

    function mouseMoveEvent(event: any) {
      if (!editor.state.dragging) return
      const { x, y } = current.getBoundingClientRect()
      editor.mouseMove({ x: event.clientX - x, y: event.clientY - y })
    }

    function mouseUpEvent(event: MouseEvent) {
      if (!editor.state.dragging) return
      const { x, y } = current.getBoundingClientRect()
      editor.mouseUp({ x: event.clientX - x, y: event.clientY - y })
    }

    current.addEventListener("mousedown", mouseDownEvent)
    current.addEventListener("mousemove", mouseMoveEvent)
    current.addEventListener("mouseup", mouseUpEvent)

    editor.addListener(() => {
      requestAnimationFrame(() => {
        forceUpdate()
      })
    })

    return () => {
      current.removeEventListener("mousedown", mouseDownEvent)
      current.removeEventListener("mousemove", mouseMoveEvent)
      current.removeEventListener("mouseup", mouseUpEvent)
    }
  }, [editor])

  return (
    <div>
      <style jsx global>{`
        .selected-button {
          background-color: #9797c0;
        }
        .area {
          border: solid 2px black;
          position: absolute;
          background: none;
          cursor: pointer;
          user-select: none;
        }
        .selected-area {
          border-color: blue;
          border-width: 4px;
        }
        .handle {
          user-select: none;
          cursor: pointer;
          position: absolute;
          width: ${HANDLE_SIZE}px;
          height: ${HANDLE_SIZE}px;
          border: solid 1px black;
          background-color: yellow;
          z-index: 2;
        }
      `}</style>
      <button
        type="button"
        className={clsx(editor.state.mode === "add" && "selected-button")}
        onClick={() => editor.setMode("add")}
      >
        Add mode
      </button>
      <button
        type="button"
        className={clsx(editor.state.mode === "edit" && "selected-button")}
        onClick={() => editor.setMode("edit")}
      >
        Edit mode
      </button>
      <div
        className="canvas"
        ref={$canvas as any}
        style={{
          width: 1000,
          height: 1000,
          backgroundColor: "#bbb",
          position: "relative",
        }}
      >
        {Object.values(editor.state.areasIdx).map(area => {
          const left = Math.min(area.x1, area.x2)
          const top = Math.min(area.y1, area.y2)
          const w = Math.abs(area.x2 - area.x1)
          const h = Math.abs(area.y2 - area.y1)
          const isSelected = area.id === editor.state.selectedArea
          return (
            <Fragment key={area.id}>
              {isSelected ? <Handles area={area} /> : null}
              <div
                key={area.id}
                data-area-id={area.id}
                data-handle="border"
                className={clsx("area", isSelected && "selected-area")}
                style={{
                  left: left + "px",
                  top: top + "px",
                  width: w + "px",
                  height: h + "px",
                }}
              ></div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

function Handles({ area }: { area: Area }) {
  return (
    <>
      {Object.entries(handleInfo).map(([handleK, handleV]) => {
        const left = handleV.x ? area[handleV.x] : (area.x1 + area.x2) / 2
        const top = handleV.y ? area[handleV.y] : (area.y1 + area.y2) / 2
        return (
          <div
            className="handle"
            data-area-id={area.id}
            key={handleK}
            data-handle={handleK}
            style={{
              left: left - HANDLE_SIZE / 2 + "px",
              top: top - HANDLE_SIZE / 2 + "px",
            }}
          />
        )
      })}
    </>
  )
}
