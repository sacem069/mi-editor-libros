import Topbar from './components/Topbar'

export default function Home() {
  return (
    <div>
      <Topbar />
      <div style={{ textAlign: 'center', marginTop: '120px' }}>
        <h1 style={{
          fontFamily: 'amandine, serif',
          fontSize: '64px',
          fontWeight: 400,
          marginBottom: '20px'
        }}>
          Zeika Memories
        </h1>
        <p style={{
          fontFamily: 'OverusedGrotesk, sans-serif',
          fontSize: '18px',
          fontWeight: 400,
          color: '#528ED6'
        }}>
          Contá tu historia
        </p>
      </div>
    </div>
  )
}
