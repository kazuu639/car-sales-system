'use client'
import { useEffect, useRef } from 'react'

const GEARS = [
  { cx:55,  cy:88, ri:20, ro:27, teeth:12, color:'#e8622a', dir:1,  phaseOff:0 },
  { cx:104, cy:88, ri:16, ro:21, teeth:10, color:'#2196f3', dir:-1, phaseOff:Math.PI/10 },
  { cx:80,  cy:53, ri:14, ro:19, teeth:10, color:'#4caf50', dir:-1, phaseOff:Math.PI/10 },
]

// 縮小時用: 大(オレンジ)と小(緑)を縦に2つ
const GEARS_SMALL = [
  { cx:20, cy:18, ri:11, ro:15, teeth:10, color:'#e8622a', dir:1,   phaseOff:0 },
  { cx:20, cy:42, ri:8,  ro:11, teeth:8,  color:'#4caf50', dir:-1,  phaseOff:Math.PI/8 },
]

function gearPath(cx: number, cy: number, ri: number, ro: number, teeth: number, rot: number) {
  const path = new Path2D()
  const total = teeth * 4
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 + rot
    const r = (i % 4 === 1 || i % 4 === 2) ? ro : ri
    if (i === 0) path.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
    else path.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  path.closePath()
  return path
}

export default function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const runningRef = useRef(false)

  const H = collapsed ? 56 : 44
 const W = collapsed ? 40 : 175
  const S = 0.38

  function draw(elapsed: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)

    const spd = elapsed * 0.0004

    if (collapsed) {
      // 縦2つの歯車
      GEARS_SMALL.forEach(g => {
        const rot = runningRef.current ? spd * g.dir * (GEARS_SMALL[0].teeth / g.teeth) + g.phaseOff : g.phaseOff
        ctx.fillStyle = g.color
        ctx.fill(gearPath(g.cx, g.cy, g.ri, g.ro, g.teeth, rot))
        ctx.beginPath(); ctx.arc(g.cx, g.cy, g.ri * 0.55, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill()
        ctx.beginPath(); ctx.arc(g.cx, g.cy, g.ri * 0.18, 0, Math.PI * 2); ctx.fillStyle = g.color; ctx.fill()
      })
    } else {
      // 展開時: 3つ歯車 横
      const gearCX = H / 2
      const gearCY = H / 2
      ctx.save()
      ctx.translate(gearCX - 79.5 * S, gearCY - 70.5 * S)
      ctx.scale(S, S)
      GEARS.forEach(g => {
        const rot = runningRef.current ? spd * g.dir * (GEARS[0].teeth / g.teeth) + g.phaseOff : g.phaseOff
        ctx.fillStyle = g.color
        ctx.fill(gearPath(g.cx, g.cy, g.ri, g.ro, g.teeth, rot))
        ctx.beginPath(); ctx.arc(g.cx, g.cy, g.ri * 0.58, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill()
        ctx.beginPath(); ctx.arc(g.cx, g.cy, g.ri * 0.18, 0, Math.PI * 2); ctx.fillStyle = g.color; ctx.fill()
      })
      ctx.restore()

      const TX = H + 6
      const line1Y = 8 + 18
      const line2Y = line1Y + 4 + 7

      ctx.fillStyle = '#1e3a5f'
      ctx.font = '700 18px system-ui,sans-serif'
      ctx.fillText('Brain', TX, line1Y)
      const brainW = ctx.measureText('Brain').width
      ctx.fillStyle = '#2196f3'
      ctx.font = '700 18px system-ui,sans-serif'
      ctx.fillText('Base', TX + brainW + 3, line1Y)
      ctx.fillStyle = '#bbb'
      ctx.font = '500 7px system-ui,sans-serif'
      ctx.fillText('CAR SALES SYSTEM', TX, line2Y)
    }

    if (runningRef.current) {
      animRef.current = requestAnimationFrame(t => {
        if (startRef.current === null) startRef.current = t
        draw(t - startRef.current)
      })
    }
  }

  const handleMouseEnter = () => {
    runningRef.current = true
    startRef.current = null
    animRef.current = requestAnimationFrame(t => { startRef.current = t; draw(0) })
  }
  const handleMouseLeave = () => {
    runningRef.current = false
    if (animRef.current) cancelAnimationFrame(animRef.current)
    draw(0)
  }

  useEffect(() => {
    draw(0)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [collapsed])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'block', cursor: 'default' }}
    />
  )
}