'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import * as fabric from 'fabric'

import Topbar      from '../components/Topbar/Topbar'
import Toolbar     from '../components/Toolbar/Toolbar'
import PhotoPanel, { type Photo } from '../components/PhotoPanel/PhotoPanel'
// Canvas uses Fabric.js (browser-only). Dynamic import with ssr:false prevents
// Next.js from attempting to server-render it, eliminating all hydration errors.
const Canvas = dynamic(() => import('../components/Canvas/Canvas'), { ssr: false })
import LayoutPanel from '../components/LayoutPanel/LayoutPanel'
import PageStrip   from '../components/PageStrip/PageStrip'
import type { Layout } from '../components/LayoutPanel/LayoutPanel'

import { BOOK_SIZE }                                      from '../config/bookSize'
import { applyLayout, addTextBox, serializePage,
         deserializePage, dropPhotoOnFrame }              from '../components/Canvas/fabricHelpers'
import type { PageData }                                   from '../components/Canvas/fabricHelpers'
import { LAYOUTS }                                         from '../config/layouts'

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
  const [totalContentSpreads, setTotalContentSpreads] = useState(13)
  const totalSpreads = totalContentSpreads + 3

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

  // ── Active page (last clicked page in Canvas) ──────────────────────────────
  const activePageRef = useRef<'left' | 'right'>('left')

  // ── In-memory spread persistence (survives navigation within the session) ──
  // Keyed by spread index. Saved immediately on every canvas change — no debounce.
  const spreadsData      = useRef<Record<number, SpreadSnapshot>>({})
  const currentSpreadRef = useRef(0)
  // Guard: while deserializing (restoring a spread), suppress auto-saves so that
  // Fabric object:added/removed events fired mid-restore don't overwrite the
  // target spread's saved data with partial canvas state.
  const isDeserializing  = useRef(false)

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getActiveFabric   = () => activePageRef.current === 'right' ? fabricRight.current : fabricLeft.current
  const getInactiveFabric = () => activePageRef.current === 'right' ? fabricLeft.current  : fabricRight.current

  // ── Push a snapshot to undo history ───────────────────────────────────────
  const pushHistory = useCallback(() => {
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    const snapshot = JSON.stringify({
      left:  serializePage(lc, PAGE_W, PAGE_H),
      right: serializePage(rc, PAGE_W, PAGE_H),
    })

    history.current      = [...history.current.slice(0, historyIndex.current + 1), snapshot]
    historyIndex.current = history.current.length - 1

    setCanUndo(historyIndex.current > 0)
    setCanRedo(false)
  }, [])

  // ── Save current spread immediately (no debounce) ─────────────────────────
  // Called on every canvas mutation so navigation always has fresh data.
  // Suppressed while deserializing to prevent mid-restore events from writing
  // partial canvas state into spreadsData.
  const saveCurrentSpread = useCallback(() => {
    if (isDeserializing.current) return
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    spreadsData.current[currentSpreadRef.current] = {
      left:  serializePage(lc, PAGE_W, PAGE_H),
      right: serializePage(rc, PAGE_W, PAGE_H),
    }
    pushHistory()
  }, [pushHistory])

  // ── Canvas ready: restore saved state, then wire change listeners ───────────
  const handleCanvasReady = useCallback(
    async (left: fabric.Canvas, right: fabric.Canvas) => {
      fabricLeft.current  = left
      fabricRight.current = right

      // Restore the current spread BEFORE registering change listeners.
      // If we registered listeners first, every object:added event fired by
      // deserializePage would call saveCurrentSpread and overwrite saved data
      // with the partially-loaded canvas state.
      const saved = spreadsData.current[currentSpreadRef.current]
      if (saved) {
        await deserializePage(left,  saved.left,  PAGE_W, PAGE_H)
        await deserializePage(right, saved.right, PAGE_W, PAGE_H)
      }

      const onChange = () => saveCurrentSpread()
      for (const fc of [left, right]) {
        fc.on('object:modified', onChange)
        fc.on('object:added',    onChange)
        fc.on('object:removed',  onChange)
      }

      pushHistory()
    },
    [saveCurrentSpread, pushHistory],
  )

  // ── Active page change (fired by Canvas on mousedown) ─────────────────────
  const handleActivePageChange = useCallback((page: 'left' | 'right') => {
    activePageRef.current = page
  }, [])

  // ── Photo upload ───────────────────────────────────────────────────────────
  const handlePhotoUpload = useCallback((uploaded: Photo[]) => {
    setPhotos((prev) => [...prev, ...uploaded])
  }, [])

  // ── Photo click: place in first empty frame, active page first ─────────────
  const handlePhotoClick = useCallback(async (photo: Photo) => {
    for (const fc of [getActiveFabric(), getInactiveFabric()]) {
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
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Photo dropped onto canvas frame (from drag) ────────────────────────────
  const handlePhotoDrop = useCallback((photoId: string) => {
    setUsedPhotoIds((prev) => new Set([...prev, photoId]))
    saveCurrentSpread()
  }, [saveCurrentSpread])

  // ── Layout select (panel click) → applies to active page ──────────────────
  const handleLayoutSelect = useCallback((layout: Layout) => {
    const fc = getActiveFabric()
    if (!fc) return
    setSelectedLayoutId(layout.id)
    applyLayout(fc, layout, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Layout dropped onto a specific page in Canvas ─────────────────────────
  const handleLayoutDropOnPage = useCallback((layoutId: string, page: 'left' | 'right') => {
    const layout = LAYOUTS.find((l) => l.id === layoutId)
    if (!layout) return
    const fc = page === 'right' ? fabricRight.current : fabricLeft.current
    if (!fc) return
    setSelectedLayoutId(layoutId)
    applyLayout(fc, layout, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread])

  // ── Add text → active page ─────────────────────────────────────────────────
  const handleAddText = useCallback(() => {
    const fc = getActiveFabric()
    if (!fc) return
    addTextBox(fc, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (historyIndex.current <= 0) return
    const prevIdx  = historyIndex.current - 1
    const snapshot = JSON.parse(history.current[prevIdx]) as SpreadSnapshot
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    isDeserializing.current = true
    try {
      await deserializePage(lc, snapshot.left,  PAGE_W, PAGE_H)
      await deserializePage(rc, snapshot.right, PAGE_W, PAGE_H)
    } finally {
      isDeserializing.current = false
    }

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

    isDeserializing.current = true
    try {
      await deserializePage(lc, snapshot.left,  PAGE_W, PAGE_H)
      await deserializePage(rc, snapshot.right, PAGE_W, PAGE_H)
    } finally {
      isDeserializing.current = false
    }

    historyIndex.current = nextIdx
    setCanUndo(true)
    setCanRedo(nextIdx < history.current.length - 1)
  }, [])

  // ── Spread select: save current → load new ────────────────────────────────
  const handleSpreadSelect = useCallback(async (newSpread: number) => {
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    // 1. Save current spread BEFORE changing the index.
    //    saveCurrentSpread reads currentSpreadRef, so it must still point to
    //    the old spread here.
    spreadsData.current[currentSpreadRef.current] = {
      left:  serializePage(lc, PAGE_W, PAGE_H),
      right: serializePage(rc, PAGE_W, PAGE_H),
    }

    // 2. Advance the index BEFORE deserializing the new spread.
    //    deserializePage triggers Fabric object:added/removed events which call
    //    saveCurrentSpread(). If currentSpreadRef still points to the old spread
    //    at that point, those saves corrupt the old spread's data with
    //    in-progress content from the new one.
    currentSpreadRef.current = newSpread
    setCurrentSpread(newSpread)

    // 3. Restore the target spread, or clear if it has never been saved.
    //    isDeserializing suppresses saveCurrentSpread during restore so Fabric
    //    object:added/removed events don't overwrite spreadsData mid-load.
    const saved = spreadsData.current[newSpread]
    isDeserializing.current = true
    try {
      if (saved) {
        await deserializePage(lc, saved.left,  PAGE_W, PAGE_H)
        await deserializePage(rc, saved.right, PAGE_W, PAGE_H)
      } else {
        lc.remove(...lc.getObjects())
        rc.remove(...rc.getObjects())
        lc.renderAll()
        rc.renderAll()
      }
    } finally {
      isDeserializing.current = false
    }

    // Reset undo history for this spread
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

  // ── Delete spread ──────────────────────────────────────────────────────────
  const handleDeleteSpread = useCallback(async (spreadIndex: number) => {
    if (totalContentSpreads <= 13) return

    // Shift in-memory entries: everything after spreadIndex moves down by 1
    const lastIndex = totalContentSpreads + 2
    for (let j = spreadIndex; j <= lastIndex; j++) {
      const next = spreadsData.current[j + 1]
      if (next) spreadsData.current[j] = next
      else      delete spreadsData.current[j]
    }

    const newTotal  = totalContentSpreads - 1
    const maxSpread = newTotal + 2

    let target = currentSpreadRef.current
    if (target > maxSpread)                       target = maxSpread
    else if (target >= spreadIndex && target > 0) target = target - 1

    setTotalContentSpreads(newTotal)
    await handleSpreadSelect(target)
  }, [totalContentSpreads, handleSpreadSelect])

  // ── Layout drop on PageStrip spread (always applies to left page) ─────────
  const handleLayoutDrop = useCallback(async (spreadIndex: number, layoutId: string) => {
    await handleSpreadSelect(spreadIndex)
    const layout = LAYOUTS.find((l) => l.id === layoutId)
    const lc = fabricLeft.current
    if (!layout || !lc) return
    setSelectedLayoutId(layoutId)
    applyLayout(lc, layout, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [handleSpreadSelect, saveCurrentSpread])

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const handleZoomChange = useCallback((z: number) => setZoom(z), [])

  // ── Bleed ──────────────────────────────────────────────────────────────────
  const handleToggleBleed = useCallback(() => setShowBleed((v) => !v), [])

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
            onActivePageChange={handleActivePageChange}
            onLayoutDropOnPage={handleLayoutDropOnPage}
            onPhotoDrop={handlePhotoDrop}
          />

          <PageStrip
            currentSpread={currentSpread}
            totalContentSpreads={totalContentSpreads}
            onSpreadSelect={handleSpreadSelect}
            onAddSpread={handleAddSpread}
            onDeleteSpread={handleDeleteSpread}
            onLayoutDrop={handleLayoutDrop}
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
