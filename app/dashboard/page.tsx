'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import './dashboard.css'

type Status = 'Nuevo' | 'En proceso' | 'Finalizados'
type Designer = 'Maika' | 'Vicky' | 'Jose'
type FilterTab = 'TODOS' | 'NUEVOS' | 'EN PROCESO' | 'FINALIZADOS'

interface Order {
  id: string
  pedido: string
  cliente: string
  fecha: string
  tamano: string
  disenadora: Designer
  estado: Status
}

const MOCK_ORDERS: Order[] = [
  { id: '1', pedido: 'ZK-2026-0142', cliente: 'Yanina Barrondo', fecha: '03/04/26', tamano: 'Vertical',  disenadora: 'Maika', estado: 'Nuevo'       },
  { id: '2', pedido: 'ZK-2026-0139', cliente: 'Rocio Ferreyra',  fecha: '01/04/26', tamano: 'Cuadrado', disenadora: 'Vicky', estado: 'En proceso'  },
  { id: '3', pedido: 'ZK-2026-0135', cliente: 'Lucas Pereyra',   fecha: '28/03/26', tamano: 'Mediano',  disenadora: 'Jose',  estado: 'Finalizados' },
  { id: '4', pedido: 'ZK-2026-0131', cliente: 'Sofia Romero',    fecha: '25/03/26', tamano: 'Vertical', disenadora: 'Maika', estado: 'En proceso'  },
  { id: '5', pedido: 'ZK-2026-0128', cliente: 'Martin Gomez',    fecha: '22/03/26', tamano: 'Cuadrado', disenadora: 'Jose',  estado: 'Nuevo'       },
]

const TABS: FilterTab[] = ['TODOS', 'NUEVOS', 'EN PROCESO', 'FINALIZADOS']

const TAB_STATUS_MAP: Record<string, Status | null> = {
  TODOS:        null,
  NUEVOS:       'Nuevo',
  'EN PROCESO': 'En proceso',
  FINALIZADOS:  'Finalizados',
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('TODOS')

  const filtered = MOCK_ORDERS.filter((o) => {
    const statusFilter = TAB_STATUS_MAP[activeTab]
    return statusFilter === null || o.estado === statusFilter
  })

  return (
    <div className="dash-root">
      {/* ── Topbar ─────────────────────────────── */}
      <header className="dash-topbar">
        <Image src="/LogoZeika.png" alt="Zeika" width={36} height={36} />
        <span className="dash-topbar-spacer" />
        <span className="dash-topbar-username">MAIKA</span>
        <div className="dash-avatar">M</div>
      </header>

      {/* ── Sidebar ────────────────────────────── */}
      <aside className="dash-sidebar">
        <nav className="dash-nav-section">
          <p className="dash-nav-label">Libros</p>
          <ul>
            <li><Link href="/dashboard" className="dash-nav-link dash-nav-link--active">TODOS</Link></li>
            <li><Link href="/dashboard" className="dash-nav-link dash-nav-link--maika">MAIKA</Link></li>
            <li><Link href="/dashboard" className="dash-nav-link dash-nav-link--vicky">VICKY</Link></li>
            <li><Link href="/dashboard" className="dash-nav-link dash-nav-link--jose">JOSE</Link></li>
          </ul>
        </nav>

        <nav className="dash-nav-section">
          <p className="dash-nav-label">Otros</p>
          <ul>
            <li><Link href="/dashboard" className="dash-nav-link">Sheets</Link></li>
            <li><Link href="/dashboard" className="dash-nav-link">Catálogo</Link></li>
          </ul>
        </nav>
      </aside>

      {/* ── Right sidebar ──────────────────────── */}
      <aside className="dash-sidebar-right">
        <Link href="/nuevo" className="dash-btn-nuevo">NUEVO +</Link>
      </aside>

      {/* ── Main ───────────────────────────────── */}
      <main className="dash-main">
        <p className="dash-greeting">Hola Maika! Hoy va a ser un gran dia</p>

        <div className="dash-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`dash-tab dash-tab--${tab.toLowerCase().replace(' ', '-')} ${activeTab === tab ? 'dash-tab--active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr className="dash-table-header-row">
                <th>PEDIDO</th>
                <th>CLIENTE</th>
                <th>FECHA</th>
                <th>TAMAÑO</th>
                <th>DISEÑADORA</th>
                <th>ESTADO</th>
                <th>ABRIR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="dash-table-row">
                  <td className="dash-cell-pedido">{order.pedido}</td>
                  <td>{order.cliente}</td>
                  <td>{order.fecha}</td>
                  <td>{order.tamano}</td>
                  <td>
                    <span className={`dash-badge dash-badge--${order.disenadora.toLowerCase()}`}>
                      {order.disenadora}
                    </span>
                  </td>
                  <td>
                    <span className={`dash-badge dash-badge--${order.estado === 'En proceso' ? 'en-proceso' : order.estado.toLowerCase()}`}>
                      {order.estado}
                    </span>
                  </td>
                  <td>
                    <Link href="/editor" className="dash-link-abrir">ABRIR</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
