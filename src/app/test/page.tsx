'use client'
import { useState } from 'react'

export default function TestPage() {
  const [count, setCount] = useState(0)
  return (
    <div style={{padding: '40px'}}>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)} style={{padding: '10px 20px', fontSize: '16px'}}>
        Click me
      </button>
    </div>
  )
}
