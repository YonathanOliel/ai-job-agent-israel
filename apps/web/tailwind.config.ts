import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', lg: '2rem' },
      screens: { '2xl': '1240px' },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Heebo', 'Assistant', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
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
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        '2xl': 'calc(var(--radius) + 6px)',
        xl: 'calc(var(--radius) + 2px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 hsl(30 20% 10% / 0.05)',
        sm: '0 1px 3px 0 hsl(30 20% 10% / 0.08), 0 1px 2px -1px hsl(30 20% 10% / 0.06)',
        md: '0 4px 14px -2px hsl(30 20% 10% / 0.10), 0 2px 6px -2px hsl(30 20% 10% / 0.06)',
        lg: '0 16px 40px -12px hsl(30 24% 10% / 0.18), 0 6px 14px -6px hsl(30 20% 10% / 0.09)',
        glow: '0 0 0 1px hsl(var(--primary) / 0.16), 0 10px 34px -10px hsl(var(--primary) / 0.4)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, hsl(38 44% 58%), hsl(28 42% 46%))',
        'brand-soft':
          'radial-gradient(120% 120% at 100% 0%, hsl(var(--primary) / 0.14) 0%, transparent 55%), radial-gradient(120% 120% at 0% 100%, hsl(var(--accent) / 0.10) 0%, transparent 55%)',
        'brand-deep': 'linear-gradient(150deg, hsl(228 14% 12%), hsl(225 16% 6%))',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(-100%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        'spin-slow': 'spin-slow 1.4s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
