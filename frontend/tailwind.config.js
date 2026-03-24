/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Color institucional base (se sobreescribe por CSS variables por colegio)
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Colores de niveles SIEE
        nivel: {
          superior: '#16a34a',  // verde
          alto:     '#2563eb',  // azul
          basico:   '#d97706',  // amarillo
          bajo:     '#dc2626',  // rojo
        },
        // Colores de asistencia
        asistencia: {
          presente:   '#16a34a',
          justificada: '#2563eb',
          injustificada: '#dc2626',
          tardanza:   '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
