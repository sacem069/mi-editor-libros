'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import { BOOK_SIZE } from '../../config/bookSize'
import { dropPhotoOnFrame, findFrameAtPoint } from './fabricHelpers'
import './Canvas.css'

const PAGE_W = BOOK_SIZE.widthPx   // 816
const PAGE_H = BOOK_SIZE.heightPx  // 1058
const BLEED  = BOOK_SIZE.bleedPx   // 11

// Unscaled full spread dimensions (page nums + canvases + nav, no rulers)
const PAGE_NUM = 32
const NAV      = 72
const SPINE    = 1

const SPREAD_W = PAGE_W + SPINE + PAGE_W   // 1633
const SPREAD_H = PAGE_NUM + PAGE_H + NAV   // 1162

const ZOOM_MIN = 0.25
const ZOOM_MAX = 2.0

interface CanvasProps {
  zoom: number
  showBleed: boolean
  currentSpread: number
  totalSpreads: number
  onObjectSelected: (obj: fabric.FabricObject | null) => void
  onCanvasReady: (left: fabric.Canvas, right: fabric.Canvas) => void
  onSpreadChange: (spread: number) => void
  onZoomChange: (zoom: number) => void
}

function spreadLabel(spread: number): { left: string; right: string } {
  if (spread === 0) return { left: 'Contra', right: 'Tapa' }
  const left  = String(spread * 2).padStart(2, '0')
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
        x={BLEED} y={BLEED}
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
  onZoomChange,
}: CanvasProps) {
  const leftElRef   = useRef<HTMLCanvasElement>(null)
  const rightElRef  = useRef<HTMLCanvasElement>(null)
  const leftFabric  = useRef<fabric.Canvas | null>(null)
  const rightFabric = useRef<fabric.Canvas | null>(null)
  const outerRef    = useRef<HTMLDivElement>(null)

  // Mirror latest callbacks/values into refs so effects stay stable
  const onObjectSelectedRef = useRef(onObjectSelected)
  const onCanvasReadyRef    = useRef(onCanvasReady)
  const onZoomChangeRef     = useRef(onZoomChange)
  const zoomRef             = useRef(zoom)
  useEffect(() => { onObjectSelectedRef.current = onObjectSelected }, [onObjectSelected])
  useEffect(() => { onCanvasReadyRef.current    = onCanvasReady    }, [onCanvasReady])
  useEffect(() => { onZoomChangeRef.current     = onZoomChange     }, [onZoomChange])
  useEffect(() => { zoomRef.current             = zoom             }, [zoom])

  // ── Initial zoom: hardcoded 49% ──────────────────────────────────────────
  useEffect(() => {
    onZoomChangeRef.current(0.49)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mouse wheel / pinch zoom ──────────────────────────────────────────────
  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      let dy = e.deltaY
      if (e.deltaMode === 1) dy *= 16   // LINE mode → px
      if (e.deltaMode === 2) dy *= 100  // PAGE mode → px

      // ctrlKey signals a pinch gesture on Mac trackpad
      const sensitivity = e.ctrlKey ? 0.02 : 0.003
      const factor      = 1 - dy * sensitivity
      const next        = parseFloat(
        Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRef.current * factor)).toFixed(3)
      )
      onZoomChangeRef.current(next)
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // ── Fabric initialisation (mount only) ────────────────────────────────────
  useEffect(() => {
    if (!leftElRef.current || !rightElRef.current) return

    const lc = new fabric.Canvas(leftElRef.current, {
      width: PAGE_W, height: PAGE_H, backgroundColor: '#ffffff', selection: true,
    })
    const rc = new fabric.Canvas(rightElRef.current, {
      width: PAGE_W, height: PAGE_H, backgroundColor: '#ffffff', selection: true,
    })

    leftFabric.current  = lc
    rightFabric.current = rc

    const bind = (fc: fabric.Canvas) => {
      fc.on('selection:created', (e) => onObjectSelectedRef.current(e.selected?.[0] ?? null))
      fc.on('selection:updated', (e) => onObjectSelectedRef.current(e.selected?.[0] ?? null))
      fc.on('selection:cleared', ()  => onObjectSelectedRef.current(null))
    }
    bind(lc)
    bind(rc)
    onCanvasReadyRef.current(lc, rc)

    return () => { lc.dispose(); rc.dispose() }
  }, [])

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const makeDrop = useCallback(
    (getFabric: () => fabric.Canvas | null) =>
      async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const fc  = getFabric()
        if (!fc) return
        const src = e.dataTransfer.getData('text/plain')
        if (!src) return
        const rect  = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const x     = (e.clientX - rect.left) / zoom
        const y     = (e.clientY - rect.top)  / zoom
        const frame = findFrameAtPoint(fc, x, y)
        if (frame) await dropPhotoOnFrame(fc, frame as fabric.Rect, src, PAGE_W, PAGE_H)
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
  const scaledW = SPREAD_W * zoom
  const scaledH = SPREAD_H * zoom

  return (
    <div className="canvas-outer" ref={outerRef}>
      {/* ── Scrollable + centered area ── */}
      <div className="canvas-inner">
        <div className="canvas-scale-anchor" style={{ width: scaledW, height: scaledH }}>
          <div
            className="canvas-spread-root"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            {/* Pages row */}
            <div className="canvas-pages-row">

              {/* Left page */}
              <div className="canvas-page-col">
                <div className="canvas-page-num">{leftLabel}</div>
                <div className="canvas-page-wrap" onDrop={handleDropLeft} onDragOver={handleDragOver}>
                  <canvas ref={leftElRef} />
                  {showBleed && <BleedOverlay />}
                </div>
              </div>

              <div className="canvas-spine" />

              {/* Right page */}
              <div className="canvas-page-col">
                <div className="canvas-page-num">{rightLabel}</div>
                <div className="canvas-page-wrap" onDrop={handleDropRight} onDragOver={handleDragOver}>
                  <canvas ref={rightElRef} />
                  {showBleed && <BleedOverlay />}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="canvas-nav">
              <button className="canvas-nav-arrow" onClick={goLeft}  disabled={currentSpread === 0}              aria-label="Página anterior">{'<'}</button>
              <span   className="canvas-nav-label">Página&nbsp;&nbsp;{leftLabel} - {rightLabel}</span>
              <button className="canvas-nav-arrow" onClick={goRight} disabled={currentSpread === totalSpreads - 1} aria-label="Página siguiente">{'>'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zoom badge ── */}
      <div className="canvas-zoom-badge" aria-label={`Zoom ${Math.round(zoom * 100)}%`}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  )
}
