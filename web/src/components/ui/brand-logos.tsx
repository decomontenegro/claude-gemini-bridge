'use client'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
}

export function ClaudeLogo({ className, size = 'md' }: LogoProps) {
  // Logo oficial da Anthropic Claude
  return (
    <svg
      viewBox="0 0 95 65"
      fill="none"
      className={cn(sizeMap[size], className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.9991 33.1833L33.1971 0L58.6787 31.9833L46.5811 50.8833L33.1971 29.7333L23.7975 44.15L36.6635 64.3667H16.4655L0.582031 37.3L14.4991 17.9167L22.8975 31.4667L14.9991 33.1833Z"
        className="fill-claude-500"
      />
      <path
        d="M58.1155 64.3667L47.0163 46.2L59.3003 27.8667L65.0171 37.2833L58.9163 46.8167L66.2507 59.5167L77.7835 40.8833L69.6671 26.9833L77.5659 14.0167L94.4163 40.3L78.5995 64.3667H58.1155Z"
        className="fill-claude-500"
      />
    </svg>
  )
}

export function GeminiLogo({ className, size = 'md' }: LogoProps) {
  // Logo oficial do Google Gemini
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      className={cn(sizeMap[size], className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gemini-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1BA1E3" />
          <stop offset="100%" stopColor="#5489EF" />
        </linearGradient>
        <linearGradient id="gemini-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5489EF" />
          <stop offset="100%" stopColor="#1BA1E3" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="50" r="50" fill="url(#gemini-gradient-1)" />
      <circle cx="100" cy="150" r="50" fill="url(#gemini-gradient-2)" />
      <path
        d="M100 50 Q150 100 100 150 Q50 100 100 50"
        fill="white"
        opacity="0.9"
      />
    </svg>
  )
}

// Logo Claude com texto para contextos maiores
export function ClaudeLogoWithText({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ClaudeLogo size="md" />
      <span className="text-lg font-semibold text-claude-500">Claude</span>
    </div>
  )
}

// Logo Gemini com texto para contextos maiores
export function GeminiLogoWithText({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <GeminiLogo size="md" />
      <span className="text-lg font-semibold text-gemini-500">Gemini</span>
    </div>
  )
}