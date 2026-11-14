import type { ReactNode } from 'react';
import { GLOSSARY } from '../data/glossary';

/** A science word with a plain-language explanation on hover, tap or keyboard focus. */
export function Term({ k, children }: { k: keyof typeof GLOSSARY; children?: ReactNode }) {
  const entry = GLOSSARY[k];
  return (
    <span className="term" tabIndex={0}>
      {children ?? entry.word}
      <span className="term-tip" role="tooltip">
        <strong>{entry.word}</strong>
        {entry.means}
      </span>
    </span>
  );
}
