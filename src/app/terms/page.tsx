import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | airadr',
  description: 'Terms covering site audits, generated digital deliverables, and use of the airadr platform.',
};

export default function TermsPage() {
  return (
    <div className="aiso-page app-page aiso-shell app-shell-compact min-h-screen max-w-4xl py-16">
      <div className="aiso-card p-8 sm:p-10">
        <p className="aiso-kicker">
          Legal
        </p>
        <h1 className="app-h1 mt-3 font-bold" style={{ color: 'var(--text-primary)' }}>Terms of Service</h1>
        <div className="app-body mt-8 space-y-6" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>Authority to Audit</h2>
            <p className="mt-2">
              By submitting a website to airadr, you represent that you own, operate, or are authorized to request an audit for that site.
            </p>
          </section>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>Audit Limitations</h2>
            <p className="mt-2">
              Crawl results depend on the target site&apos;s availability, bot protections, platform restrictions, and technical configuration. We do not guarantee a complete crawl for every site.
            </p>
          </section>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>No Ranking Guarantee</h2>
            <p className="mt-2">
              airadr provides diagnostic scores, recommendations, and generated implementation files. We do not guarantee placement, traffic, visibility, ranking, or citation outcomes in AI search products.
            </p>
          </section>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>Mock Checkout and Digital Delivery</h2>
            <p className="mt-2">
              The current checkout flow is a mock implementation for product validation. Generated files are digital deliverables produced immediately after a successful mock payment state.
            </p>
          </section>
          <section>
            <h2 className="app-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>Generated Files</h2>
            <p className="mt-2">
              You are responsible for reviewing, testing, and deploying any generated files before publishing them to a production website.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
