import { useCallback, useRef } from 'react'

// Sound URLs - using placeholder paths
const sounds = {
  click: '/sounds/click.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  notification: '/sounds/notification.mp3',
  hover: '/sounds/hover.mp3',
}

export type SoundType = keyof typeof sounds

export function useSound() {
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({})

  const preloadSound = useCallback((type: SoundType) => {
    if (!audioRef.current[type] && typeof window !== 'undefined') {
      audioRef.current[type] = new Audio(sounds[type])
      audioRef.current[type].volume = 0.3
    }
  }, [])

  const playSound = useCallback((type: SoundType, volume = 0.3) => {
    if (typeof window === 'undefined') return

    try {
      if (!audioRef.current[type]) {
        preloadSound(type)
      }

      const audio = audioRef.current[type]
      if (audio) {
        audio.volume = volume
        audio.currentTime = 0
        audio.play().catch(() => {
          // Ignore errors (e.g., user hasn't interacted with page yet)
        })
      }
    } catch (error) {
      console.debug('Sound playback failed:', error)
    }
  }, [preloadSound])

  const playClick = useCallback(() => playSound('click', 0.2), [playSound])
  const playSuccess = useCallback(() => playSound('success', 0.4), [playSound])
  const playError = useCallback(() => playSound('error', 0.4), [playSound])
  const playNotification = useCallback(() => playSound('notification', 0.3), [playSound])
  const playHover = useCallback(() => playSound('hover', 0.1), [playSound])

  return {
    playSound,
    playClick,
    playSuccess,
    playError,
    playNotification,
    playHover,
  }
}