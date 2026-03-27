import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | airadr',
  description: 'Privacy information covering submitted URLs, emails, generated files, and temporary crawl storage in airadr.',
};

export default function PrivacyPage() {
  return (
    <div className="aiso-page app-page aiso-shell app-shell-compact min-h-screen max-w-4xl py-16">
      <div className="aiso-card p-8 sm:p-10">
        <p className="aiso-kicker">
          Legal
        </p>
        <h1 className="app-h1 mt-3 font-bold" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h1>
        <div className="app-body mt-8 space-y-6" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>What We Collect</h2>
            <p className="mt-2">
              We collect submitted website URLs, crawl results, generated fix files, and any email address you provide to unlock a report.
            </p>
          </section>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>How Crawl Data Is Used</h2>
            <p className="mt-2">
              Crawl output is used to calculate an AI visibility score, generate recommendations, and prepare downloadable implementation files for the audited site.
            </p>
          </section>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>Temporary Storage</h2>
            <p className="mt-2">
              This MVP currently uses temporary in-memory storage for scans and generated files. Data may reset when the application restarts.
            </p>
          </section>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>Email Usage</h2>
            <p className="mt-2">
              Email addresses are used to unlock reports and support follow-up product workflows. This MVP does not yet include a production email preference center.
            </p>
          </section>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>Deletion Requests</h2>
            <p className="mt-2">
              For now, contact the site operator directly to request removal of stored scan data or email information. A self-service deletion flow is planned for a future release.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
