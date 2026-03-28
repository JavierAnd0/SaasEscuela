/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Materialize 2.0.1 color system ──────────────────────────────
        // Primary: indigo #666cff (with generated scale)
        primary: {
          50:  '#f0f0ff',
          100: '#e0e0ff',
          200: '#c5c6ff',
          300: '#a5a7ff',
          400: '#8587ff',
          500: '#666cff',  // brand primary
          600: '#5257e6',
          700: '#3d42cc',
          800: '#282eb3',
          900: '#1a1f99',
        },
        // Secondary: blue-grey #6d788d
        secondary: {
          DEFAULT: '#6d788d',
          light:   '#8a94a6',
          dark:    '#515b6e',
        },
        // Semantic
        success: {
          DEFAULT: '#72e128',
          light:   '#8fe84e',
          dark:    '#57b21f',
        },
        info: {
          DEFAULT: '#26c6f9',
          light:   '#5ed4fb',
          dark:    '#1aa8d6',
        },
        warning: {
          DEFAULT: '#fdb528',
          light:   '#fec956',
          dark:    '#d4941a',
        },
        danger: {
          DEFAULT: '#ff4d49',
          light:   '#ff7573',
          dark:    '#d63633',
        },
        // ── Dark sidebar ────────────────────────────────────────────────
        menu: {
          dark:     '#282a42',   // sidebar bg (semi-dark theme)
          text:     '#d7d8ee',   // sidebar text
          muted:    '#7b7d95',   // sidebar header / muted text
          active:   '#666cff',   // active item bg
          hover:    'rgba(255,255,255,0.06)',
          border:   'rgba(255,255,255,0.12)',
        },
        // ── Base text: Materialize uses #262b43 as "black" ──────────────
        base: {
          DEFAULT: '#262b43',
          muted:   '#6d788d',
        },
        // Colores de niveles SIEE
        nivel: {
          superior: '#72e128',
          alto:     '#26c6f9',
          basico:   '#fdb528',
          bajo:     '#ff4d49',
        },
        // Colores de asistencia
        asistencia: {
          presente:      '#72e128',
          justificada:   '#26c6f9',
          injustificada: '#ff4d49',
          tardanza:      '#fdb528',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        xl:      '0.625rem',   // Materialize card radius
        '2xl':   '1rem',
      },
      boxShadow: {
        // Materialize card shadow — uses rgba(#262b43, 0.16)
        card:  '0 0.25rem 0.875rem 0 rgba(38,43,67,0.16)',
        'card-sm': '0 0.125rem 0.375rem 0 rgba(38,43,67,0.14)',
        'card-lg': '0 0.375rem 1.25rem 0 rgba(38,43,67,0.18)',
      },
      screens: {
        '2xl': '1440px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
