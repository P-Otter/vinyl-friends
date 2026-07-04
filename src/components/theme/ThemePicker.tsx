// Stil-Wähler — Port der themePicker-Sektion aus HomeView.swift.
import { THEMES } from '../../theme/tokens';
import { useThemeStore, useTheme } from '../../hooks/useTheme';

export default function ThemePicker() {
  const t = useTheme();
  const setThemeId = useThemeStore((s) => s.setThemeId);

  return (
    <div className="flex flex-col items-center gap-2 pb-2">
      <span
        className="text-[10px] font-black tracking-[0.2em] text-[var(--t-text-muted)]"
      >
        STIL
      </span>
      <div className="flex flex-wrap justify-center gap-3">
        {THEMES.map((theme) => {
          const active = theme.id === t.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setThemeId(theme.id)}
              className="flex flex-col items-center gap-1"
            >
              <span
                className="relative flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  background: theme.background,
                  boxShadow: `0 0 0 ${active ? 3 : 1.5}px ${active ? theme.highlight : theme.text + '4d'}`,
                }}
              >
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ background: theme.accent }}
                />
              </span>
              <span
                className="text-[9px] font-bold"
                style={{ color: active ? t.text : t.textMuted }}
              >
                {theme.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
