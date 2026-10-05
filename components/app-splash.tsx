'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const SPLASH_SESSION_KEY = 'viaggi-splash-shown'

export function AppSplash() {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    // Mostra lo splash una sola volta per sessione del browser.
    // In questo modo i ritorni alla home da pagine interne (es. Atlante)
    // non fanno ripartire l'immagine di apertura.
    if (window.sessionStorage.getItem(SPLASH_SESSION_KEY) === '1') {
      return
    }

    window.sessionStorage.setItem(SPLASH_SESSION_KEY, '1')
    setVisible(true)

    const closeTimer = window.setTimeout(() => {
      setClosing(true)
    }, 1100)

    const removeTimer = window.setTimeout(() => {
      setVisible(false)
    }, 1450)

    return () => {
      window.clearTimeout(closeTimer)
      window.clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-300 ${
        closing ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative h-full w-full p-3 sm:p-6 lg:p-10">
        <Image
          src="/viaggi-splash.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-contain"
        />
      </div>
    </div>
  )
}
