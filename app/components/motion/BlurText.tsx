/**
 * Word-by-word blur/rise reveal. Adapted from React Bits "BlurText" (reactbits.dev),
 * rewritten as CSS keyframes so it needs no animation library. Splits by word so
 * Devanagari conjuncts stay intact. Honors prefers-reduced-motion via globals.css.
 */
type Props = { text: string; className?: string; delayMs?: number; stepMs?: number };

export default function BlurText({ text, className, delayMs = 80, stepMs = 140 }: Props) {
  const words = text.split(/(\s+)/);
  let i = 0;
  return (
    <span className={className} aria-label={text} role="text">
      {words.map((w, idx) =>
        /^\s+$/.test(w) ? (
          w
        ) : (
          <span
            key={idx}
            aria-hidden
            className="blur-word"
            style={{ animationDelay: `${delayMs + stepMs * i++}ms` }}
          >
            {w}
          </span>
        ),
      )}
    </span>
  );
}
