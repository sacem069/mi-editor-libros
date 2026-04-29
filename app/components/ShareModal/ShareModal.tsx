'use client'

import { useState, useEffect, useRef } from 'react'
import { Copy, Check, X } from 'lucide-react'
import './ShareModal.css'

interface Props {
  url: string
  onClose: () => void
}

export default function ShareModal({ url, onClose }: Props) {
  const [copied, setCopied]   = useState(false)
  const overlayRef            = useRef<HTMLDivElement>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="share-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="share-modal">
        <div className="share-header">
          <span className="share-title">Compartir previsualización</span>
          <button className="share-close" onClick={onClose} aria-label="Cerrar">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="share-body">
          <label className="share-label">Link de previsualización</label>
          <div className="share-input-row">
            <input
              className="share-url-input"
              type="text"
              value={url}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <button
              className={`share-copy-btn${copied ? ' share-copy-btn--copied' : ''}`}
              onClick={handleCopy}
              aria-label={copied ? '¡Copiado!' : 'Copiar'}
            >
              {copied ? (
                <>
                  <Check size={14} strokeWidth={2} />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <Copy size={16} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
