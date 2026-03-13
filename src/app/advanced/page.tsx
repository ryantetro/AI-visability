import { Suspense } from 'react';
import { AdvancedPageContent } from './advanced-client';

export default async function AdvancedPage({
  searchParams,
}: {
  searchParams?: Promise<{ report?: string } | undefined>;
}) {
  let reportId: string | null = null;
  try {
    const params = searchParams ? await searchParams : undefined;
    reportId = params?.report ?? null;
  } catch (err) {
    console.error('[Advanced] searchParams error:', err);
  }

  return (
    <div className="min-h-screen bg-[#060606]">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-lg font-medium text-white">Loading...</div>
          </div>
        }
      >
        <AdvancedPageContent reportId={reportId} />
      </Suspense>
    </div>
  );
}
