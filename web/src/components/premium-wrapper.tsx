'use client'

import { useEffect } from 'react'
import { ParticleBackground } from '@/components/ui/particle-background'

export function PremiumWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure particle background is visible
    const canvas = document.querySelector('canvas')
    if (canvas && canvas.style.opacity === '0') {
      setTimeout(() => {
        canvas.style.opacity = '0.3'
      }, 500)
    }
  }, [])

  return (
    <>
      <ParticleBackground />
      <div className="relative z-10">
        {children}
      </div>
    </>
  )
}