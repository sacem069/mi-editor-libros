'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import * as fabric from 'fabric'
import { X } from 'lucide-react'
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
  onActivePageChange: (page: 'left' | 'right') => void
  onLayoutDropOnPage: (layoutId: string, page: 'left' | 'right') => void
  onPhotoDrop: (photoId: string) => void
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
  onActivePageChange,
  onLayoutDropOnPage,
  onPhotoDrop,
}: CanvasProps) {
  const leftElRef   = useRef<HTMLCanvasElement>(null)
  const rightElRef  = useRef<HTMLCanvasElement>(null)
  const leftFabric  = useRef<fabric.Canvas | null>(null)
  const rightFabric = useRef<fabric.Canvas | null>(null)
  const outerRef    = useRef<HTMLDivElement>(null)

  // ── Active page + drag-over visual state ─────────────────────────────────
  const [activePage,   setActivePage]   = useState<'left' | 'right'>('left')
  const [dragOverPage, setDragOverPage] = useState<'left' | 'right' | null>(null)

  // ── Selected textbox tracking (for delete button) ─────────────────────────
  type TextSel = { side: 'left' | 'right'; top: number; left: number; width: number } | null
  const [textSel,     setTextSel]     = useState<TextSel>(null)
  const [textEditing, setTextEditing] = useState(false)

  // Mirror latest callbacks/values into refs so effects stay stable
  const onObjectSelectedRef   = useRef(onObjectSelected)
  const onCanvasReadyRef      = useRef(onCanvasReady)
  const onZoomChangeRef       = useRef(onZoomChange)
  const onActivePageChangeRef = useRef(onActivePageChange)
  const onLayoutDropOnPageRef = useRef(onLayoutDropOnPage)
  const onPhotoDropRef        = useRef(onPhotoDrop)
  const zoomRef               = useRef(zoom)

  useEffect(() => { onObjectSelectedRef.current   = onObjectSelected   }, [onObjectSelected])
  useEffect(() => { onCanvasReadyRef.current       = onCanvasReady       }, [onCanvasReady])
  useEffect(() => { onZoomChangeRef.current        = onZoomChange        }, [onZoomChange])
  useEffect(() => { onActivePageChangeRef.current  = onActivePageChange  }, [onActivePageChange])
  useEffect(() => { onLayoutDropOnPageRef.current  = onLayoutDropOnPage  }, [onLayoutDropOnPage])
  useEffect(() => { onPhotoDropRef.current         = onPhotoDrop         }, [onPhotoDrop])
  useEffect(() => { zoomRef.current                = zoom               }, [zoom])

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

  // ── Fabric initialisation ─────────────────────────────────────────────────
  // This component is loaded with { ssr: false } so it only ever runs in the
  // browser. The <canvas> elements are unconditionally rendered, so refs are
  // already populated when this effect fires on mount.
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

    const updateTextSel = (obj: fabric.FabricObject | null | undefined, side: 'left' | 'right') => {
      if (obj instanceof fabric.Textbox) {
        const br = obj.getBoundingRect()
        setTextSel({ side, top: br.top, left: br.left, width: br.width })
      } else {
        setTextSel(null)
      }
    }

    const bind = (fc: fabric.Canvas, side: 'left' | 'right') => {
      fc.on('mouse:down', () => {
        setActivePage(side)
        onActivePageChangeRef.current(side)
      })
      fc.on('selection:created', (e) => {
        onObjectSelectedRef.current(e.selected?.[0] ?? null)
        updateTextSel(e.selected?.[0], side)
      })
      fc.on('selection:updated', (e) => {
        onObjectSelectedRef.current(e.selected?.[0] ?? null)
        updateTextSel(e.selected?.[0], side)
      })
      fc.on('selection:cleared', () => {
        onObjectSelectedRef.current(null)
        setTextSel(null)
      })
      fc.on('object:modified', (e) => {
        if (e.target instanceof fabric.Textbox) {
          const br = e.target.getBoundingRect()
          setTextSel({ side, top: br.top, left: br.left, width: br.width })
        }
      })
      fc.on('text:editing:entered', () => setTextEditing(true))
      fc.on('text:editing:exited',  () => setTextEditing(false))
    }
    bind(lc, 'left')
    bind(rc, 'right')
    onCanvasReadyRef.current(lc, rc)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      for (const fc of [lc, rc]) {
        const obj = fc.getActiveObject()
        if (obj instanceof fabric.Textbox) {
          if ((obj as fabric.Textbox).isEditing) return
          fc.remove(obj)
          fc.renderAll()
          setTextSel(null)
          return
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      lc.dispose()
      rc.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag & drop (shared logic, page determined by call site) ─────────────
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, page: 'left' | 'right') => {
      e.preventDefault()
      setDragOverPage(null)

      // Layout drop takes priority over photo drop
      const layoutId = e.dataTransfer.getData('application/zeika-layout')
      if (layoutId) {
        onLayoutDropOnPageRef.current(layoutId, page)
        return
      }

      // Photo drop
      const photoUrl = e.dataTransfer.getData('text/plain')
      if (!photoUrl) return

      const fc = page === 'left' ? leftFabric.current : rightFabric.current
      if (!fc) return

      const rect  = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
      const x     = (e.clientX - rect.left) / zoomRef.current
      const y     = (e.clientY - rect.top)  / zoomRef.current
      const frame = findFrameAtPoint(fc, x, y)
      if (frame) {
        await dropPhotoOnFrame(fc, frame as fabric.Rect, photoUrl, PAGE_W, PAGE_H)
        const photoId = e.dataTransfer.getData('application/zeika-photo-id')
        if (photoId) onPhotoDropRef.current(photoId)
      }
    },
    [], // all mutable values accessed through stable refs
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, page: 'left' | 'right') => {
      e.preventDefault()
      setDragOverPage(page)
    },
    [],
  )

  const handleDragLeave = useCallback(() => setDragOverPage(null), [])

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
                <div
                  className={[
                    'canvas-page-wrap',
                    activePage   === 'left' ? 'canvas-page-wrap--active'    : '',
                    dragOverPage === 'left' ? 'canvas-page-wrap--drag-over' : '',
                  ].filter(Boolean).join(' ')}
                  onDrop={(e) => handleDrop(e, 'left')}
                  onDragOver={(e) => handleDragOver(e, 'left')}
                  onDragLeave={handleDragLeave}
                >
                  <canvas ref={leftElRef} />
                  {showBleed && <BleedOverlay />}
                  {textSel?.side === 'left' && !textEditing && (
                    <button
                      className="canvas-text-delete"
                      style={{ top: textSel.top, left: textSel.left + textSel.width }}
                      onClick={() => {
                        const fc = leftFabric.current
                        if (!fc) return
                        const obj = fc.getActiveObject()
                        if (obj) { fc.remove(obj); fc.renderAll(); setTextSel(null) }
                      }}
                      aria-label="Eliminar texto"
                    >
                      <X size={9} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>

              <div className="canvas-spine" />

              {/* Right page */}
              <div className="canvas-page-col">
                <div className="canvas-page-num">{rightLabel}</div>
                <div
                  className={[
                    'canvas-page-wrap',
                    activePage   === 'right' ? 'canvas-page-wrap--active'    : '',
                    dragOverPage === 'right' ? 'canvas-page-wrap--drag-over' : '',
                  ].filter(Boolean).join(' ')}
                  onDrop={(e) => handleDrop(e, 'right')}
                  onDragOver={(e) => handleDragOver(e, 'right')}
                  onDragLeave={handleDragLeave}
                >
                  <canvas ref={rightElRef} />
                  {showBleed && <BleedOverlay />}
                  {textSel?.side === 'right' && !textEditing && (
                    <button
                      className="canvas-text-delete"
                      style={{ top: textSel.top, left: textSel.left + textSel.width }}
                      onClick={() => {
                        const fc = rightFabric.current
                        if (!fc) return
                        const obj = fc.getActiveObject()
                        if (obj) { fc.remove(obj); fc.renderAll(); setTextSel(null) }
                      }}
                      aria-label="Eliminar texto"
                    >
                      <X size={9} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="canvas-nav">
              <button className="canvas-nav-arrow" onClick={goLeft}  disabled={currentSpread === 0}               aria-label="Página anterior">{'<'}</button>
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
