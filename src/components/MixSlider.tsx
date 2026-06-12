type Props = {
  value: number; // 0..1 = Friends-Anteil
  onChange: (v: number) => void;
  disabled?: boolean;
};

export default function MixSlider({ value, onChange, disabled }: Props) {
  const friendsPct = Math.round(value * 100);
  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <input
        type="range"
        min={0}
        max={100}
        value={friendsPct}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full accent-accent"
      />
      <div className="mt-1 flex justify-between text-sm text-slate-400">
        <span>Friends {friendsPct}%</span>
        <span>Themes {100 - friendsPct}%</span>
      </div>
    </div>
  );
}
