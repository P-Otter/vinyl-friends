// Aktives Theme — persistiert wie in der iOS-App (ThemeStore).
import { useLayoutEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEMES, themeById, type AppTheme } from '../theme/tokens';

type ThemeStore = {
  themeId: string;
  setThemeId: (id: string) => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      themeId: THEMES[0].id,
      setThemeId: (id) => set({ themeId: id }),
    }),
    { name: 'vf_theme' },
  ),
);

export function useTheme(): AppTheme {
  const themeId = useThemeStore((s) => s.themeId);
  return themeById(themeId);
}

/** Schreibt die Theme-Farben als CSS-Variablen auf <html>, damit Tailwind-
 *  Arbitrary-Value-Klassen wie bg-[var(--t-surface)] überall greifen — auch
 *  ohne den Kontext an jede Komponente durchzureichen. Einmal in App.tsx mounten.
 *  useLayoutEffect statt useEffect: läuft synchron VOR dem ersten Bildaufbau,
 *  damit kein Frame mit den (alten) CSS-Fallbackwerten aus index.css aufblitzt. */
export function useThemeCssVars() {
  const t = useTheme();
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--t-bg', t.background);
    root.setProperty('--t-surface', t.surface);
    root.setProperty('--t-stroke', t.surfaceStroke);
    root.setProperty('--t-stroke-w', `${t.strokeWidth}px`);
    root.setProperty('--t-text', t.text);
    root.setProperty('--t-text-muted', t.textMuted);
    root.setProperty('--t-accent', t.accent);
    root.setProperty('--t-on-accent', t.onAccent);
    root.setProperty('--t-highlight', t.highlight);
    root.setProperty('--t-good', t.good);
    root.setProperty('--t-bad', t.bad);
    root.setProperty(
      '--t-shadow',
      t.shadow === 'hard'
        ? `4px 4px 0 ${t.text}`
        : t.shadow === 'glow'
          ? `0 5px 14px ${t.accent}8c`
          : 'none',
    );
    root.setProperty('--t-font', t.fontDesign === 'rounded' ? "'Baloo 2', system-ui" : "'Inter', system-ui");
    // Native Controls (Checkbox-Häkchen, Scrollbars) dem Theme folgen lassen —
    // vorher wurde nur ein ungenutztes data-Attribut gesetzt.
    document.documentElement.style.colorScheme = t.colorScheme;
    document.documentElement.dataset.colorScheme = t.colorScheme;
  }, [t]);
}
