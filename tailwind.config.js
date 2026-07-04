/** @type {import('tailwindcss').Config} */

// Tailwind kann Opacity-Modifier (bg-accent/20) nur anwenden, wenn die Farbe
// entweder ein <alpha-value>-Platzhalter-String ist ODER (wie hier) eine
// Funktion, die den Modifier selbst in CSS umsetzt. Ein blanker `var(--t-x)`-
// String lässt Tailwind die Utility mit Opacity-Suffix STILLSCHWEIGEND WEGLASSEN
// (nicht: falsch gerendert — gar keine Regel generiert). Per color-mix() bleibt
// der Opacity-Modifier für alle bestehenden Klassen (z. B. hover:bg-panel2/70,
// ring-accent/50 in unberührten Dateien wie ThemeChips/PlaylistPicker) nutzbar.
function themeColor(varName) {
  return ({ opacityValue }) =>
    opacityValue === undefined
      ? `var(${varName})`
      : `color-mix(in srgb, var(${varName}) calc(${opacityValue} * 100%), transparent)`;
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-Tokens (siehe src/theme/tokens.ts + useThemeCssVars) — bestehende
        // Klassen wie bg-panel2/text-accent bleiben unangetastet, folgen aber
        // jetzt live dem gewählten Theme statt fixer Hex-Werte.
        ink: themeColor('--t-bg'),
        panel: themeColor('--t-surface'),
        panel2: themeColor('--t-surface'),
        accent: themeColor('--t-accent'),
        // Slate-Skala wird im Projekt nur für Text/Rahmen benutzt — auf
        // Theme-Text-Töne umgelegt, damit alle bestehenden Screens mitziehen.
        // red/emerald/green NICHT umgelegt: die bestehenden Fehler-/Crash-Screens
        // (ErrorBoundary, App.tsx-Ladefehler, Callback.tsx, PlaylistPicker) sollen
        // immer ein echtes Warn-Rot zeigen, unabhängig vom gewählten Theme.
        slate: {
          100: themeColor('--t-text'),
          200: themeColor('--t-text'),
          300: themeColor('--t-text-muted'),
          400: themeColor('--t-text-muted'),
          500: themeColor('--t-text-muted'),
          600: themeColor('--t-stroke'),
          700: themeColor('--t-stroke'),
        },
      },
      fontFamily: {
        sans: ['var(--t-font)', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
