// Eingabefeld mit Theme-Rahmen (surfaceStroke) statt des generischen
// borderlosen bg-panel2-Felds — passt zu den umrandeten Karten der iOS-App.
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useTheme } from '../../hooks/useTheme';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };

export default function ThemedField(props: InputProps | TextareaProps) {
  const t = useTheme();
  // `style`/`className` explizit rausziehen statt über {...rest} laufen zu
  // lassen — sonst würde ein von außen übergebenes style-Prop durch das feste
  // style-Attribut unten stillschweigend überschrieben statt gemergt.
  const { as: _as, style: styleProp, className: classNameProp, ...rest } = props;
  const style = {
    background: t.background,
    border: `${Math.max(t.strokeWidth * 0.6, 1)}px solid ${t.surfaceStroke}66`,
    color: t.text,
    ...styleProp,
  };
  const className = (classNameProp ?? '') + ' rounded-lg px-3 py-2 outline-none';

  if (props.as === 'textarea') {
    return (
      <textarea
        {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        className={className}
        style={style}
      />
    );
  }
  return (
    <input {...(rest as InputHTMLAttributes<HTMLInputElement>)} className={className} style={style} />
  );
}
