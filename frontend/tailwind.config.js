/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        // Legacy custom colors
        dark: {
          950: '#09090b',
          900: '#0f0f12',
          800: '#1a1a1f',
          700: '#252529',
          600: '#2e2e33',
          500: '#3f3f46',
        },
        'accent-primary': '#6366f1',
        'accent-success': '#22c55e',
        'accent-warning': '#f59e0b',
        'accent-danger': '#ef4444',
        'accent-info': '#06b6d4',
        'accent-purple': '#a855f7',
        // shadcn semantic colors (HSL)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-info': '0 0 20px rgba(6, 182, 212, 0.3)',
        // Soft UI shadows (FASE 2: Increased elevation for better card contrast)
        'soft': '0 15px 40px -10px rgba(0, 0, 0, 0.08)',
        'soft-dark': '0 15px 40px -10px rgba(0, 0, 0, 0.35)',
        'soft-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.12)',
        'soft-lg-dark': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'expand': 'expand 0.2s ease-out',
      },
      keyframes: {
        expand: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionProperty: {
        'height': 'height, max-height',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
