import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Fängt Render-Fehler ab und zeigt sie an, statt die ganze App auf einen
 * blanken (blauen) Bildschirm krachen zu lassen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Zusätzlich in die Konsole, damit der Stacktrace komplett da ist.
    console.error('Render-Fehler:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl p-8">
          <div className="rounded-2xl bg-red-500/10 p-6">
            <h1 className="mb-2 text-xl font-bold text-red-300">Da ist etwas abgestürzt</h1>
            <pre className="overflow-auto whitespace-pre-wrap text-sm text-red-200">
              {this.state.error.message}
            </pre>
            <div className="mt-4 flex gap-3">
              <button
                className="btn-ghost"
                onClick={() => {
                  this.setState({ error: null });
                  // BASE_URL statt '/': unter GitHub Pages (/vinyl-friends/)
                  // führt '/' aus der App heraus.
                  window.location.href = import.meta.env.BASE_URL;
                }}
              >
                Zurück zum Start
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  // Persistierten Spielstand löschen — häufige Crash-Ursache nach Schema-Änderungen.
                  localStorage.removeItem('hf_game_state');
                  window.location.href = import.meta.env.BASE_URL;
                }}
              >
                Spielstand zurücksetzen & neu laden
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
