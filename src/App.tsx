import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth-context';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Setup from './pages/Setup';
import PlayerSetup from './pages/PlayerSetup';
import Game from './pages/Game';
import End from './pages/End';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error } = useAuth();
  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Verbinde mit Spotify…
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="max-w-md space-y-4">
          <p className="text-red-400">Fehler beim Laden: {error}</p>
          <button className="btn-ghost" onClick={() => window.location.href = '/'}>
            Zurück zum Login
          </button>
        </div>
      </div>
    );
  }
  if (status !== 'authenticated') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function Shell() {
  return (
    <div className="mx-auto min-h-full max-w-5xl px-4 py-8">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route
          path="/setup"
          element={
            <RequireAuth>
              <Setup />
            </RequireAuth>
          }
        />
        <Route
          path="/players"
          element={
            <RequireAuth>
              <PlayerSetup />
            </RequireAuth>
          }
        />
        <Route
          path="/game"
          element={
            <RequireAuth>
              <Game />
            </RequireAuth>
          }
        />
        <Route
          path="/end"
          element={
            <RequireAuth>
              <End />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
