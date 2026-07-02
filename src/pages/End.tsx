import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import EndScreen from '../components/EndScreen';

export default function End() {
  const navigate = useNavigate();
  const { players, resetGame, phase, settings } = useGameState();
  // Im Ohne-Spotify-Modus führt „Setup" zurück zum Pool, nicht zum Spotify-Setup.
  const setupPath = settings.musicSource === 'preview' ? '/pool' : '/setup';

  // Direkt-Aufruf ohne gespieltes Spiel → zurück zum Setup.
  useEffect(() => {
    if (phase === 'setup') navigate(setupPath, { replace: true });
  }, [phase, navigate, setupPath]);

  return (
    <EndScreen
      players={players}
      onNewRound={() => {
        resetGame();
        navigate('/players');
      }}
      onBackToSetup={() => {
        resetGame();
        navigate(setupPath);
      }}
    />
  );
}
