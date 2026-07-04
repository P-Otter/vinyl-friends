// Eigenen Song-Pool bauen — Ohne-Spotify-Modus (Port des iOS-PoolBuilders):
// fertige Packs antippen, Songs suchen oder eine Liste einfügen.
// Gespielt wird mit 30s-iTunes-Hörproben, ganz ohne Konto.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchSongs } from '../lib/itunes';
import { usePool } from '../hooks/usePool';
import { useGameState } from '../hooks/useGameState';
import { useTheme } from '../hooks/useTheme';
import ThemedTitle from '../components/theme/ThemedTitle';
import ThemedField from '../components/theme/ThemedField';
import type { Track } from '../types';
import packsData from '../data/song-packs.json';

type PackSong = { title: string; artist: string; year: number };
type Pack = { id: string; name: string; emoji: string; songs: PackSong[] };

const PACKS = (packsData as { packs: Pack[] }).packs;
// Import-Limit: die iTunes-API drosselt nach ~50 schnellen Requests pro IP.
const MAX_IMPORT_LINES = 30;

function packTrack(pack: Pack, song: PackSong): Track {
  return {
    id: `pack-${pack.id}-${song.artist}-${song.title}`,
    uri: '',
    name: song.title,
    artist: song.artist,
    albumName: '',
    albumArt: '',
    releaseYear: song.year,
    releaseDateRaw: String(song.year),
    releaseDatePrecision: 'year',
    source: 'local',
    durationMs: 30_000,
    explicit: false,
  };
}

export default function PoolBuilder() {
  const navigate = useNavigate();
  const { pool, add, remove, clear } = usePool();
  const { setSettings } = useGameState();

  const [tab, setTab] = useState<'search' | 'paste'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetCards, setTargetCards] = useState(5);

  // Suche mit 400ms-Debounce (wie iOS). Der Sequenz-Zähler verwirft
  // verspätete Antworten älterer Requests (JSONP ist nicht abbrechbar) —
  // sonst überschriebe eine langsame alte Suche die neuen Treffer.
  const searchTimer = useRef<number | null>(null);
  const searchSeq = useRef(0);
  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    searchTimer.current = window.setTimeout(() => {
      const seq = ++searchSeq.current;
      setSearching(true);
      searchSongs(q)
        .then((hits) => {
          if (seq !== searchSeq.current) return;
          setResults(hits);
          setError(null);
        })
        .catch(() => {
          if (seq !== searchSeq.current) return;
          setError('Suche fehlgeschlagen — kein Netz?');
        })
        .finally(() => {
          if (seq === searchSeq.current) setSearching(false);
        });
    }, 400);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [query]);

  const poolIds = new Set(pool.map((t) => t.id));
  // Gleiche Formel wie die Start-Validierung in PlayerSetup — sonst ließe der
  // Weiter-Button Pools durch, die dort erst beim Start abgelehnt würden.
  const minNeeded = Math.max(targetCards + 3, 8);

  const addPack = (pack: Pack) => {
    const added = add(pack.songs.map((s) => packTrack(pack, s)));
    setInfo(`${added} Songs aus ${pack.name} hinzugefügt`);
  };

  const toggleTrack = (track: Track) => {
    if (poolIds.has(track.id)) remove(track.id);
    else add([track]);
  };

  const runImport = async () => {
    const allLines = pasteText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (allLines.length === 0) return;
    // iTunes drosselt schnelle Request-Serien — pro Durchgang begrenzen und
    // zwischen den Anfragen kurz warten, statt in die Sperre zu laufen.
    const lines = allLines.slice(0, MAX_IMPORT_LINES);
    const skipped = allLines.length - lines.length;
    setImporting(true);
    setInfo(null);
    setError(null);
    let added = 0;
    let missed = 0;
    for (const [i, line] of lines.entries()) {
      try {
        const hits = await searchSongs(line, 1);
        if (hits[0]) added += add([hits[0]]);
        else missed += 1;
      } catch {
        missed += 1;
      }
      if (i < lines.length - 1) await new Promise((r) => setTimeout(r, 700));
    }
    setInfo(
      `${added} hinzugefügt${missed > 0 ? `, ${missed} nicht gefunden` : ''}` +
        (skipped > 0 ? ` — max. ${MAX_IMPORT_LINES} Zeilen pro Durchgang, ${skipped} übrig` : ''),
    );
    setImporting(false);
  };

  const t = useTheme();

  const start = () => {
    setSettings({
      musicSource: 'preview',
      winCondition: { type: 'cards', n: targetCards },
      snippetMode: { enabled: false, lengthSec: 30 },
      randomOffset: false,
    });
    navigate('/players');
  };

  return (
    <div className="space-y-6">
      <ThemedTitle size={30}>Eigenen Pool bauen</ThemedTitle>
      <p className="text-sm" style={{ color: t.textMuted }}>
        Ohne Spotify, ohne Konto — gespielt wird mit 30-Sekunden-Hörproben.
      </p>

      <section className="panel space-y-3">
        <label className="field-label mb-0">Fertige Packs — Tipp: hinzufügen</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => addPack(pack)}
              className="flex w-24 shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-3 text-center"
              style={{ background: t.background, border: `1px solid ${t.surfaceStroke}4d` }}
            >
              <span className="text-2xl">{pack.emoji}</span>
              <span className="text-[11px] font-semibold leading-tight">{pack.name}</span>
              <span className="text-[10px]" style={{ color: t.highlight }}>
                {pack.songs.length}
              </span>
            </button>
          ))}
        </div>
      </section>

      {info && (
        <p className="text-sm font-semibold" style={{ color: t.good }}>
          ✓ {info}
        </p>
      )}
      {error && (
        <p className="text-sm font-semibold" style={{ color: t.bad }}>
          {error}
        </p>
      )}

      <section className="panel space-y-4">
        <div className="flex gap-2">
          <button
            className={tab === 'search' ? 'btn-primary flex-1' : 'btn-ghost flex-1'}
            onClick={() => setTab('search')}
          >
            Suchen
          </button>
          <button
            className={tab === 'paste' ? 'btn-primary flex-1' : 'btn-ghost flex-1'}
            onClick={() => setTab('paste')}
          >
            Liste einfügen
          </button>
        </div>

        {tab === 'search' ? (
          <div className="space-y-2">
            <ThemedField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Song oder Künstler …"
              className="w-full"
            />
            {searching && (
              <p className="text-xs" style={{ color: t.textMuted }}>
                Suche…
              </p>
            )}
            {results.map((track) => {
              const added = poolIds.has(track.id);
              return (
                <button
                  key={track.id}
                  onClick={() => toggleTrack(track)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left"
                >
                  <span className="w-12 shrink-0 font-mono text-sm font-bold" style={{ color: t.highlight }}>
                    {track.releaseYear}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{track.name}</span>
                    <span className="block truncate text-xs" style={{ color: t.textMuted }}>
                      {track.artist}
                    </span>
                  </span>
                  <span style={{ color: added ? t.good : t.highlight }}>{added ? '✓' : '+'}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: t.textMuted }}>
              Pro Zeile ein Song („Künstler – Titel“) — z. B. aus einer exportierten Playlist.
            </p>
            <ThemedField
              as="textarea"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              className="w-full text-base"
            />
            <button
              className="btn-primary w-full"
              onClick={runImport}
              disabled={importing || pasteText.trim().length === 0}
            >
              {importing ? 'Importiere…' : 'Importieren'}
            </button>
          </div>
        )}
      </section>

      <section className="panel space-y-3">
        <div className="flex items-center justify-between">
          <label className="field-label mb-0">Dein Pool · {pool.length}</label>
          {pool.length > 0 && (
            <button className="text-xs font-semibold underline" style={{ color: t.bad }} onClick={clear}>
              Pool leeren
            </button>
          )}
        </div>
        {pool.length === 0 ? (
          <p className="text-sm" style={{ color: t.textMuted }}>
            Noch leer — tippe ein Pack an, such Songs oder füg eine Liste ein.
          </p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {[...pool].reverse().map((track) => (
              <div key={track.id} className="flex items-center gap-3 py-1">
                <span className="w-12 shrink-0 font-mono text-xs font-bold" style={{ color: t.highlight }}>
                  {track.releaseYear}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{track.name}</span>
                  <span className="block truncate text-xs" style={{ color: t.textMuted }}>
                    {track.artist}
                  </span>
                </span>
                <button
                  className="min-h-[40px] min-w-[40px]"
                  style={{ color: t.textMuted }}
                  onClick={() => remove(track.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel flex items-center justify-between">
        <label className="field-label mb-0">Karten zum Gewinnen</label>
        <div className="flex items-center gap-3">
          <button className="btn-ghost px-3" onClick={() => setTargetCards(Math.max(3, targetCards - 1))}>
            −
          </button>
          <span className="w-6 text-center font-mono text-lg font-bold">{targetCards}</span>
          <button className="btn-ghost px-3" onClick={() => setTargetCards(Math.min(15, targetCards + 1))}>
            +
          </button>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => navigate('/')}>
          ← zurück
        </button>
        <button className="btn-primary" onClick={start} disabled={pool.length < minNeeded}>
          {pool.length < minNeeded
            ? `Mind. ${minNeeded} Songs (noch ${minNeeded - pool.length})`
            : `Weiter — ${pool.length} Songs`}
        </button>
      </div>
    </div>
  );
}
