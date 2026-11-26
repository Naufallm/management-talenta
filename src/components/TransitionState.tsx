import { useEffect, useRef, type ReactNode } from 'react';
import { Button, State } from './ui';
import { useReducedMotion } from '../lib/motion';

/** Keep the current view mounted while filters load, then reveal the new data. */
export function TransitionState({
  data,
  loading,
  error,
  retry,
  transitionKey,
  children,
}: {
  data: unknown;
  loading?: boolean;
  error?: string;
  retry?: () => void;
  transitionKey?: string;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const hasData = data != null;
  useEffect(() => {
    if (!content.current || loading || error || reducedMotion || !hasData) return;
    const animation = content.current.animate(
      [
        { opacity: 0.65, transform: 'translateY(3px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' },
    );
    return () => animation.cancel();
  }, [data, loading, error, hasData, transitionKey, reducedMotion]);
  if (!hasData)
    return (
      <State loading={loading} error={error} retry={retry}>
        {children}
      </State>
    );
  return (
    <div className="transition-state" aria-busy={!!loading} data-refreshing={!!loading}>
      {loading && (
        <span className="update-status" role="status">
          Memperbarui data…
        </span>
      )}
      {error && (
        <div className="refresh-error" role="alert">
          <span>{error} Data sebelumnya masih ditampilkan.</span>
          {retry && (
            <Button variant="secondary" onClick={retry}>
              Coba lagi
            </Button>
          )}
        </div>
      )}
      <div
        ref={content}
        inert={loading || undefined}
        className={`transition-body${loading ? ' is-updating' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
