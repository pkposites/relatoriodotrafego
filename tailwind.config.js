/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F0F2F5',
        surface: '#FFFFFF',
        ink: { DEFAULT: '#182230', soft: '#475467', mute: '#667085' },
        line: '#E4E7EC',
        brand: { DEFAULT: '#0866FF', 600: '#0757D9', 700: '#0647B3', 50: '#EBF3FF', 100: '#D6E6FF', aux: '#1877F2' },
        ok: { DEFAULT: '#16A34A', 50: '#ECFDF3' },
        warn: { DEFAULT: '#F59E0B', 50: '#FFFAEB', 700: '#B54708' },
        bad: { DEFAULT: '#EF4444', 50: '#FEF3F2', 700: '#B42318' },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: { card: '16px' },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.04)',
        lift: '0 4px 12px rgba(16,24,40,0.08)',
      },
    },
  },
  plugins: [],
};
