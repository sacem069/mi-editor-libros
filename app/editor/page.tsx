'use client'

import { useState, useCallback, useRef } from 'react'
import * as fabric from 'fabric'

import Topbar      from '../components/Topbar/Topbar'
import Toolbar     from '../components/Toolbar/Toolbar'
import PhotoPanel, { type Photo } from '../components/PhotoPanel/PhotoPanel'
import Canvas      from '../components/Canvas/Canvas'
import LayoutPanel from '../components/LayoutPanel/LayoutPanel'
import PageStrip   from '../components/PageStrip/PageStrip'
import type { Layout } from '../components/LayoutPanel/LayoutPanel'

import { BOOK_SIZE }                                      from '../config/bookSize'
import { applyLayout, addTextBox, serializePage,
         deserializePage, dropPhotoOnFrame }              from '../components/Canvas/fabricHelpers'
import type { PageData }                                   from '../components/Canvas/fabricHelpers'

import './editor.css'

const PAGE_W = BOOK_SIZE.widthPx   // 816
const PAGE_H = BOOK_SIZE.heightPx  // 1058

// ─── Types ──────────────────────────────────────────────────────────────────

type SpreadSnapshot = { left: PageData; right: PageData }

// ─── Component ──────────────────────────────────────────────────────────────

export default function EditorPage() {

  // ── Photos ─────────────────────────────────────────────────────────────────
  const [photos,       setPhotos]       = useState<Photo[]>([])
  const [usedPhotoIds, setUsedPhotoIds] = useState<Set<string>>(new Set())

  // ── Book / navigation ──────────────────────────────────────────────────────
  const [currentSpread,       setCurrentSpread]       = useState(0)
  const [totalContentSpreads, setTotalContentSpreads] = useState(5)
  const totalSpreads = totalContentSpreads + 3 // cover + inside + content + outside

  // ── Layout panel ───────────────────────────────────────────────────────────
  const [selectedLayoutId,   setSelectedLayoutId]   = useState<string | null>(null)
  const [selectedPhotoCount, setSelectedPhotoCount] = useState(1)

  // ── Canvas settings ────────────────────────────────────────────────────────
  const [zoom,      setZoom]      = useState(0.75) // overridden by Canvas on mount
  const [showBleed, setShowBleed] = useState(false)

  // ── History (undo / redo) ──────────────────────────────────────────────────
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const history      = useRef<string[]>([])
  const historyIndex = useRef(-1)

  // ── Fabric instances ───────────────────────────────────────────────────────
  const fabricLeft  = useRef<fabric.Canvas | null>(null)
  const fabricRight = useRef<fabric.Canvas | null>(null)

  // ── Spread persistence ─────────────────────────────────────────────────────
  const saveTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentSpreadRef = useRef(0)   // mirror for use inside callbacks

  // ── Push a snapshot to history ─────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    const snapshot = JSON.stringify({
      left:  serializePage(lc, PAGE_W, PAGE_H),
      right: serializePage(rc, PAGE_W, PAGE_H),
    })

    // Truncate any redo branch, then append
    history.current   = [...history.current.slice(0, historyIndex.current + 1), snapshot]
    historyIndex.current = history.current.length - 1

    setCanUndo(historyIndex.current > 0)
    setCanRedo(false)
  }, [])

  // ── Save current spread to localStorage (debounced 1 s) ───────────────────
  const saveCurrentSpread = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const lc = fabricLeft.current
      const rc = fabricRight.current
      if (!lc || !rc) return

      const data: SpreadSnapshot = {
        left:  serializePage(lc, PAGE_W, PAGE_H),
        right: serializePage(rc, PAGE_W, PAGE_H),
      }
      localStorage.setItem(`zeika-spread-${currentSpreadRef.current}`, JSON.stringify(data))
      pushHistory()
    }, 1000)
  }, [pushHistory])

  // ── Canvas ready: wire up fabric instances and change listeners ────────────
  const handleCanvasReady = useCallback(
    (left: fabric.Canvas, right: fabric.Canvas) => {
      fabricLeft.current  = left
      fabricRight.current = right

      const onChange = () => saveCurrentSpread()
      for (const fc of [left, right]) {
        fc.on('object:modified', onChange)
        fc.on('object:added',    onChange)
        fc.on('object:removed',  onChange)
      }

      // Seed history with the initial blank state
      pushHistory()
    },
    [saveCurrentSpread, pushHistory],
  )

  // ── Photo upload ───────────────────────────────────────────────────────────
  const handlePhotoUpload = useCallback((files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const src = e.target?.result as string
        setPhotos((prev) => [
          ...prev,
          { id: crypto.randomUUID(), src, name: file.name },
        ])
      }
      reader.readAsDataURL(file)
    })
  }, [])

  // ── Photo click: place in first empty frame on active spread ───────────────
  const handlePhotoClick = useCallback(async (photo: Photo) => {
    for (const fc of [fabricLeft.current, fabricRight.current]) {
      if (!fc) continue
      const emptyFrame = fc.getObjects().find((obj) => {
        const d = (obj as fabric.FabricObject & { data?: { type: string; isEmpty: boolean } }).data
        return d?.type === 'frame' && d.isEmpty === true
      }) as fabric.Rect | undefined

      if (emptyFrame) {
        await dropPhotoOnFrame(fc, emptyFrame, photo.src, PAGE_W, PAGE_H)
        setUsedPhotoIds((prev) => new Set([...prev, photo.id]))
        saveCurrentSpread()
        return
      }
    }
  }, [saveCurrentSpread])

  // ── Layout select ──────────────────────────────────────────────────────────
  const handleLayoutSelect = useCallback((layout: Layout) => {
    const lc = fabricLeft.current
    if (!lc) return
    setSelectedLayoutId(layout.id)
    applyLayout(lc, layout, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread])

  // ── Add text ───────────────────────────────────────────────────────────────
  const handleAddText = useCallback(() => {
    const lc = fabricLeft.current
    if (!lc) return
    addTextBox(lc, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread])

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (historyIndex.current <= 0) return
    const prevIdx  = historyIndex.current - 1
    const snapshot = JSON.parse(history.current[prevIdx]) as SpreadSnapshot
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    await deserializePage(lc, snapshot.left,  PAGE_W, PAGE_H)
    await deserializePage(rc, snapshot.right, PAGE_W, PAGE_H)

    historyIndex.current = prevIdx
    setCanUndo(prevIdx > 0)
    setCanRedo(true)
  }, [])

  // ── Redo ───────────────────────────────────────────────────────────────────
  const handleRedo = useCallback(async () => {
    if (historyIndex.current >= history.current.length - 1) return
    const nextIdx  = historyIndex.current + 1
    const snapshot = JSON.parse(history.current[nextIdx]) as SpreadSnapshot
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    await deserializePage(lc, snapshot.left,  PAGE_W, PAGE_H)
    await deserializePage(rc, snapshot.right, PAGE_W, PAGE_H)

    historyIndex.current = nextIdx
    setCanUndo(true)
    setCanRedo(nextIdx < history.current.length - 1)
  }, [])

  // ── Spread select: save current, load new ─────────────────────────────────
  const handleSpreadSelect = useCallback(async (newSpread: number) => {
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    // Flush save immediately (bypass debounce)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const currentData: SpreadSnapshot = {
      left:  serializePage(lc, PAGE_W, PAGE_H),
      right: serializePage(rc, PAGE_W, PAGE_H),
    }
    localStorage.setItem(`zeika-spread-${currentSpreadRef.current}`, JSON.stringify(currentData))

    // Load new spread from localStorage or clear
    const saved = localStorage.getItem(`zeika-spread-${newSpread}`)
    if (saved) {
      const data = JSON.parse(saved) as SpreadSnapshot
      await deserializePage(lc, data.left,  PAGE_W, PAGE_H)
      await deserializePage(rc, data.right, PAGE_W, PAGE_H)
    } else {
      lc.remove(...lc.getObjects())
      rc.remove(...rc.getObjects())
      lc.renderAll()
      rc.renderAll()
    }

    currentSpreadRef.current = newSpread
    setCurrentSpread(newSpread)

    // Reset history for new spread
    history.current      = []
    historyIndex.current = -1
    setCanUndo(false)
    setCanRedo(false)
    pushHistory()
  }, [pushHistory])

  // ── Add spread ─────────────────────────────────────────────────────────────
  const handleAddSpread = useCallback(() => {
    setTotalContentSpreads((n) => n + 1)
  }, [])

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const handleZoomChange = useCallback((z: number) => {
    setZoom(z)
  }, [])

  // ── Bleed ──────────────────────────────────────────────────────────────────
  const handleToggleBleed = useCallback(() => {
    setShowBleed((v) => !v)
  }, [])

  // ── Object selected (future: show properties) ─────────────────────────────
  const handleObjectSelected = useCallback((_obj: fabric.FabricObject | null) => {
    // futuro: mostrar propiedades en toolbar
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="editor-root">
      <Topbar />

      <div className="editor-body">
        <PhotoPanel
          photos={photos}
          usedPhotoIds={usedPhotoIds}
          onUpload={handlePhotoUpload}
          onPhotoClick={handlePhotoClick}
        />

        <div className="editor-center">
          <Toolbar
            canUndo={canUndo}
            canRedo={canRedo}
            showBleed={showBleed}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onToggleBleed={handleToggleBleed}
            onAddText={handleAddText}
          />

          <Canvas
            zoom={zoom}
            showBleed={showBleed}
            currentSpread={currentSpread}
            totalSpreads={totalSpreads}
            onObjectSelected={handleObjectSelected}
            onCanvasReady={handleCanvasReady}
            onSpreadChange={handleSpreadSelect}
            onZoomChange={handleZoomChange}
          />

          <PageStrip
            currentSpread={currentSpread}
            totalContentSpreads={totalContentSpreads}
            onSpreadSelect={handleSpreadSelect}
            onAddSpread={handleAddSpread}
          />
        </div>

        <LayoutPanel
          selectedPhotoCount={selectedPhotoCount}
          selectedLayoutId={selectedLayoutId}
          onPhotoCountChange={setSelectedPhotoCount}
          onLayoutSelect={handleLayoutSelect}
        />
      </div>
    </div>
  )
}
