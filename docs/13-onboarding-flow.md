# Onboarding Flow

Guided onboarding system that tracks setup progress and nudges users through the initial setup steps.

## Key Files

| File | Role |
|------|------|
| `src/hooks/use-onboarding.ts` | Core hook — derives completion state from existing context |
| `src/components/app/onboarding-checklist.tsx` | Dashboard checklist widget |
| `src/components/app/next-steps-card.tsx` | Contextual nudge cards below KPI row |
| `src/components/app/workspace-shell.tsx` | Enhanced NoDomainState welcome flow |
| `src/components/app/dashboard-sidebar.tsx` | Sidebar progress indicator |
| `src/app/report/page.tsx` | Marks "review report" step complete + shows tracking nudge |
| `src/app/advanced/settings/settings-section.tsx` | Marks "tracking installed" step on key generation |

## How It Works

### Derived State Architecture

Almost all onboarding steps are computed from data already available in `DomainContext` and `usePlan`. Only 2 flags use localStorage:

- `aiso_onboarding_report_viewed` — set when user visits /report with data
- `aiso_onboarding_tracking_installed` — set when user generates a tracking key

A third localStorage key `aiso_onboarding_dismissed` lets users permanently hide the checklist.

### Steps

| # | Step | Completed When |
|---|------|---------------|
| 1 | Add your first domain | `monitoredSites.length > 0` |
| 2 | Run your first scan | `expandedSite?.latestScan?.status === 'complete'` |
| 3 | Review your report | localStorage flag OR report exists in context |
| 4 | Install tracking script | localStorage flag |
| 5 | Enable monitoring | `monitoringConnected[selectedDomain] === true` |

### Components

- **OnboardingChecklist**: Shown at top of dashboard. Displays progress bar + step list with check/circle icons. Links each step to its relevant page. Dismiss button hides permanently.
- **NextStepsCard**: Row of action cards shown below KPI cards. Only shows cards for incomplete steps.
- **SidebarOnboardingProgress**: Compact circular progress ring + text in sidebar between domain list and nav items.
- **NoDomainState**: Enhanced with "Welcome to AISO" header and 3-step visual flow guide.
- **Report nudge**: Card at bottom of report page suggesting tracking script installation.

## Configuration

No env vars or feature flags. No database changes. All state is derived from existing context or stored in localStorage.

## Error Handling

The `useOnboarding` hook gracefully handles missing context (no domain selected, no scan data). Sidebar progress indicator wraps the hook call in try/catch for routes where DomainContext isn't available.
