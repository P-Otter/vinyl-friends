// Überschrift, die Font-Gewicht/Großschreibung/Font-Design des aktiven Themes
// respektiert (Port des Titel-Stylings aus den iOS-Views).
import type { ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  children: ReactNode;
  size?: number;
  className?: string;
};

export default function ThemedTitle({ children, size = 28, className = '' }: Props) {
  const t = useTheme();
  return (
    <h1
      className={className}
      style={{
        fontWeight: t.titleWeight,
        fontSize: t.uppercaseTitles ? size - 4 : size,
        letterSpacing: t.uppercaseTitles ? 1.2 : 0,
        textTransform: t.uppercaseTitles ? 'uppercase' : 'none',
      }}
    >
      {children}
    </h1>
  );
}
