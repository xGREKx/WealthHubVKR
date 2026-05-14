/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        orange:      '#F07220',
        'orange-soft': '#FBE4D5',
        'orange-tint': '#FFF4ED',
        violet:      '#5F2F8C',
        'violet-soft': '#E8DEF1',
        'violet-tint': '#F4EEF9',
        ink:         '#05040B',
        'ink-soft':  '#1A1820',
        paper:       '#EAE8E4',
        'paper-2':   '#F2F0EC',
        line:        '#D4D2CD',
        'line-soft': '#E0DDD8',
        muted:       '#6E6B65',
      },
      fontFamily: {
        display: ['Unbounded', 'system-ui', 'sans-serif'],
        body:    ['Onest', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
