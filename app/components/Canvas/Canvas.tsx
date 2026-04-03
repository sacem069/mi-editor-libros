'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import { BOOK_SIZE } from '../../config/bookSize'
import { dropPhotoOnFrame, findFrameAtPoint } from './fabricHelpers'
import './Canvas.css'

const PAGE_W = BOOK_SIZE.widthPx   // 816
const PAGE_H = BOOK_SIZE.heightPx  // 1058
const BLEED  = BOOK_SIZE.bleedPx   // 11

interface CanvasProps {
  zoom: number
  showBleed: boolean
  currentSpread: number
  totalSpreads: number
  onObjectSelected: (obj: fabric.FabricObject | null) => void
  onCanvasReady: (left: fabric.Canvas, right: fabric.Canvas) => void
  onSpreadChange: (spread: number) => void
}

// Spread 0 = Contratapa | Tapa. Spread 1+ = interior pages.
function spreadLabel(spread: number): { left: string; right: string } {
  if (spread === 0) return { left: 'Contra', right: 'Tapa' }
  const left = String(spread * 2).padStart(2, '0')
  const right = String(spread * 2 + 1).padStart(2, '0')
  return { left, right }
}

function BleedOverlay() {
  return (
    <svg
      className="canvas-bleed-overlay"
      width={PAGE_W}
      height={PAGE_H}
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      aria-hidden="true"
    >
      <rect
        x={BLEED}
        y={BLEED}
        width={PAGE_W - BLEED * 2}
        height={PAGE_H - BLEED * 2}
        fill="none"
        stroke="#528ED6"
        strokeWidth={1}
        strokeDasharray="5 5"
      />
    </svg>
  )
}

export default function Canvas({
  zoom,
  showBleed,
  currentSpread,
  totalSpreads,
  onObjectSelected,
  onCanvasReady,
  onSpreadChange,
}: CanvasProps) {
  const leftElRef   = useRef<HTMLCanvasElement>(null)
  const rightElRef  = useRef<HTMLCanvasElement>(null)
  const leftFabric  = useRef<fabric.Canvas | null>(null)
  const rightFabric = useRef<fabric.Canvas | null>(null)

  // Keep callbacks in refs so the useEffect dep array stays stable
  const onObjectSelectedRef = useRef(onObjectSelected)
  const onCanvasReadyRef    = useRef(onCanvasReady)
  useEffect(() => { onObjectSelectedRef.current = onObjectSelected }, [onObjectSelected])
  useEffect(() => { onCanvasReadyRef.current    = onCanvasReady    }, [onCanvasReady])

  // ── Fabric initialisation (mount only) ────────────────────────────────────
  useEffect(() => {
    if (!leftElRef.current || !rightElRef.current) return

    const lc = new fabric.Canvas(leftElRef.current, {
      width: PAGE_W,
      height: PAGE_H,
      backgroundColor: '#ffffff',
      selection: true,
    })
    const rc = new fabric.Canvas(rightElRef.current, {
      width: PAGE_W,
      height: PAGE_H,
      backgroundColor: '#ffffff',
      selection: true,
    })

    leftFabric.current  = lc
    rightFabric.current = rc

    const bindEvents = (fc: fabric.Canvas) => {
      fc.on('selection:created', (e) =>
        onObjectSelectedRef.current(e.selected?.[0] ?? null),
      )
      fc.on('selection:updated', (e) =>
        onObjectSelectedRef.current(e.selected?.[0] ?? null),
      )
      fc.on('selection:cleared', () => onObjectSelectedRef.current(null))
    }
    bindEvents(lc)
    bindEvents(rc)

    onCanvasReadyRef.current(lc, rc)

    return () => {
      lc.dispose()
      rc.dispose()
    }
  }, [])

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const makeDrop = useCallback(
    (getFabric: () => fabric.Canvas | null) =>
      async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const fc = getFabric()
        if (!fc) return

        const src = e.dataTransfer.getData('text/plain')
        if (!src) return

        const wrapRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const x = (e.clientX - wrapRect.left)  / zoom
        const y = (e.clientY - wrapRect.top)   / zoom

        const frame = findFrameAtPoint(fc, x, y)
        if (frame) {
          await dropPhotoOnFrame(fc, frame as fabric.Rect, src, PAGE_W, PAGE_H)
        }
      },
    [zoom],
  )

  const handleDropLeft  = makeDrop(() => leftFabric.current)
  const handleDropRight = makeDrop(() => rightFabric.current)
  const handleDragOver  = (e: React.DragEvent) => e.preventDefault()

  // ── Navigation ────────────────────────────────────────────────────────────
  const { left: leftLabel, right: rightLabel } = spreadLabel(currentSpread)

  const goLeft  = () => onSpreadChange(Math.max(0, currentSpread - 1))
  const goRight = () => onSpreadChange(Math.min(totalSpreads - 1, currentSpread + 1))

  // ── Render ────────────────────────────────────────────────────────────────
  const scaledW = (PAGE_W * 2 + 1) * zoom  // 1px spine
  const scaledH = PAGE_H * zoom

  return (
    <div className="canvas-wrapper">
      {/* Outer box reserves the scaled space so sibling panels aren't pushed */}
      <div
        className="canvas-scale-anchor"
        style={{ width: scaledW, height: scaledH + 80 /* nav */ }}
      >
        <div
          className="canvas-spread-root"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {/* ── Ruler row ── */}
          <div className="canvas-ruler-row">
            <div className="canvas-ruler-corner" />
            <div className="canvas-ruler-h" style={{ width: PAGE_W }} />
            <div className="canvas-ruler-spine-gap" />
            <div className="canvas-ruler-h" style={{ width: PAGE_W }} />
          </div>

          {/* ── Pages row ── */}
          <div className="canvas-pages-row">
            {/* Vertical ruler */}
            <div className="canvas-ruler-v" style={{ height: PAGE_H }} />

            {/* Left page */}
            <div className="canvas-page-col">
              <div className="canvas-page-num">{leftLabel}</div>
              <div
                className="canvas-page-wrap"
                onDrop={handleDropLeft}
                onDragOver={handleDragOver}
              >
                <canvas ref={leftElRef} />
                {showBleed && <BleedOverlay />}
              </div>
            </div>

            {/* Spine */}
            <div className="canvas-spine" />

            {/* Right page */}
            <div className="canvas-page-col">
              <div className="canvas-page-num">{rightLabel}</div>
              <div
                className="canvas-page-wrap"
                onDrop={handleDropRight}
                onDragOver={handleDragOver}
              >
                <canvas ref={rightElRef} />
                {showBleed && <BleedOverlay />}
              </div>
            </div>
          </div>

          {/* ── Navigation ── */}
          <div className="canvas-nav">
            <button
              className="canvas-nav-arrow"
              onClick={goLeft}
              disabled={currentSpread === 0}
              aria-label="Página anterior"
            >
              {'<'}
            </button>
            <span className="canvas-nav-label">
              Página&nbsp;&nbsp;{leftLabel} - {rightLabel}
            </span>
            <button
              className="canvas-nav-arrow"
              onClick={goRight}
              disabled={currentSpread === totalSpreads - 1}
              aria-label="Página siguiente"
            >
              {'>'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
