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

const MAX_HISTORY = 20

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

  // ── Pan mode indicator (shown as "Editando foto" label overlay) ───────────
  const [panModeActive, setPanModeActive] = useState<'left' | 'right' | null>(null)

  // ── Per-canvas undo history ───────────────────────────────────────────────
  const lcHistoryRef = useRef<string[]>([])
  const rcHistoryRef = useRef<string[]>([])
  // Guard: suppress history saves during loadFromJSON restoration
  const isLoadingHistory = useRef(false)

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

    // ── Per-canvas history helpers ─────────────────────────────────────────
    const getHistRef = (fc: fabric.Canvas) => fc === lc ? lcHistoryRef : rcHistoryRef

    const saveHistory = (fc: fabric.Canvas) => {
      if (isLoadingHistory.current) return
      const json = JSON.stringify(fc.toObject(['data']))
      const ref  = getHistRef(fc)
      ref.current = [...ref.current.slice(-(MAX_HISTORY - 1)), json]
    }

    // Re-applies clipPath absolutePositioned and control visibility after
    // loadFromJSON, which restores objects but loses some runtime-only state.
    const reapplyPhotoState = (fc: fabric.Canvas) => {
      for (const obj of fc.getObjects()) {
        const data = (obj as fabric.FabricObject & { data?: { type: string } }).data
        if (data?.type === 'photo') {
          if (obj.clipPath) obj.clipPath.absolutePositioned = true
          obj.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })
          obj.set({ borderColor: '#528ED6', borderScaleFactor: 2 })
        }
      }
    }

    const undoCanvas = (fc: fabric.Canvas) => {
      const ref = getHistRef(fc)
      if (ref.current.length <= 1) return
      const newHist = ref.current.slice(0, -1)
      ref.current   = newHist
      const prevJson = newHist[newHist.length - 1]
      isLoadingHistory.current = true
      fc.loadFromJSON(JSON.parse(prevJson)).then(() => {
        reapplyPhotoState(fc)
        fc.renderAll()
        isLoadingHistory.current = false
      })
    }

    const updateTextSel = (obj: fabric.FabricObject | null | undefined, side: 'left' | 'right') => {
      if (obj instanceof fabric.Textbox) {
        const br = obj.getBoundingRect()
        setTextSel({ side, top: br.top, left: br.left, width: br.width })
      } else {
        setTextSel(null)
      }
    }

    // Track which canvas was last interacted with (for Ctrl+Z)
    let activeCanvas: fabric.Canvas = lc

    // ── Pan mode ────────────────────────────────────────────────────────────
    // STATE 1: idle — no visible border
    // STATE 2: selected — solid blue border, all handles, drag moves whole frame
    // STATE 3: pan mode (double-click) — dashed border, no handles,
    //          image pans via direct left/top; clipPath stays fixed at frame
    let panTarget:      (fabric.FabricObject & { data?: { type: string; frameX: number; frameY: number; frameW: number; frameH: number; naturalW: number; naturalH: number } }) | null = null
    let isPanDragging   = false
    let panStartX       = 0
    let panStartY       = 0
    let panStartImgLeft = 0
    let panStartImgTop  = 0

    const enterPanMode = (obj: fabric.FabricObject, side: 'left' | 'right') => {
      panTarget = obj as typeof panTarget
      obj.set({
        selectable:      false,   // Fabric won't handle drags — we do it manually
        hasControls:     false,
        hoverCursor:     'grab',
        borderColor:     '#528ED6',
        borderDashArray: [6, 4],
      })
      setPanModeActive(side)
      obj.canvas?.renderAll()
    }

    const exitPanMode = (saveHist = true) => {
      if (panTarget) {
        panTarget.set({
          selectable:      true,
          hasControls:     true,
          hoverCursor:     'move',
          borderColor:     '#528ED6',
          borderDashArray: [],
        })
        if (saveHist) saveHistory(panTarget.canvas as fabric.Canvas)
        panTarget.canvas?.renderAll()
      }
      panTarget     = null
      isPanDragging = false
      setPanModeActive(null)
    }

    const bind = (fc: fabric.Canvas, side: 'left' | 'right') => {
      fc.on('mouse:down', (e) => {
        setActivePage(side)
        onActivePageChangeRef.current(side)
        activeCanvas = fc

        if (panTarget && panTarget.canvas === fc) {
          // In pan mode: check if clicking on the pan target
          const pt = e.scenePoint
          const obj = panTarget
          const l = obj.left ?? 0
          const t = obj.top  ?? 0
          const w = (obj.width  ?? 0) * (obj.scaleX ?? 1)
          const h = (obj.height ?? 0) * (obj.scaleY ?? 1)
          // Hit-test against the image's current rendered bounding box
          const hitLeft   = l - w / 2
          const hitTop    = t - h / 2
          const hitRight  = l + w / 2
          const hitBottom = t + h / 2

          if (pt.x >= hitLeft && pt.x <= hitRight && pt.y >= hitTop && pt.y <= hitBottom) {
            isPanDragging   = true
            panStartX       = pt.x
            panStartY       = pt.y
            panStartImgLeft = obj.left ?? 0
            panStartImgTop  = obj.top  ?? 0
            fc.setCursor('grabbing')
          } else {
            exitPanMode()
          }
        }
      })

      // ── Mouse move: pan image position when in pan mode ──────────────────
      fc.on('mouse:move', (e) => {
        if (!isPanDragging || !panTarget || panTarget.canvas !== fc) return
        const pt = e.scenePoint
        const dx = pt.x - panStartX
        const dy = pt.y - panStartY
        panTarget.set({
          left: panStartImgLeft + dx,
          top:  panStartImgTop  + dy,
        })
        fc.renderAll()
      })

      // ── Mouse up: stop panning ───────────────────────────────────────────
      fc.on('mouse:up', () => {
        if (isPanDragging) {
          // Save updated position into data for serialization
          if (panTarget?.data) {
            // No frameX/Y update needed here — frame position is the clipPath,
            // which stays fixed. Only imgLeft/Top changes.
          }
          fc.setCursor('grab')
        }
        isPanDragging = false
        setDragOverPage(null)
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
        saveHistory(fc)
      })
      fc.on('text:editing:entered', () => setTextEditing(true))
      fc.on('text:editing:exited',  () => setTextEditing(false))

      // ── Photo scaling: maintain cover-fit, update clipPath ────────────────
      fc.on('object:scaling', (e) => {
        const obj = e.target as fabric.FabricImage & {
          data?: { type: string; frameX: number; frameY: number; frameW: number; frameH: number; naturalW: number; naturalH: number }
          clipPath?: fabric.Rect
        }
        if (obj?.data?.type !== 'photo') return

        const pd = obj.data
        // New frame size = virtual_dim × new scale
        const newFrameW = (obj.width  ?? 0) * (obj.scaleX ?? 1)
        const newFrameH = (obj.height ?? 0) * (obj.scaleY ?? 1)

        // Cover scale and new virtual dims
        const newScale = Math.max(newFrameW / pd.naturalW, newFrameH / pd.naturalH)
        const newVirtW = newFrameW / newScale
        const newVirtH = newFrameH / newScale

        const cx = obj.left ?? 0
        const cy = obj.top  ?? 0

        obj.set({
          scaleX: newScale,
          scaleY: newScale,
          width:  newVirtW,
          height: newVirtH,
        })

        const newFrameX = cx - newFrameW / 2
        const newFrameY = cy - newFrameH / 2

        // Update clipPath to match new frame dimensions
        if (obj.clipPath) {
          obj.clipPath.set({
            left:   newFrameX,
            top:    newFrameY,
            width:  newFrameW,
            height: newFrameH,
          })
        }

        // Keep data in sync
        pd.frameX = newFrameX
        pd.frameY = newFrameY
        pd.frameW = newFrameW
        pd.frameH = newFrameH
      })

      // ── Object moving: update clipPath and frameX/Y ───────────────────────
      // Fires only in STATE 2 (selectable=true). In pan mode selectable=false
      // so Fabric never generates drag transforms for the pan target.
      fc.on('object:moving', (e) => {
        const obj = e.target as fabric.FabricObject & {
          data?: { type: string; frameX: number; frameY: number; frameW: number; frameH: number }
          clipPath?: fabric.Rect
        }

        if (obj?.data?.type === 'photo') {
          const cx = obj.left ?? 0
          const cy = obj.top  ?? 0
          const pd = obj.data
          const newFrameX = cx - pd.frameW / 2
          const newFrameY = cy - pd.frameH / 2
          pd.frameX = newFrameX
          pd.frameY = newFrameY

          // Move clipPath with the frame
          if (obj.clipPath) {
            obj.clipPath.set({ left: newFrameX, top: newFrameY })
          }
        }

        // Cross-canvas drag highlight
        const cx2 = (e.target as fabric.FabricObject).getCenterPoint().x
        setDragOverPage(
          side === 'left'
            ? (cx2 > PAGE_W * 0.85 ? 'right' : null)
            : (cx2 < PAGE_W * 0.15 ? 'left'  : null),
        )
      })

      // ── Double-click: toggle pan mode ────────────────────────────────────
      fc.on('mouse:dblclick', (e) => {
        const obj = e.target as fabric.FabricObject & { data?: { type: string } }
        if (obj?.data?.type !== 'photo') return
        if (panTarget === obj) {
          exitPanMode()
        } else {
          if (panTarget) exitPanMode(false)
          enterPanMode(obj, side)
        }
      })

      // Save history when objects are added (e.g. photo dropped)
      fc.on('object:added', () => saveHistory(fc))
      fc.on('object:removed', () => saveHistory(fc))
    }
    bind(lc, 'left')
    bind(rc, 'right')

    // ── Cross-canvas object transfer ─────────────────────────────────────────
    const CANVAS_GAP = PAGE_W + SPINE

    const transferToCanvas = async (
      obj: fabric.FabricObject,
      from: fabric.Canvas,
      to: fabric.Canvas,
      offsetX: number,
    ) => {
      if (obj === panTarget) exitPanMode(false)

      const cloned = await obj.clone()
      cloned.set({ left: (cloned.left ?? 0) + offsetX })

      const srcData = (obj as fabric.FabricObject & { data?: Record<string, unknown> }).data
      if (srcData) {
        const newData = { ...srcData }
        if (newData.type === 'photo') {
          newData.frameX = ((newData.frameX as number) ?? 0) + offsetX
        }
        ;(cloned as fabric.FabricObject & { data: Record<string, unknown> }).data = newData
      }

      // Update cloned clipPath position to match new canvas offset
      if ((srcData as { type?: string } | undefined)?.type === 'photo') {
        cloned.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })
        cloned.set({ borderColor: '#528ED6', borderScaleFactor: 2 })
        if (cloned.clipPath) {
          cloned.clipPath.set({ left: ((cloned.clipPath.left ?? 0) + offsetX) })
        }
      }

      from.remove(obj)
      from.discardActiveObject()
      from.renderAll()

      to.add(cloned)
      to.setActiveObject(cloned)
      to.renderAll()
    }

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
      // ── Ctrl/Cmd + Z: undo ───────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoCanvas(activeCanvas)
        return
      }

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
          if (obj === panTarget) exitPanMode(false)
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

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, page: 'left' | 'right') => {
      e.preventDefault()
      setDragOverPage(null)

      const layoutId = e.dataTransfer.getData('application/zeika-layout')
      if (layoutId) {
        onLayoutDropOnPageRef.current(layoutId, page)
        return
      }

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
    [],
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
