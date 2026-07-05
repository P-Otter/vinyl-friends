// "Vinyl!": zeigt, was mit der gespielten Handkarte passiert ist — Effekt
// gültig (richtig platziert) oder verfallen (falsch, +1 Strafkarte).
import type { PlacementResult, Player } from '../types';
import { VINYL_CARD_INFO } from '../lib/vinylDeck';
import { useTheme } from '../hooks/useTheme';

type Props = {
  vinylPlay: NonNullable<PlacementResult['vinylPlay']>;
  players: Player[];
};

export default function VinylCardResult({ vinylPlay, players }: Props) {
  const t = useTheme();
  const nameOf = (id?: string) => players.find((p) => p.id === id)?.name ?? '—';
  const info = VINYL_CARD_INFO[vinylPlay.card.type];

  let text: string;
  if (!vinylPlay.effectApplied) {
    text = `${info.emoji} ${info.label} verfällt — dafür 1 Karte nachgezogen.`;
  } else {
    switch (vinylPlay.card.type) {
      case 'reverse':
        text =
          players.length === 2
            ? `${info.emoji} Reverse! Bei 2 Spielern wie ein Skip — du bist direkt nochmal dran.`
            : `${info.emoji} Reverse! Die Zugrichtung dreht sich um.`;
        break;
      case 'skip':
        text = `${info.emoji} Skip! ${nameOf(vinylPlay.targetId)} setzt aus.`;
        break;
      case 'draw1':
        text = `${info.emoji} ${nameOf(vinylPlay.targetId)} zieht 1 Karte nach.`;
        break;
      case 'draw2':
        text = `${info.emoji} ${nameOf(vinylPlay.targetId)} zieht 2 Karten nach und setzt aus.`;
        break;
      case 'wish-decade':
        text = `${info.emoji} Wunschkarte eingelöst — ${vinylPlay.wishDecade}er wie gewünscht!`;
        break;
      case 'swap-hand':
        text = vinylPlay.targetId
          ? `${info.emoji} Tausch! Hand mit ${nameOf(vinylPlay.targetId)} getauscht.`
          : `${info.emoji} Tausch war deine letzte Karte — nichts zu tauschen, Hand leer!`;
        break;
      case 'double':
        text = `${info.emoji} 2-für-1! Gleich noch ein Song — ohne neue Kartenwahl.`;
        break;
      default:
        text = `${info.emoji} ${info.label} abgelegt.`;
    }
  }

  return (
    <div className="mt-4 rounded-xl px-4 py-3 text-sm font-bold" style={{ background: `${t.highlight}26`, color: t.highlight }}>
      {text}
    </div>
  );
}
