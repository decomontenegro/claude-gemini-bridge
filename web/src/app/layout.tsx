import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'
import { CommandPalette } from '@/components/ui/command-palette'
import { AccessibilityIndicator, SkipToContent } from '@/components/ui/accessibility-indicator'
import { ErrorBoundary } from '@/components/error-boundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Claude-Gemini Bridge',
  description: 'Intelligent orchestration between Claude and Gemini AI assistants',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <SkipToContent />
            {children}
            <Toaster />
            <CommandPalette />
            <AccessibilityIndicator />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}