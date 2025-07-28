import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PersonaType = 'newbie' | 'individual' | 'team' | 'enterprise' | 'researcher'
export type VerbosityLevel = 'minimal' | 'normal' | 'detailed'
export type AutomationLevel = 'manual' | 'semi' | 'full'

interface UserPreferences {
  verbosity: VerbosityLevel
  guidance: boolean
  automation: AutomationLevel
  theme: 'light' | 'dark' | 'system'
}

interface UserState {
  persona: PersonaType
  preferences: UserPreferences
  isConfigured: boolean
  setPersona: (persona: PersonaType) => void
  setPreferences: (preferences: Partial<UserPreferences>) => void
  setConfigured: (configured: boolean) => void
  reset: () => void
}

const defaultPreferences: UserPreferences = {
  verbosity: 'normal',
  guidance: true,
  automation: 'semi',
  theme: 'system',
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      persona: 'individual',
      preferences: defaultPreferences,
      isConfigured: false,
      setPersona: (persona) => set({ persona }),
      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),
      setConfigured: (configured) => set({ isConfigured: configured }),
      reset: () =>
        set({
          persona: 'individual',
          preferences: defaultPreferences,
          isConfigured: false,
        }),
    }),
    {
      name: 'user-preferences',
    }
  )
)