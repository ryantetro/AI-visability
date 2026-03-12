'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="aiso-page app-page flex min-h-screen items-center justify-center">
      <div className="aiso-card flex max-w-xl flex-col items-center gap-4 px-8 py-10 text-center">
        <p className="aiso-kicker">Application Error</p>
        <h1 className="app-h3 font-bold" style={{ color: 'var(--color-error)' }}>Something went wrong</h1>
        <p className="app-body mt-2" style={{ color: 'var(--text-tertiary)' }}>{error.message}</p>
        <button
          onClick={reset}
          className="aiso-button aiso-button-primary mt-2 px-5 py-3 text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
