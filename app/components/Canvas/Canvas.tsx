'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import * as fabric from 'fabric'
import { X } from 'lucide-react'
import { BOOK_SIZE } from '../../config/bookSize'
import { dropPhotoOnFrame, findFrameAtPoint, restoreEmptyFrame } from './fabricHelpers'
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
  const [textSel,       setTextSel]       = useState<TextSel>(null)
  const [textEditing,   setTextEditing]   = useState(false)

  // ── Pan mode indicator (shown as "Editando foto" label overlay) ───────────
  const [panModeActive, setPanModeActive] = useState<'left' | 'right' | null>(null)

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

    // ── Pan mode ────────────────────────────────────────────────────────────
    // STATE 1: idle (not selected) — no visible border
    // STATE 2: selected — solid blue border, all handles, can move whole frame
    // STATE 3: pan mode (double-click) — dashed blue border, no handles,
    //          image pans via cropX/cropY, "Editando foto" label shown
    let panTarget: fabric.FabricObject | null = null
    let isPanning  = false
    let lastPanX   = 0
    let lastPanY   = 0

    const enterPanMode = (obj: fabric.FabricObject, side: 'left' | 'right') => {
      panTarget = obj
      obj.set({
        hasControls:    false,
        lockMovementX:  true,
        lockMovementY:  true,
        hoverCursor:    'grab',
        borderColor:    '#528ED6',
        borderDashArray: [6, 4],
      })
      setPanModeActive(side)
      obj.canvas?.renderAll()
    }

    const exitPanMode = () => {
      if (panTarget) {
        panTarget.set({
          hasControls:    true,
          lockMovementX:  false,
          lockMovementY:  false,
          hoverCursor:    'move',
          borderColor:    '#528ED6',
          borderDashArray: [],
        })
        panTarget.canvas?.renderAll()
      }
      panTarget = null
      isPanning  = false
      setPanModeActive(null)
    }

    const bind = (fc: fabric.Canvas, side: 'left' | 'right') => {
      fc.on('mouse:down', (e) => {
        setActivePage(side)
        onActivePageChangeRef.current(side)
        if (panTarget) {
          if (e.target === panTarget) {
            // Start panning: record initial mouse position
            isPanning = true
            lastPanX  = e.scenePoint.x
            lastPanY  = e.scenePoint.y
          } else {
            exitPanMode()
          }
        }
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

      // ── Photo resize: maintain cover-fit, keep handles at frame boundary ──
      fc.on('object:scaling', (e) => {
        const obj = e.target as fabric.FabricImage & {
          data?: { type: string; frameX: number; frameY: number; frameW: number; frameH: number; naturalW: number; naturalH: number; cropX: number; cropY: number }
        }
        if (obj?.data?.type !== 'photo') return

        const pd = obj.data
        // Virtual rendered size: virtual_width × scaleX = frame size in canvas px
        const newFrameW = (obj.width  ?? 0) * (obj.scaleX ?? 1)
        const newFrameH = (obj.height ?? 0) * (obj.scaleY ?? 1)

        // Recompute cover scale and virtual crop-window dimensions
        const newScale  = Math.max(newFrameW / pd.naturalW, newFrameH / pd.naturalH)
        const newCropW  = newFrameW / newScale
        const newCropH  = newFrameH / newScale

        // Clamp existing crop offset for the new crop-window size
        const newCropX = Math.max(0, Math.min(pd.naturalW - newCropW, obj.cropX ?? 0))
        const newCropY = Math.max(0, Math.min(pd.naturalH - newCropH, obj.cropY ?? 0))

        const cx = obj.left ?? 0
        const cy = obj.top  ?? 0

        // Apply new scale, virtual dims and clamped crop
        obj.set({
          scaleX: newScale,
          scaleY: newScale,
          width:  newCropW,
          height: newCropH,
          cropX:  newCropX,
          cropY:  newCropY,
        })

        // Update frame data for serialization
        pd.frameX = cx - newFrameW / 2
        pd.frameY = cy - newFrameH / 2
        pd.frameW = newFrameW
        pd.frameH = newFrameH
        pd.cropX  = newCropX
        pd.cropY  = newCropY
      })

      // ── Mouse move: pan cropX/cropY when in pan mode ─────────────────────
      fc.on('mouse:move', (e) => {
        if (!isPanning || !panTarget || panTarget.canvas !== fc) return

        const pt = e.scenePoint
        const dx = pt.x - lastPanX
        const dy = pt.y - lastPanY
        lastPanX = pt.x
        lastPanY = pt.y
        if (dx === 0 && dy === 0) return

        const img = panTarget as fabric.FabricImage & {
          data: { naturalW: number; naturalH: number; cropX: number; cropY: number }
        }
        const pd    = (img as { data: { naturalW: number; naturalH: number; cropX: number; cropY: number } }).data
        const scale = img.scaleX ?? 1

        // shift crop window opposite to drag direction
        let newCropX = img.cropX - dx / scale
        let newCropY = img.cropY - dy / scale

        // clamp to valid range
        newCropX = Math.max(0, Math.min(pd.naturalW - img.width,  newCropX))
        newCropY = Math.max(0, Math.min(pd.naturalH - img.height, newCropY))

        img.set({ cropX: newCropX, cropY: newCropY })
        pd.cropX = newCropX
        pd.cropY = newCropY
        fc.renderAll()
      })

      // ── Mouse up: stop panning ───────────────────────────────────────────
      fc.on('mouse:up', () => {
        isPanning = false
        setDragOverPage(null)
      })

      // ── Object moving: update frameX/Y when whole frame is dragged ────────
      // In pan mode the image is locked (lockMovementX/Y), so this only fires
      // in normal mode (STATE 2). No clipPath to update — image fills frame exactly.
      fc.on('object:moving', (e) => {
        const obj = e.target as fabric.FabricObject & {
          data?: { type: string; frameX: number; frameY: number; frameW: number; frameH: number }
        }

        if (obj?.data?.type === 'photo') {
          const cx = obj.left ?? 0
          const cy = obj.top  ?? 0
          const pd = obj.data
          pd.frameX = cx - pd.frameW / 2
          pd.frameY = cy - pd.frameH / 2
        }

        // Cross-canvas drag highlight
        const cx = (e.target as fabric.FabricObject).getCenterPoint().x
        setDragOverPage(
          side === 'left'
            ? (cx > PAGE_W * 0.85 ? 'right' : null)
            : (cx < PAGE_W * 0.15 ? 'left'  : null),
        )
      })

      // ── Double-click: toggle pan mode (STATE 2 ↔ STATE 3) ────────────────
      fc.on('mouse:dblclick', (e) => {
        const obj = e.target as fabric.FabricObject & { data?: { type: string } }
        if (obj?.data?.type !== 'photo') return
        if (panTarget === obj) {
          exitPanMode()
        } else {
          if (panTarget) exitPanMode()
          enterPanMode(obj, side)
        }
      })
    }
    bind(lc, 'left')
    bind(rc, 'right')

    // ── Cross-canvas object transfer ─────────────────────────────────────────
    // When a Fabric object is dragged past one canvas edge it's cloned onto the
    // adjacent canvas at the geometrically equivalent position.
    //
    // Coordinate convention:
    //   left canvas  → x: 0 … PAGE_W
    //   right canvas → x: 0 … PAGE_W
    //   visual gap   = PAGE_W + SPINE (817 px in spread coords)
    const CANVAS_GAP = PAGE_W + SPINE

    const transferToCanvas = async (
      obj: fabric.FabricObject,
      from: fabric.Canvas,
      to: fabric.Canvas,
      offsetX: number,
    ) => {
      // Exit pan mode if transferring the panned image
      if (obj === panTarget) exitPanMode()

      // Clone all standard Fabric properties (position, scale, cropX/Y, image element, …)
      const cloned = await obj.clone()
      cloned.set({ left: (cloned.left ?? 0) + offsetX })

      // Copy custom `data` — Fabric's clone() does not carry non-standard props.
      const srcData = (obj as fabric.FabricObject & { data?: Record<string, unknown> }).data
      if (srcData) {
        const newData = { ...srcData }
        if (newData.type === 'photo') newData.frameX = ((newData.frameX as number) ?? 0) + offsetX
        ;(cloned as fabric.FabricObject & { data: Record<string, unknown> }).data = newData
      }

      // Re-apply control visibility (clone() resets to Fabric defaults)
      if ((srcData as { type?: string } | undefined)?.type === 'photo') {
        cloned.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })
        cloned.set({ borderColor: '#528ED6', borderScaleFactor: 2 })
      }

      from.remove(obj)
      from.discardActiveObject()
      from.renderAll()

      to.add(cloned)
      to.setActiveObject(cloned)
      to.renderAll()
    }

    // Transfer after drag completes (object:modified fires on mouse-up after drag).
    // Skip if the object is the current pan target — panning stays on the same canvas.
    lc.on('object:modified', async (e) => {
      if ((e as unknown as { transform?: { action?: string } }).transform?.action !== 'drag') return
      if (!e.target || e.target === panTarget) return
      const cx = (e.target as fabric.FabricObject).getCenterPoint().x
      if (cx > PAGE_W) await transferToCanvas(e.target, lc, rc, -CANVAS_GAP)
    })
    rc.on('object:modified', async (e) => {
      if ((e as unknown as { transform?: { action?: string } }).transform?.action !== 'drag') return
      if (!e.target || e.target === panTarget) return
      const cx = (e.target as fabric.FabricObject).getCenterPoint().x
      if (cx < 0) await transferToCanvas(e.target, rc, lc, CANVAS_GAP)
    })

    onCanvasReadyRef.current(lc, rc)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitPanMode()
        return
      }

      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      for (const fc of [lc, rc]) {
        const obj = fc.getActiveObject()
        if (!obj) continue

        if (obj instanceof fabric.Textbox) {
          if ((obj as fabric.Textbox).isEditing) return
          fc.remove(obj); fc.renderAll(); setTextSel(null)
          return
        }

        const data = (obj as fabric.FabricObject & {
          data?: { type: string; frameX: number; frameY: number; frameW: number; frameH: number }
        }).data

        if (data?.type === 'photo') {
          if (obj === panTarget) exitPanMode()
          restoreEmptyFrame(fc, data)
          fc.remove(obj); fc.discardActiveObject(); fc.renderAll()
          return
        }

        if (data?.type === 'frame') {
          fc.remove(obj); fc.discardActiveObject(); fc.renderAll()
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
                  {panModeActive === 'left' && (
                    <div className="canvas-pan-label">Editando foto · ESC para salir</div>
                  )}
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
                  {panModeActive === 'right' && (
                    <div className="canvas-pan-label">Editando foto · ESC para salir</div>
                  )}
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
