// "Vinyl!"-Zufallsereignis nach einem Treffer — Port des UNO-Aktionskarten-Twists.
import type { Player, VinylEvent } from '../types';
import { useTheme } from '../hooks/useTheme';

type Props = {
  event: VinylEvent;
  players: Player[];
};

export default function VinylEventBanner({ event, players }: Props) {
  const t = useTheme();
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  const text =
    event.kind === 'curse'
      ? `😈 Fluch! ${nameOf(event.targetId)} zieht 2 Karten dazu.`
      : event.kind === 'swap'
        ? `🔄 Tausch-Vinyl! Handgröße mit ${nameOf(event.targetId)} getauscht.`
        : '💨 Alle minus eins! Jede Hand schrumpft um eine Karte.';

  return (
    <div
      className="mt-4 rounded-xl px-4 py-3 text-sm font-bold"
      style={{ background: `${t.highlight}26`, color: t.highlight }}
    >
      {text}
    </div>
  );
}
