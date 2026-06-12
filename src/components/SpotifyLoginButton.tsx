type Props = {
  onClick: () => void;
  disabled?: boolean;
};

export default function SpotifyLoginButton({ onClick, disabled }: Props) {
  return (
    <button className="btn-primary text-lg" onClick={onClick} disabled={disabled}>
      <span aria-hidden>▶</span> Mit Spotify verbinden
    </button>
  );
}
