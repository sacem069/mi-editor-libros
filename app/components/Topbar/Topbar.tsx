import './Topbar.css'
import Image from 'next/image'
import { Info, Share2, ArrowDownToLine, Eye } from 'lucide-react'

interface TopbarProps {
  onPreview?: () => void
}

export default function Topbar({ onPreview }: TopbarProps) {
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
          <span>Descripción</span>
        </button>
        <button className="topbar-action-btn">
          <Share2 size={18} strokeWidth={1.5} />
          <span>Compartir</span>
        </button>
        <button className="topbar-action-btn">
          <ArrowDownToLine size={18} strokeWidth={1.5} />
          <span>Guardar</span>
        </button>
        <button className="topbar-action-btn" onClick={onPreview}>
          <Eye size={18} strokeWidth={1.5} />
          <span>Previsualizar</span>
        </button>
      </div>

      <button className="topbar-btn-primary">Revisar y comprar</button>
    </div>
  )
}
