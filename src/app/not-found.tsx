import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="aiso-page app-page flex min-h-screen items-center justify-center">
      <div className="aiso-card flex max-w-xl flex-col items-center gap-4 px-8 py-10 text-center">
        <p className="aiso-kicker">Missing Page</p>
        <h1 className="app-h1 font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>404</h1>
        <p className="app-body mt-2" style={{ color: 'var(--text-tertiary)' }}>Page not found</p>
        <Link href="/" className="aiso-button aiso-button-primary mt-2 px-5 py-3 text-sm">
          Go home
        </Link>
      </div>
    </div>
  );
}
