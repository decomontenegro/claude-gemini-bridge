import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }
    
    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    } else {
      // Fallback for older browsers
      media.addListener(listener)
      return () => media.removeListener(listener)
    }
  }, [matches, query])

  return matches
}

// Preset queries
export const useIsMobile = () => useMediaQuery('(max-width: 768px)')
export const useIsTablet = () => useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)')
export const useIsTouchDevice = () => useMediaQuery('(hover: none) and (pointer: coarse)')
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
export const useHighContrast = () => useMediaQuery('(prefers-contrast: high)')
export const useDarkMode = () => useMediaQuery('(prefers-color-scheme: dark)')