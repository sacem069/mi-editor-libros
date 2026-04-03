'use client'

import { useRef, useCallback } from 'react'
import { CirclePlus, ListFilter, Check } from 'lucide-react'
import './PhotoPanel.css'

export type Photo = {
  id: string
  src: string
  name: string
}

interface PhotoPanelProps {
  photos: Photo[]
  usedPhotoIds: Set<string>
  onUpload: (files: File[]) => void
  onPhotoClick: (photo: Photo) => void
}

export default function PhotoPanel({
  photos,
  usedPhotoIds,
  onUpload,
  onPhotoClick,
}: PhotoPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File upload ───────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length === 0) return
      onUpload(files)
      // Reset so the same files can be re-selected if needed
      e.target.value = ''
    },
    [onUpload],
  )

  const openFilePicker = () => fileInputRef.current?.click()

  // ── Drag start: pone el src de la foto en el dataTransfer ─────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, photo: Photo) => {
      e.dataTransfer.setData('text/plain', photo.src)
      e.dataTransfer.effectAllowed = 'copy'
    },
    [],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className="photo-panel">
      {/* ── Acciones superiores ── */}
      <div className="photo-panel-actions">
        <button className="photo-action-btn" onClick={openFilePicker}>
          <CirclePlus size={24} strokeWidth={1.5} />
          <span>Subir fotos</span>
        </button>

        <button className="photo-action-btn">
          <ListFilter size={24} strokeWidth={1.5} />
          <span>Ordenar / Filtrar</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="photo-file-input"
        onChange={handleFileChange}
      />

      {/* ── Auto-crear ── */}
      <div className="photo-panel-autocreate-row">
        <button className="photo-autocreate-btn">Auto-crear</button>
      </div>

      {/* ── Contador ── */}
      <div className="photo-panel-counter">
        {photos.length} fotos
      </div>

      {/* ── Separator bar ── */}
      <div className="photo-panel-bar" />

      {/* ── Grid de fotos ── */}
      <div className="photo-grid">
        {photos.map((photo) => {
          const isUsed = usedPhotoIds.has(photo.id)
          return (
            <div
              key={photo.id}
              className="photo-thumb"
              draggable
              onDragStart={(e) => handleDragStart(e, photo)}
              onClick={() => onPhotoClick(photo)}
              title={photo.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.name} className="photo-thumb-img" />

              {isUsed && (
                <div className="photo-thumb-used" aria-label="Foto usada">
                  <Check size={10} strokeWidth={3} color="#fff" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
