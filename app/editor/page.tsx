'use client'

import { useState, useCallback, useRef } from 'react'
import * as fabric from 'fabric'
import Topbar from '../components/Topbar/Topbar'
import Canvas from '../components/Canvas/Canvas'
import PhotoPanel, { type Photo } from '../components/PhotoPanel/PhotoPanel'
import LayoutPanel from '../components/LayoutPanel/LayoutPanel'
import type { Layout } from '../components/LayoutPanel/LayoutPanel'
import Toolbar from '../components/Toolbar/Toolbar'
import './editor.css'

export default function EditorPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [usedPhotoIds, setUsedPhotoIds] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(0.6)
  const [showBleed, setShowBleed] = useState(false)
  const [currentSpread, setCurrentSpread] = useState(0)
  const totalSpreads = 8 // placeholder

  const [selectedPhotoCount, setSelectedPhotoCount] = useState(1)
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const leftCanvasRef  = useRef<fabric.Canvas | null>(null)
  const rightCanvasRef = useRef<fabric.Canvas | null>(null)

  // ── Subir fotos: lee como base64 ─────────────────────────────────────────

  const handleUpload = useCallback((files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const src = e.target?.result as string
        const newPhoto: Photo = {
          id: crypto.randomUUID(),
          src,
          name: file.name,
        }
        setPhotos((prev) => [...prev, newPhoto])
      }
      reader.readAsDataURL(file)
    })
  }, [])

  // ── Canvas listo ──────────────────────────────────────────────────────────

  const handleCanvasReady = useCallback(
    (left: fabric.Canvas, right: fabric.Canvas) => {
      leftCanvasRef.current  = left
      rightCanvasRef.current = right
    },
    [],
  )

  // ── Selección en canvas ───────────────────────────────────────────────────

  const handleObjectSelected = useCallback(
    (_obj: fabric.FabricObject | null) => {
      // futuro: mostrar propiedades en toolbar
    },
    [],
  )

  // ── Layout selection ──────────────────────────────────────────────────────

  const handleLayoutSelect = useCallback((layout: Layout) => {
    setSelectedLayoutId(layout.id)
    // futuro: aplicar layout al canvas
  }, [])

  // ── Undo / Redo (placeholders — se conectarán con el historial del canvas) ──

  const handleUndo = useCallback(() => {
    // futuro: leftCanvasRef.current?.undo()
  }, [])

  const handleRedo = useCallback(() => {
    // futuro: leftCanvasRef.current?.redo()
  }, [])

  // ── Add text ──────────────────────────────────────────────────────────────

  const handleAddText = useCallback(() => {
    // futuro: agregar IText al canvas activo
  }, [])

  return (
    <div className="editor-root">
      <Topbar />
      <div className="editor-body">
        <PhotoPanel
          photos={photos}
          usedPhotoIds={usedPhotoIds}
          onUpload={handleUpload}
          onPhotoClick={() => {}}
        />
        <div className="editor-center">
          <Toolbar
            canUndo={canUndo}
            canRedo={canRedo}
            showBleed={showBleed}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onToggleBleed={() => setShowBleed((v) => !v)}
            onAddText={handleAddText}
          />
          <Canvas
            zoom={zoom}
            showBleed={showBleed}
            currentSpread={currentSpread}
            totalSpreads={totalSpreads}
            onObjectSelected={handleObjectSelected}
            onCanvasReady={handleCanvasReady}
            onSpreadChange={setCurrentSpread}
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
