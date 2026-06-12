import { THEMES } from '../lib/queue-builder';

type Props = {
  enabled: string[];
  onToggle: (id: string) => void;
};

export default function ThemeChips({ enabled, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {THEMES.map((t) => {
        const on = enabled.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id)}
            className={
              'rounded-full px-4 py-2 text-sm font-medium transition ' +
              (on
                ? 'bg-accent text-black'
                : 'bg-panel2 text-slate-300 hover:bg-panel2/70')
            }
          >
            <span aria-hidden className="mr-1">
              {t.emoji}
            </span>
            {t.name}
          </button>
        );
      })}
    </div>
  );
}
