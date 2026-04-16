'use client'

import { useState, useEffect, useRef } from 'react'
import './Topbar.css'
import Image from 'next/image'
import { Info, Share2, ArrowDownToLine, Eye } from 'lucide-react'
import { useLang } from '../../context/LanguageContext'

interface TopbarProps {
  onPreview?: () => void
  onExportJpg: () => void
  onExportPdf: () => void
  isExporting: boolean
}

export default function Topbar({ onPreview, onExportJpg, onExportPdf, isExporting }: TopbarProps) {
  const { lang, t, toggleLang } = useLang()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  return (
    <div className="topbar">
      <Image
        src="/LogoZeika.png"
        alt="Zeika"
        width={44}
        height={44}
      />

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        <button className="topbar-action-btn">
          <Info size={18} strokeWidth={1.5} />
          <span>{t.description}</span>
        </button>
        <button className="topbar-action-btn">
          <Share2 size={18} strokeWidth={1.5} />
          <span>{t.share}</span>
        </button>

        <div className="topbar-export-wrapper" ref={wrapperRef}>
          <button
            className="topbar-action-btn"
            onClick={() => setDropdownOpen((v) => !v)}
            disabled={isExporting}
          >
            <ArrowDownToLine size={18} strokeWidth={1.5} />
            <span>{isExporting ? t.exporting : t.save}</span>
          </button>

          {dropdownOpen && (
            <div className="topbar-export-dropdown">
              <button
                className="topbar-export-option"
                onClick={() => { setDropdownOpen(false); onExportJpg() }}
              >
                {t.exportJpg}
              </button>
              <button
                className="topbar-export-option"
                onClick={() => { setDropdownOpen(false); onExportPdf() }}
              >
                {t.exportPdf}
              </button>
            </div>
          )}
        </div>

        <button className="topbar-action-btn" onClick={onPreview}>
          <Eye size={18} strokeWidth={1.5} />
          <span>{t.preview}</span>
        </button>
      </div>

      <button className="topbar-lang-toggle" onClick={toggleLang} aria-label="Toggle language">
        {lang.toUpperCase()}
      </button>

      <button className="topbar-btn-primary">{t.reviewAndBuy}</button>
    </div>
  )
}
