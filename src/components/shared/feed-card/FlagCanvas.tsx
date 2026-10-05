"use client"

import { useEffect, useRef, useState, useCallback } from "react"

// ponytail: fixed 300×200 (3:2) drawing surface. Flags vary in ratio; the
// scorer squashes both drawing and reference to a square grid, so exact aspect
// doesn't matter — it just needs to be the same transform on both sides.
const W = 300
const H = 200

const PALETTE = [
  "#000000", "#ffffff", "#e23d28", "#ff8c00", "#f7d117",
  "#2e7d32", "#009ae4", "#0d2a6b", "#6a1b9a", "#8d5524",
]

type Tool = "brush" | "fill" | "eraser"

export interface FlagCanvasHandle {
  toBlob: () => Promise<Blob>
  getImageData: () => ImageData
}

/**
 * Minimal flag-drawing surface: brush, fill bucket, eraser, colour swatches +
 * custom picker, size, undo, clear. White background (so unpainted reads as
 * white, matching the scorer). Exposes the finished pixels to the parent.
 * ponytail: no shape tools — brush+fill covers almost every flag; add rect/
 * circle later if star/crest flags feel too hard.
 */
export default function FlagCanvas({ onReady }: { onReady: (h: FlagCanvasHandle) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>("brush")
  const [color, setColor] = useState("#e23d28")
  const [size, setSize] = useState(10)
  const drawing = useRef(false)
  const undoStack = useRef<ImageData[]>([])

  const ctx = useCallback(() => canvasRef.current!.getContext("2d")!, [])

  const clearTo = useCallback(
    (fill = "#ffffff") => {
      const c = ctx()
      c.fillStyle = fill
      c.fillRect(0, 0, W, H)
    },
    [ctx],
  )

  const snapshot = useCallback(() => {
    const c = ctx()
    undoStack.current.push(c.getImageData(0, 0, W, H))
    if (undoStack.current.length > 25) undoStack.current.shift() // bounded history
  }, [ctx])

  useEffect(() => {
    clearTo()
    onReady({
      toBlob: () =>
        new Promise<Blob>((resolve, reject) =>
          canvasRef.current!.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
        ),
      getImageData: () => ctx().getImageData(0, 0, W, H),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pos(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  function onDown(e: React.PointerEvent) {
    e.preventDefault()
    snapshot()
    const { x, y } = pos(e)
    if (tool === "fill") {
      floodFill(ctx(), Math.round(x), Math.round(y), color)
      return
    }
    drawing.current = true
    const c = ctx()
    c.lineCap = "round"
    c.lineJoin = "round"
    c.beginPath()
    c.moveTo(x, y)
  }

  function onMove(e: React.PointerEvent) {
    if (!drawing.current || tool === "fill") return
    const { x, y } = pos(e)
    const c = ctx()
    c.strokeStyle = tool === "eraser" ? "#ffffff" : color
    c.lineWidth = size
    c.lineTo(x, y)
    c.stroke()
  }

  function onUp() {
    drawing.current = false
  }

  function undo() {
    const prev = undoStack.current.pop()
    if (prev) ctx().putImageData(prev, 0, 0)
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="w-full touch-none rounded-lg border border-gray-300 bg-white shadow-inner"
        style={{ aspectRatio: `${W}/${H}`, cursor: "crosshair" }}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setColor(c)
              setTool("brush")
            }}
            aria-label={`colour ${c}`}
            className={`h-7 w-7 rounded-full border-2 ${color === c && tool !== "eraser" ? "border-brand ring-2 ring-brand/40" : "border-gray-300"}`}
            style={{ background: c }}
          />
        ))}
        <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 border-gray-300" title="Custom colour">
          <span className="absolute inset-0 bg-[conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)]" />
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value)
              setTool("brush")
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ToolBtn active={tool === "brush"} onClick={() => setTool("brush")}>Brush</ToolBtn>
        <ToolBtn active={tool === "fill"} onClick={() => setTool("fill")}>Fill</ToolBtn>
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")}>Eraser</ToolBtn>
        <label className="flex items-center gap-1.5 text-gray-600">
          Size
          <input type="range" min={2} max={40} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
        <button type="button" onClick={undo} className="rounded-md border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50">
          Undo
        </button>
        <button
          type="button"
          onClick={() => {
            snapshot()
            clearTo()
          }}
          className="rounded-md border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

function ToolBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 ${active ? "border-brand bg-brand/10 text-brand" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
    >
      {children}
    </button>
  )
}

// Scanline flood fill. ponytail: O(pixels) stack fill — fine for 300×200
// (60k px). Replace with a span-based fill only if it ever feels slow.
function floodFill(c: CanvasRenderingContext2D, x: number, y: number, hex: string) {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const img = c.getImageData(0, 0, W, H)
  const d = img.data
  const idx = (px: number, py: number) => (py * W + px) * 4
  const start = idx(x, y)
  const target = [d[start], d[start + 1], d[start + 2], d[start + 3]]
  const fill = hexToRgba(hex)
  if (same(target, fill)) return
  const stack = [[x, y]]
  while (stack.length) {
    const [px, py] = stack.pop()!
    if (px < 0 || py < 0 || px >= W || py >= H) continue
    const i = idx(px, py)
    if (!same([d[i], d[i + 1], d[i + 2], d[i + 3]], target)) continue
    d[i] = fill[0]
    d[i + 1] = fill[1]
    d[i + 2] = fill[2]
    d[i + 3] = fill[3]
    stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1])
  }
  c.putImageData(img, 0, 0)
}

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255]
}

function same(a: number[], b: number[]): boolean {
  // small tolerance so anti-aliased edges fill cleanly
  return Math.abs(a[0] - b[0]) < 8 && Math.abs(a[1] - b[1]) < 8 && Math.abs(a[2] - b[2]) < 8 && Math.abs(a[3] - b[3]) < 8
}
