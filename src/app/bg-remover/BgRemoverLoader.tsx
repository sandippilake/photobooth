'use client'
import dynamic from 'next/dynamic'

const BgRemoverClient = dynamic(() => import('./BgRemoverClient'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(240,236,228,0.4)', fontFamily: 'sans-serif', fontSize: 14,
    }}>
      Loading…
    </div>
  ),
})

export default function BgRemoverLoader() {
  return <BgRemoverClient />
}
