import './Topbar.css'

export default function Topbar() {
  return (
    <div className="topbar">
      <span className="topbar-logo">Zeika's Builder</span>

      <div className="topbar-spacer" />

      <button className="topbar-btn">Guardar</button>
      <button className="topbar-btn">Previsualizar</button>
      <button className="topbar-btn topbar-btn-primary">Revisar y comprar</button>
    </div>
  )
}