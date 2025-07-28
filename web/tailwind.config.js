/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Modern color palette
        claude: {
          50: 'hsl(280, 100%, 98%)',
          100: 'hsl(280, 100%, 95%)',
          200: 'hsl(280, 100%, 90%)',
          300: 'hsl(280, 100%, 85%)',
          400: 'hsl(280, 100%, 75%)',
          500: 'hsl(280, 100%, 65%)',
          600: 'hsl(280, 100%, 55%)',
          700: 'hsl(280, 100%, 45%)',
          800: 'hsl(280, 100%, 35%)',
          900: 'hsl(280, 100%, 25%)',
          DEFAULT: 'hsl(280, 100%, 65%)',
        },
        gemini: {
          50: 'hsl(200, 100%, 98%)',
          100: 'hsl(200, 100%, 95%)',
          200: 'hsl(200, 100%, 90%)',
          300: 'hsl(200, 100%, 80%)',
          400: 'hsl(200, 100%, 65%)',
          500: 'hsl(200, 100%, 50%)',
          600: 'hsl(200, 100%, 40%)',
          700: 'hsl(200, 100%, 30%)',
          800: 'hsl(200, 100%, 20%)',
          900: 'hsl(200, 100%, 10%)',
          DEFAULT: 'hsl(200, 100%, 50%)',
        },
      },
      boxShadow: {
        'claude-glow': '0 0 40px hsla(280, 100%, 65%, 0.5)',
        'gemini-glow': '0 0 40px hsla(200, 100%, 50%, 0.5)',
        'success-glow': '0 0 20px hsla(142, 71%, 45%, 0.4)',
        'error-glow': '0 0 20px hsla(0, 84%, 60%, 0.4)',
      },
      backgroundImage: {
        'claude-gradient': 'linear-gradient(135deg, hsl(280, 100%, 65%) 0%, hsl(290, 100%, 75%) 100%)',
        'gemini-gradient': 'linear-gradient(135deg, hsl(200, 100%, 50%) 0%, hsl(210, 100%, 60%) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      fontFamily: {
        'display': ['"Cal Sans"', '"Inter var"', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "liquid-morph": {
          "0%": {
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            transform: "rotate(0deg)",
          },
          "33%": {
            borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%",
            transform: "rotate(45deg)",
          },
          "66%": {
            borderRadius: "70% 30% 50% 60% / 30% 70% 40% 60%",
            transform: "rotate(-45deg)",
          },
          "100%": {
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            transform: "rotate(0deg)",
          },
        },
        "float-particle": {
          from: {
            transform: "translateY(100vh) rotate(0deg)",
            opacity: "0",
          },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          to: {
            transform: "translateY(-100vh) rotate(360deg)",
            opacity: "0",
          },
        },
        "shimmer": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "liquid-morph": "liquid-morph 3s ease-in-out infinite",
        "float-particle": "float-particle 20s linear infinite",
        "shimmer": "shimmer 2s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}