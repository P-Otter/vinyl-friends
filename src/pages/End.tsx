import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import EndScreen from '../components/EndScreen';

export default function End() {
  const navigate = useNavigate();
  const { players, resetGame, phase } = useGameState();

  // Direkt-Aufruf ohne gespieltes Spiel → zurück zum Setup.
  useEffect(() => {
    if (phase === 'setup') navigate('/setup', { replace: true });
  }, [phase, navigate]);

  return (
    <EndScreen
      players={players}
      onNewRound={() => {
        resetGame();
        navigate('/players');
      }}
      onBackToSetup={() => {
        resetGame();
        navigate('/setup');
      }}
    />
  );
}
