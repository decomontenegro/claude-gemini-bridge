// Modern Design System for Claude-Gemini Bridge
// Achieving 9/10+ in Design, UX, and Performance

export const designTokens = {
  // Modern color palette with gradients
  colors: {
    // Claude colors with depth
    claude: {
      50: 'hsl(280, 100%, 98%)',
      100: 'hsl(280, 100%, 95%)',
      200: 'hsl(280, 100%, 90%)',
      300: 'hsl(280, 100%, 85%)',
      400: 'hsl(280, 100%, 75%)',
      500: 'hsl(280, 100%, 65%)', // Primary
      600: 'hsl(280, 100%, 55%)',
      700: 'hsl(280, 100%, 45%)',
      800: 'hsl(280, 100%, 35%)',
      900: 'hsl(280, 100%, 25%)',
      gradient: 'linear-gradient(135deg, hsl(280, 100%, 65%) 0%, hsl(290, 100%, 75%) 100%)',
      glow: '0 0 40px hsla(280, 100%, 65%, 0.5)',
      soft: 'hsla(280, 100%, 65%, 0.1)'
    },
    
    // Gemini colors with vibrancy
    gemini: {
      50: 'hsl(200, 100%, 98%)',
      100: 'hsl(200, 100%, 95%)',
      200: 'hsl(200, 100%, 90%)',
      300: 'hsl(200, 100%, 80%)',
      400: 'hsl(200, 100%, 65%)',
      500: 'hsl(200, 100%, 50%)', // Primary
      600: 'hsl(200, 100%, 40%)',
      700: 'hsl(200, 100%, 30%)',
      800: 'hsl(200, 100%, 20%)',
      900: 'hsl(200, 100%, 10%)',
      gradient: 'linear-gradient(135deg, hsl(200, 100%, 50%) 0%, hsl(210, 100%, 60%) 100%)',
      glow: '0 0 40px hsla(200, 100%, 50%, 0.5)',
      soft: 'hsla(200, 100%, 50%, 0.1)'
    },
    
    // Neutral colors for dark theme
    background: {
      primary: 'hsl(220, 20%, 7%)',
      secondary: 'hsl(220, 18%, 12%)',
      tertiary: 'hsl(220, 16%, 16%)',
      elevated: 'hsla(220, 20%, 15%, 0.8)',
      glass: 'hsla(220, 20%, 20%, 0.1)',
      overlay: 'hsla(220, 20%, 7%, 0.9)'
    },
    
    // Semantic colors
    success: {
      DEFAULT: 'hsl(142, 71%, 45%)',
      soft: 'hsla(142, 71%, 45%, 0.1)',
      glow: '0 0 20px hsla(142, 71%, 45%, 0.4)'
    },
    
    warning: {
      DEFAULT: 'hsl(38, 92%, 50%)',
      soft: 'hsla(38, 92%, 50%, 0.1)',
      glow: '0 0 20px hsla(38, 92%, 50%, 0.4)'
    },
    
    error: {
      DEFAULT: 'hsl(0, 84%, 60%)',
      soft: 'hsla(0, 84%, 60%, 0.1)',
      glow: '0 0 20px hsla(0, 84%, 60%, 0.4)'
    },
    
    // Text colors
    text: {
      primary: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(0, 0%, 70%)',
      tertiary: 'hsl(0, 0%, 50%)',
      inverse: 'hsl(0, 0%, 10%)'
    }
  },
  
  // Typography system
  typography: {
    fontFamily: {
      display: '"Cal Sans", "Inter var", system-ui, -apple-system, sans-serif',
      body: '"Inter var", system-ui, -apple-system, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace'
    },
    
    // Fluid typography with clamp
    fontSize: {
      xs: 'clamp(0.75rem, 0.7vw + 0.5rem, 0.875rem)',
      sm: 'clamp(0.875rem, 0.8vw + 0.6rem, 1rem)',
      base: 'clamp(1rem, 1vw + 0.7rem, 1.125rem)',
      lg: 'clamp(1.125rem, 1.2vw + 0.8rem, 1.25rem)',
      xl: 'clamp(1.25rem, 1.5vw + 0.9rem, 1.5rem)',
      '2xl': 'clamp(1.5rem, 2vw + 1rem, 2rem)',
      '3xl': 'clamp(2rem, 3vw + 1.2rem, 3rem)',
      '4xl': 'clamp(2.5rem, 4vw + 1.5rem, 4rem)',
      '5xl': 'clamp(3rem, 5vw + 2rem, 5rem)'
    },
    
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    
    lineHeight: {
      tight: 1.1,
      snug: 1.3,
      normal: 1.5,
      relaxed: 1.7,
      loose: 2
    }
  },
  
  // Spacing system (8px base)
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
    32: '8rem',      // 128px
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    DEFAULT: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem',
    full: '9999px'
  },
  
  // Shadows for depth
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '2xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    glow: {
      claude: '0 0 40px hsla(280, 100%, 65%, 0.5)',
      gemini: '0 0 40px hsla(200, 100%, 50%, 0.5)',
      success: '0 0 20px hsla(142, 71%, 45%, 0.4)',
      error: '0 0 20px hsla(0, 84%, 60%, 0.4)'
    }
  },
  
  // Animation tokens
  animation: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms'
    },
    
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)'
    },
    
    spring: {
      bouncy: { type: 'spring', stiffness: 500, damping: 25 },
      smooth: { type: 'spring', stiffness: 300, damping: 30 },
      slow: { type: 'spring', stiffness: 200, damping: 40 }
    }
  },
  
  // Glassmorphism presets
  glass: {
    light: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.07)'
    },
    
    dark: {
      background: 'rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
    },
    
    colored: (color: string, opacity: number = 0.1) => ({
      background: `${color.replace('hsl', 'hsla').replace(')', `, ${opacity})`)}`,
      backdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${color.replace('hsl', 'hsla').replace(')', ', 0.2)')}`,
      boxShadow: `0 8px 32px 0 ${color.replace('hsl', 'hsla').replace(')', ', 0.2)')}`
    })
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
    notification: 80,
    commandPalette: 90
  }
}

// Utility function to create CSS variables from design tokens
export const createCSSVariables = () => {
  const cssVars: Record<string, string> = {}
  
  // Colors
  Object.entries(designTokens.colors).forEach(([category, values]) => {
    if (typeof values === 'object' && !Array.isArray(values)) {
      Object.entries(values).forEach(([key, value]) => {
        if (typeof value === 'string') {
          cssVars[`--color-${category}-${key}`] = value
        }
      })
    }
  })
  
  // Typography
  Object.entries(designTokens.typography.fontSize).forEach(([key, value]) => {
    cssVars[`--font-size-${key}`] = value
  })
  
  // Spacing
  Object.entries(designTokens.spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = value
  })
  
  // Border radius
  Object.entries(designTokens.borderRadius).forEach(([key, value]) => {
    cssVars[`--radius-${key}`] = value
  })
  
  return cssVars
}