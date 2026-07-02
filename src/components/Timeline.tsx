import { memo } from 'react';
import type { Track } from '../types';
import TrackCard from './TrackCard';

type Props = {
  cards: Track[]; // bereits chronologisch sortiert
  selectedGap: number | null; // 0..cards.length
  onSelectGap: (gap: number) => void;
  disabled?: boolean;
};

/**
 * Zeigt die Karten des aktiven Spielers chronologisch + klickbare Lücken dazwischen.
 * Gap i bedeutet: Karte landet VOR cards[i] (Gap 0 = ganz links, cards.length = ganz rechts).
 */
function Timeline({ cards, selectedGap, onSelectGap, disabled }: Props) {
  const Gap = ({ index }: { index: number }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelectGap(index)}
      aria-label={`hier einsortieren (Position ${index})`}
      className={
        'mx-0.5 flex h-24 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-dashed text-xs transition ' +
        (selectedGap === index
          ? 'border-accent bg-accent/20 text-accent'
          : 'border-slate-600 text-slate-600 hover:border-slate-400 hover:text-slate-400') +
        (disabled ? ' pointer-events-none opacity-40' : '')
      }
    >
      {selectedGap === index ? '✓' : 'hier'}
    </button>
  );

  if (cards.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Gap index={0} />
        <span className="text-sm text-slate-500">
          Noch keine Karten — die erste landet automatisch korrekt.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center overflow-x-auto pb-2">
      <Gap index={0} />
      {cards.map((card, i) => (
        <div key={card.id} className="flex items-center">
          <TrackCard track={card} />
          <Gap index={i + 1} />
        </div>
      ))}
    </div>
  );
}

// memo: Timeline + Karten bleiben während der Wiedergabe stehen (Props ändern sich nur
// bei Kartenauswahl/neuer Runde), nicht bei jedem 500-ms-Fortschritts-Tick.
export default memo(Timeline);
