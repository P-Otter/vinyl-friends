// Plattenbörse (Catan-inspiriert): Dekaden-Marken-Übersicht + 1-für-1-Tausch
// zwischen zwei Spielern + Satz-Einlösung. Der Host führt Trades manuell aus,
// die die Gruppe verbal ausgehandelt hat — kein digitales Verhandlungsprotokoll.
import { useState } from 'react';
import type { Player } from '../types';
import { useTheme } from '../hooks/useTheme';

type Props = {
  players: Player[];
  decades: number[]; // Dekaden, die im Pool vorkommen (Sortierreihenfolge)
  onTrade: (fromId: string, fromDecade: number, toId: string, toDecade: number) => void;
  onRedeem: (playerId: string) => void;
};

function hasFullSet(p: Player, decades: number[]): boolean {
  return decades.length > 0 && decades.every((d) => (p.decadeTokens?.[d] ?? 0) >= 1);
}

export default function MarketPanel({ players, decades, onTrade, onRedeem }: Props) {
  const t = useTheme();
  const [trading, setTrading] = useState(false);
  const [fromPlayer, setFromPlayer] = useState(players[0]?.id ?? '');
  const [fromDecade, setFromDecade] = useState<number | null>(null);
  const [toPlayer, setToPlayer] = useState(players[1]?.id ?? '');
  const [toDecade, setToDecade] = useState<number | null>(null);

  const tokensOf = (id: string) => players.find((p) => p.id === id)?.decadeTokens ?? {};

  const confirmTrade = () => {
    if (fromDecade === null || toDecade === null) return;
    onTrade(fromPlayer, fromDecade, toPlayer, toDecade);
    setFromDecade(null);
    setToDecade(null);
    setTrading(false);
  };

  return (
    <section className="panel space-y-3">
      <div className="flex items-center justify-between">
        <label className="field-label mb-0">📀 Markt — Dekaden-Marken</label>
        <button className="text-xs font-bold underline" style={{ color: t.highlight }} onClick={() => setTrading((v) => !v)}>
          {trading ? 'Fertig' : 'Tauschen'}
        </button>
      </div>

      <div className="space-y-2">
        {players.map((p) => {
          const full = hasFullSet(p, decades);
          return (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="truncate">{p.name}</span>
              </span>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {decades.map((d) => {
                  const n = p.decadeTokens?.[d] ?? 0;
                  if (n === 0) return null;
                  return (
                    <span
                      key={d}
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{ background: `${t.highlight}26`, color: t.highlight }}
                    >
                      {String(d).slice(2)}er×{n}
                    </span>
                  );
                })}
                {full && (
                  <button
                    className="rounded-full px-2 py-0.5 text-[11px] font-black"
                    style={{ background: t.good, color: t.onAccent }}
                    onClick={() => onRedeem(p.id)}
                  >
                    Satz! +3 ✓
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {trading && players.length >= 2 && (
        <div className="space-y-2 rounded-xl p-3 text-sm" style={{ background: t.background }}>
          <div className="flex items-center gap-2">
            <select
              className="min-w-0 flex-1 rounded-lg px-2 py-1.5"
              style={{ background: t.surface, border: `1px solid ${t.surfaceStroke}66`, color: t.text }}
              value={fromPlayer}
              onChange={(e) => { setFromPlayer(e.target.value); setFromDecade(null); }}
            >
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <span style={{ color: t.textMuted }}>gibt</span>
            <select
              className="rounded-lg px-2 py-1.5"
              style={{ background: t.surface, border: `1px solid ${t.surfaceStroke}66`, color: t.text }}
              value={fromDecade ?? ''}
              onChange={(e) => setFromDecade(Number(e.target.value))}
            >
              <option value="" disabled>Marke</option>
              {decades.filter((d) => (tokensOf(fromPlayer)[d] ?? 0) > 0).map((d) => (
                <option key={d} value={d}>{String(d).slice(2)}er</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="min-w-0 flex-1 rounded-lg px-2 py-1.5"
              style={{ background: t.surface, border: `1px solid ${t.surfaceStroke}66`, color: t.text }}
              value={toPlayer}
              onChange={(e) => { setToPlayer(e.target.value); setToDecade(null); }}
            >
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <span style={{ color: t.textMuted }}>gibt</span>
            <select
              className="rounded-lg px-2 py-1.5"
              style={{ background: t.surface, border: `1px solid ${t.surfaceStroke}66`, color: t.text }}
              value={toDecade ?? ''}
              onChange={(e) => setToDecade(Number(e.target.value))}
            >
              <option value="" disabled>Marke</option>
              {decades.filter((d) => (tokensOf(toPlayer)[d] ?? 0) > 0).map((d) => (
                <option key={d} value={d}>{String(d).slice(2)}er</option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary w-full py-2 text-sm disabled:opacity-40"
            disabled={fromPlayer === toPlayer || fromDecade === null || toDecade === null}
            onClick={confirmTrade}
          >
            1-für-1 tauschen
          </button>
        </div>
      )}
    </section>
  );
}
