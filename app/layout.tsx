import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Viaggi',
  description:
    'Applicazione per tracciare e pianificare i viaggi',
  applicationName: 'Viaggi',
  generator: 'Viaggi',

  icons: {
    icon: [
      {
        url: '/viaggi-favicon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/viaggi-icon.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/viaggi-icon.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#151821',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="it" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-background font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
