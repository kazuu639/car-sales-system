'use client'
import { useEffect, useRef } from 'react'

export default function LoadingOverlay({ message = '処理中...' }: { message?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const spdRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const GEARS = [
      { cx: 44, cy: 56, ri: 20, ro: 27, teeth: 12, color: '#e8622a', dir: 1,  phaseOff: 0 },
      { cx: 84, cy: 56, ri: 16, ro: 21, teeth: 10, color: '#2196f3', dir: -1, phaseOff: Math.PI / 10 },
      { cx: 64, cy: 26, ri: 14, ro: 19, teeth: 10, color: '#4caf50', dir: -1, phaseOff: Math.PI / 10 },
    ]

    const drawGear = (cx: number, cy: number, ri: number, ro: number, teeth: number, color: string, angle: number) => {
      ctx.beginPath()
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i * Math.PI) / teeth + angle
        const r = i % 2 === 0 ? ro : ri
        if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
        else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      }
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, ri * 0.45, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fill()
    }

    const draw = (timestamp: number) => {
      const elapsed = timestamp - (lastTimeRef.current || timestamp)
      lastTimeRef.current = timestamp
      spdRef.current += elapsed * 0.0004

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      GEARS.forEach(g => {
        const angle = spdRef.current * g.dir * (GEARS[0].teeth / g.teeth) + g.phaseOff
        drawGear(g.cx, g.cy, g.ri, g.ro, g.teeth, g.color, angle)
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(3px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <canvas ref={canvasRef} width={108} height={80} style={{ marginBottom: '14px' }} />
      <p style={{ fontSize: '14px', color: '#1a73e8', fontWeight: 600 }}>{message}</p>
    </div>
  )
}
