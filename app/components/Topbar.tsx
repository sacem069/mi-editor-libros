import './Topbar.css'
import Image from 'next/image'

export default function Topbar() {
  return (
    <div className="topbar">
      <Image
        src="/LogoZeika.png"
        alt="Zeika"
        width={36}
        height={36}
      />

      <div className="topbar-spacer" />

      <button className="topbar-btn">Guardar</button>
      <button className="topbar-btn">Previsualizar</button>
      <button className="topbar-btn topbar-btn-primary">Revisar y comprar</button>
    </div>
  )
}