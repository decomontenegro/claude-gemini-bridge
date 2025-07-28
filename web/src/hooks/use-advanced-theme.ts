import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export type ThemeVariant = 'dark' | 'light' | 'midnight' | 'aurora' | 'synthwave'

interface ThemeConfig {
  name: string
  class: string
  colors: {
    primary: string
    secondary: string
    background: string
    foreground: string
    accent: string
  }
}

const themeConfigs: Record<ThemeVariant, ThemeConfig> = {
  dark: {
    name: 'Dark',
    class: 'dark',
    colors: {
      primary: 'hsl(280, 100%, 65%)',
      secondary: 'hsl(200, 100%, 50%)',
      background: 'hsl(220, 20%, 7%)',
      foreground: 'hsl(0, 0%, 98%)',
      accent: 'hsl(200, 100%, 50%)',
    },
  },
  light: {
    name: 'Light',
    class: 'light',
    colors: {
      primary: 'hsl(280, 100%, 65%)',
      secondary: 'hsl(200, 100%, 50%)',
      background: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(222.2, 84%, 4.9%)',
      accent: 'hsl(200, 100%, 50%)',
    },
  },
  midnight: {
    name: 'Midnight',
    class: 'midnight',
    colors: {
      primary: 'hsl(280, 100%, 70%)',
      secondary: 'hsl(200, 100%, 60%)',
      background: 'hsl(220, 40%, 3%)',
      foreground: 'hsl(0, 0%, 95%)',
      accent: 'hsl(260, 100%, 70%)',
    },
  },
  aurora: {
    name: 'Aurora',
    class: 'aurora',
    colors: {
      primary: 'hsl(160, 100%, 50%)',
      secondary: 'hsl(320, 100%, 50%)',
      background: 'hsl(220, 30%, 8%)',
      foreground: 'hsl(0, 0%, 98%)',
      accent: 'hsl(40, 100%, 50%)',
    },
  },
  synthwave: {
    name: 'Synthwave',
    class: 'synthwave',
    colors: {
      primary: 'hsl(320, 100%, 60%)',
      secondary: 'hsl(180, 100%, 50%)',
      background: 'hsl(260, 40%, 10%)',
      foreground: 'hsl(0, 0%, 98%)',
      accent: 'hsl(40, 100%, 60%)',
    },
  },
}

export function useAdvancedTheme() {
  const { theme, setTheme } = useTheme()
  const [currentTheme, setCurrentTheme] = useState<ThemeVariant>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && theme) {
      setCurrentTheme(theme as ThemeVariant)
      applyTheme(theme as ThemeVariant)
    }
  }, [theme, mounted])

  const applyTheme = (themeVariant: ThemeVariant) => {
    const config = themeConfigs[themeVariant]
    const root = document.documentElement

    // Apply CSS variables
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })

    // Apply theme class
    Object.values(themeConfigs).forEach((t) => {
      root.classList.remove(t.class)
    })
    root.classList.add(config.class)
  }

  const changeTheme = (newTheme: ThemeVariant) => {
    setTheme(newTheme)
  }

  const cycleTheme = () => {
    const themes = Object.keys(themeConfigs) as ThemeVariant[]
    const currentIndex = themes.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    changeTheme(themes[nextIndex])
  }

  const getThemeConfig = () => themeConfigs[currentTheme]

  const isCurrentTheme = (themeToCheck: ThemeVariant) => currentTheme === themeToCheck

  return {
    currentTheme,
    themes: themeConfigs,
    changeTheme,
    cycleTheme,
    getThemeConfig,
    isCurrentTheme,
    mounted,
  }
}