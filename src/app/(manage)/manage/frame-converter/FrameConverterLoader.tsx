'use client'
import dynamic from 'next/dynamic'

const FrameConverter = dynamic(() => import('./FrameConverterClient'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh', background: '#0d0f14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(232,230,224,0.4)', fontFamily: 'sans-serif', fontSize: 14,
    }}>
      Loading converter...
    </div>
  ),
})

export default function FrameConverterLoader() {
  return <FrameConverter />
}
