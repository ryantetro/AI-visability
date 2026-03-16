import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Bot,
  ChartNoAxesColumn,
  CreditCard,
  Eye,
  FileCode2,
  GitBranch,
  Globe2,
  Layers3,
  Mail,
  MonitorSmartphone,
  Route,
  Share2,
  Sparkles,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'UI / UX Flow Atlas | AISO',
  description:
    'Visual product documentation for the current AISO application flow, routes, states, and conversion path.',
};

const entryVariants = [
  {
    route: '/',
    name: 'Landing A',
    style: 'Primary marketing story',
    notes: 'Hero-led landing with explainer sections, FAQ, repeated CTAs, and large footer.',
  },
  {
    route: '/landing/b',
    name: 'Landing B',
    style: 'Dark tool-forward variant',
    notes: 'More performance-marketing framing, score preview, and stronger package language.',
  },
  {
    route: '/landing/c',
    name: 'Landing C',
    style: 'Minimal editorial variant',
    notes: 'Text-first version focused on clarity, ROI, and lightweight framing.',
  },
] as const;

const shellShifts = [
  {
    label: 'Marketing shell',
    detail: 'Floating header + sticky footer only appear on landing variants.',
  },
  {
    label: 'Audit shell',
    detail: 'Scan and report pages switch to a focused application workspace with tabs and progress states.',
  },
  {
    label: 'Delivery shell',
    detail: 'Dashboard becomes a darker operations-style implementation workspace for copying, downloading, and deploying files.',
  },
] as const;

const primaryFlow = [
  {
    route: '/, /landing/b, /landing/c',
    title: 'Entry + Qualification',
    shell: 'Marketing shell',
    action: 'User enters a URL and starts a free scan.',
    output: 'Creates a scan job and routes to /scan/[id].',
  },
  {
    route: '/scan/[id]',
    title: 'Live Audit Pipeline',
    shell: 'Audit shell',
    action: 'The app shows loading, crawl progress, and failure handling.',
    output: 'Ends in either a failed audit or a completed score reveal.',
  },
  {
    route: '/scan/[id]',
    title: 'Score Reveal + Email Gate',
    shell: 'Audit shell',
    action: 'User sees score band and enters email to unlock the full report.',
    output: 'Email is stored and the detailed report loads.',
  },
  {
    route: '/scan/[id]#overview',
    title: 'Full Report Workspace',
    shell: 'Audit shell',
    action: 'User explores overview, repair queue, breakdown, and share tabs.',
    output: 'The report drives either sharing or package purchase.',
  },
  {
    route: '/checkout/[sessionId]',
    title: 'Mock Checkout',
    shell: 'Conversion screen',
    action: 'User confirms the $35 package through a simulated payment step.',
    output: 'Marks the scan as paid and unlocks file delivery.',
  },
  {
    route: '/dashboard/[id]',
    title: 'Deployment Dashboard',
    shell: 'Delivery shell',
    action: 'User copies prompts, downloads files, grabs the ZIP, or re-audits.',
    output: 'Deployment-ready implementation assets for the audited site.',
  },
] as const;

const scanStates = [
  {
    name: 'Loading',
    detail: 'Initial fetch for scan data while the route mounts.',
  },
  {
    name: 'Live pipeline',
    detail: 'Checklist-driven crawl + scoring progress with percent complete and current step.',
  },
  {
    name: 'Failed audit',
    detail: 'Recovery state with error message, re-audit button, and return-home path.',
  },
  {
    name: 'Gated reveal',
    detail: 'Completed score is shown, but the detailed report is locked behind email submission.',
  },
  {
    name: 'Unlocked report',
    detail: 'Tabs, fix queue, share tools, sticky CTA, and paid/unpaid branching all activate.',
  },
] as const;

const reportTabs = [
  {
    name: 'Overview',
    detail: 'Top-line numbers, potential lift, Web Health summary, and full implementation brief copy action.',
  },
  {
    name: 'Repair Queue',
    detail: 'Top prioritized fixes across AI Visibility and Web Health with effort, ROI, and per-fix prompts.',
  },
  {
    name: 'Breakdown',
    detail: 'Expandable dimension cards for the six AI categories plus Web Health pillars.',
  },
  {
    name: 'Share',
    detail: 'Public score link, social share actions, and the bridge into checkout or dashboard.',
  },
] as const;

const sideBranches = [
  {
    title: 'Public score card',
    route: '/score/[id]',
    description:
      'A lightweight public-facing summary page that exposes score, band, completion date, and a CTA back to the main audit flow.',
  },
  {
    title: 'Success handoff',
    route: '/checkout/success',
    description:
      'Post-payment confirmation page that does one job well: move the user into the deployment dashboard.',
  },
  {
    title: 'Support + legal',
    route: '/terms, /privacy, /404',
    description:
      'Minimal utility pages that complete the experience without adding new product actions.',
  },
] as const;

const deliveryAssets = [
  {
    name: 'llms.txt',
    role: 'AI guidance layer for LLM agents.',
  },
  {
    name: 'robots.txt',
    role: 'Crawler access policy including AI bot directives.',
  },
  {
    name: 'organization-schema.json',
    role: 'Homepage JSON-LD entity definition.',
  },
  {
    name: 'sitemap.xml',
    role: 'Discovery map for crawlable canonical URLs.',
  },
] as const;

const routeAtlas = [
  {
    stage: 'Acquisition',
    icon: Globe2,
    routes: [
      '/, /landing/b, /landing/c',
      '/styleguide/landing-mockups',
    ],
    summary:
      'Marketing variants and internal design references that explain the product and start scans.',
  },
  {
    stage: 'Audit',
    icon: Route,
    routes: [
      '/scan/[id]',
      '/api/scan',
      '/api/scan/[id]',
      '/api/scan/[id]/email',
      '/api/scan/[id]/report',
    ],
    summary:
      'The core scoring flow: create scan, poll progress, unlock detailed report, and reveal prioritized fixes.',
  },
  {
    stage: 'Share',
    icon: Share2,
    routes: [
      '/score/[id]',
      '/score/[id]/opengraph-image',
    ],
    summary:
      'Public-facing score sharing for stakeholders and social handoff.',
  },
  {
    stage: 'Conversion',
    icon: CreditCard,
    routes: [
      '/checkout/[id]',
      '/checkout/success',
      '/api/checkout',
      '/api/checkout/verify',
    ],
    summary:
      'The mock payment layer that converts an unlocked report into a paid implementation package.',
  },
  {
    stage: 'Delivery',
    icon: FileCode2,
    routes: [
      '/dashboard/[id]',
      '/api/scan/[id]/files',
      '/api/scan/[id]/files/archive',
    ],
    summary:
      'File generation, prompt-copy workflows, direct downloads, and verification/deployment guidance.',
  },
] as const;

const uxSeams = [
  'Landing header links point to /login and /audit, but those routes do not exist yet.',
  'Header anchor links reference #how-it-works, #pricing, and #resources, but those section ids are not currently present.',
  'Most footer, social, company, and resource links are placeholders.',
  'The three landing variants disagree on which version is marked as “current.”',
  'Checkout is mocked, and scan persistence is in-memory, so state can disappear on app restart.',
] as const;

const productSummary = [
  {
    label: '3',
    caption: 'marketing entry variants',
  },
  {
    label: '1',
    caption: 'core scan route with 5 visible states',
  },
  {
    label: '4',
    caption: 'report tabs after email unlock',
  },
  {
    label: '$35',
    caption: 'single paid conversion package',
  },
  {
    label: '4',
    caption: 'deployment files in the dashboard',
  },
] as const;

export default function UiUxFlowPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-[var(--text-primary)]">
      <div className="relative overflow-hidden border-b border-[var(--border-default)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-[var(--color-primary-500)]/10 blur-3xl" />
          <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-[var(--color-accent-500)]/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--border-default) 1px, transparent 1px), linear-gradient(to bottom, var(--border-default) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)] dark:bg-white/5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                UI / UX Flow Atlas
              </p>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                A visual map of how the entire AISO product currently works.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                This is a product-facing snapshot of the live application as mapped from the current codebase on
                {' '}
                <strong>March 12, 2026</strong>
                . It shows the user journey, route inventory, screen states, branching logic, and delivery handoff.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {productSummary.map((item) => (
                  <MetricTile key={item.caption} label={item.label} caption={item.caption} />
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[var(--border-default)] bg-white/80 p-6 shadow-[var(--shadow-lg)] dark:bg-white/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Flow snapshot
              </p>
              <div className="mt-5 space-y-4">
                <SnapshotRow
                  icon={MonitorSmartphone}
                  label="Entry"
                  value="Landing A, B, or C"
                />
                <SnapshotRow
                  icon={ChartNoAxesColumn}
                  label="Audit"
                  value="Scan route with progress, reveal, and report tabs"
                />
                <SnapshotRow
                  icon={Mail}
                  label="Gate"
                  value="Email unlock before full report"
                />
                <SnapshotRow
                  icon={CreditCard}
                  label="Conversion"
                  value="Mock $35 checkout into paid package"
                />
                <SnapshotRow
                  icon={FileCode2}
                  label="Delivery"
                  value="Deployment dashboard with prompts, files, and ZIP"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-[var(--border-default)] bg-white/75 p-6 shadow-[var(--shadow-md)] dark:bg-white/[0.03]">
          <SectionHeader
            eyebrow="Whole-product diagram"
            title="Primary UI / UX flow"
            description="This is the main user journey from first touch through delivery."
          />

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-stretch">
            {primaryFlow.map((step, index) => (
              <FlowFragment
                key={step.title}
                index={index + 1}
                isLast={index === primaryFlow.length - 1}
                {...step}
              />
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--surface-page)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Report workspace branches
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {reportTabs.map((tab) => (
                  <MiniCard key={tab.name} title={tab.name} detail={tab.detail} />
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--surface-page)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Side branches
              </p>
              <div className="mt-4 space-y-3">
                {sideBranches.map((branch) => (
                  <BranchCard
                    key={branch.title}
                    route={branch.route}
                    title={branch.title}
                    description={branch.description}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-10 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-[var(--border-default)] bg-white/75 p-6 shadow-[var(--shadow-md)] dark:bg-white/[0.03]">
            <SectionHeader
              eyebrow="Entry points"
              title="Marketing variants feeding the same funnel"
              description="All three landing experiences ultimately hand the user into the same scan route."
            />
            <div className="mt-6 space-y-3">
              {entryVariants.map((variant) => (
                <VariantCard
                  key={variant.route}
                  route={variant.route}
                  name={variant.name}
                  style={variant.style}
                  notes={variant.notes}
                />
              ))}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--surface-page)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Shell shifts
              </p>
              <div className="mt-4 space-y-3">
                {shellShifts.map((shell) => (
                  <MiniCard key={shell.label} title={shell.label} detail={shell.detail} />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[var(--border-default)] bg-white/75 p-6 shadow-[var(--shadow-md)] dark:bg-white/[0.03]">
            <SectionHeader
              eyebrow="Scan route anatomy"
              title="Visible states inside /scan/[id]"
              description="The scan page does the most work in the product: progress, gating, reporting, branching, and conversion."
            />
            <div className="mt-6 space-y-4">
              {scanStates.map((state, index) => (
                <StateRow
                  key={state.name}
                  index={index + 1}
                  name={state.name}
                  detail={state.detail}
                />
              ))}
            </div>
          </section>
        </div>

        <section className="mt-10 rounded-[2rem] border border-[var(--border-default)] bg-white/75 p-6 shadow-[var(--shadow-md)] dark:bg-white/[0.03]">
          <SectionHeader
            eyebrow="Route atlas"
            title="Current route inventory by stage"
            description="A route-level grouping of the live product surface."
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-5">
            {routeAtlas.map((group) => (
              <RouteAtlasCard
                key={group.stage}
                icon={group.icon}
                stage={group.stage}
                routes={group.routes}
                summary={group.summary}
              />
            ))}
          </div>
        </section>

        <div className="mt-10 grid gap-10 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-[2rem] border border-[var(--border-default)] bg-white/75 p-6 shadow-[var(--shadow-md)] dark:bg-white/[0.03]">
            <SectionHeader
              eyebrow="Delivery layer"
              title="What the paid dashboard actually delivers"
              description="The dashboard is less a report page and more an implementation handoff system."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {deliveryAssets.map((asset) => (
                <AssetCard key={asset.name} name={asset.name} role={asset.role} />
              ))}
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--surface-page)] p-5">
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                The dashboard combines four layers into one screen: generated files, install guidance, verification URLs,
                and “copy to Cursor / copy to LLM” implementation prompts. That makes it the operational endpoint of the product.
              </p>
            </div>
          </section>

          <section
            className="rounded-[2rem] border border-[rgba(220,38,38,0.18)] p-6 shadow-[var(--shadow-md)]"
            style={{
              background:
                'linear-gradient(180deg, rgba(254, 242, 242, 0.9), rgba(255, 255, 255, 0.78))',
            }}
          >
            <SectionHeader
              eyebrow="Current seams"
              title="Known UX rough edges in the current build"
              description="These are the biggest mismatches between the intended journey and the shipped experience."
            />
            <div className="mt-6 space-y-3">
              {uxSeams.map((item) => (
                <SeamCard key={item} detail={item} />
              ))}
            </div>
          </section>
        </div>

        <section className="mt-10 rounded-[2rem] border border-[var(--border-default)] bg-[var(--color-neutral-950)] p-6 text-white shadow-[var(--shadow-lg)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-neutral-400)]">
                Deliverables
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                You now have both a visual atlas and a portable product doc.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-neutral-300)]">
                Use this page for quick walkthroughs and use the Markdown doc when you want something easy to share, paste into planning docs, or convert into a PDF later.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/ui-ux-flow"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-600)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-700)]"
              >
                <Eye className="h-4 w-4" />
                Refresh this atlas
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-[var(--color-neutral-200)]">
                <Layers3 className="h-4 w-4" />
                docs/ui-ux-flow.md
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function MetricTile({
  label,
  caption,
}: {
  label: string;
  caption: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border-default)] bg-white/75 px-4 py-4 shadow-[var(--shadow-sm)] dark:bg-white/[0.04]">
      <p className="text-2xl font-semibold tracking-tight text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]">
        {label}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        {caption}
      </p>
    </div>
  );
}

function SnapshotRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1.25rem] border border-[var(--border-default)] bg-[var(--surface-page)] px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-500)]/10">
        <Icon className="h-4 w-4 text-[var(--color-primary-600)]" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {label}
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-primary)]">
          {value}
        </p>
      </div>
    </div>
  );
}

function FlowFragment({
  index,
  route,
  title,
  shell,
  action,
  output,
  isLast,
}: {
  index: number;
  route: string;
  title: string;
  shell: string;
  action: string;
  output: string;
  isLast: boolean;
}) {
  return (
    <>
      <FlowNode
        index={index}
        route={route}
        title={title}
        shell={shell}
        action={action}
        output={output}
      />
      {!isLast && <FlowConnector />}
    </>
  );
}

function FlowNode({
  index,
  route,
  title,
  shell,
  action,
  output,
}: {
  index: number;
  route: string;
  title: string;
  shell: string;
  action: string;
  output: string;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-[1.6rem] border border-[var(--border-default)] bg-[var(--surface-page)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-sm font-semibold text-white">
          {index}
        </div>
        <span className="rounded-full border border-[var(--border-default)] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:bg-white/[0.04]">
          {shell}
        </span>
      </div>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {route}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
        {action}
      </p>
      <div className="mt-4 rounded-[1.1rem] border border-[var(--border-default)] bg-white/80 px-4 py-3 text-sm leading-6 text-[var(--text-primary)] dark:bg-white/[0.04]">
        {output}
      </div>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex items-center justify-center lg:w-10">
      <div className="flex items-center gap-2 rounded-full border border-dashed border-[var(--border-default)] bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] dark:bg-white/[0.04]">
        <ArrowDown className="h-3.5 w-3.5 lg:hidden" />
        <ArrowRight className="hidden h-3.5 w-3.5 lg:block" />
        Then
      </div>
    </div>
  );
}

function MiniCard({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--border-default)] bg-white/80 p-4 dark:bg-white/[0.04]">
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {detail}
      </p>
    </div>
  );
}

function BranchCard({
  route,
  title,
  description,
}: {
  route: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--border-default)] bg-white/80 p-4 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        <GitBranch className="h-3.5 w-3.5" />
        {route}
      </div>
      <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function VariantCard({
  route,
  name,
  style,
  notes,
}: {
  route: string;
  name: string;
  style: string;
  notes: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-[var(--border-default)] bg-[var(--surface-page)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {route}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">
            {name}
          </h3>
        </div>
        <span className="rounded-full border border-[var(--border-default)] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] dark:bg-white/[0.04]">
          {style}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
        {notes}
      </p>
    </div>
  );
}

function StateRow({
  index,
  name,
  detail,
}: {
  index: number;
  name: string;
  detail: string;
}) {
  return (
    <div className="flex gap-4 rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--surface-page)] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[var(--color-primary-700)] shadow-[var(--shadow-sm)] dark:bg-white/[0.07] dark:text-[var(--color-primary-300)]">
        {index}
      </div>
      <div>
        <p className="text-lg font-semibold tracking-tight">
          {name}
        </p>
        <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
          {detail}
        </p>
      </div>
    </div>
  );
}

function RouteAtlasCard({
  icon: Icon,
  stage,
  routes,
  summary,
}: {
  icon: typeof Sparkles;
  stage: string;
  routes: readonly string[];
  summary: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--surface-page)] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary-500)]/10">
          <Icon className="h-5 w-5 text-[var(--color-primary-600)]" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Stage
          </p>
          <h3 className="text-lg font-semibold tracking-tight">
            {stage}
          </h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {summary}
      </p>
      <div className="mt-4 space-y-2">
        {routes.map((route) => (
          <div
            key={route}
            className="rounded-xl border border-[var(--border-default)] bg-white/80 px-3 py-2 font-mono text-[12px] text-[var(--text-secondary)] dark:bg-white/[0.04]"
          >
            {route}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetCard({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  return (
    <div className="rounded-[1.3rem] border border-[var(--border-default)] bg-[var(--surface-page)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-500)]/10">
          <Bot className="h-4 w-4 text-[var(--color-primary-600)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {name}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {role}
          </p>
        </div>
      </div>
    </div>
  );
}

function SeamCard({
  detail,
}: {
  detail: string;
}) {
  return (
    <div className="flex gap-4 rounded-[1.35rem] border border-[rgba(220,38,38,0.16)] bg-white/80 p-4 dark:bg-black/10">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(220,38,38,0.1)]">
        <AlertTriangle className="h-4 w-4 text-[var(--color-error)]" />
      </div>
      <p className="text-sm leading-7 text-[var(--text-primary)]">
        {detail}
      </p>
    </div>
  );
}
