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
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-lg font-medium text-white">Loading...</div>
        </div>
      }
    >
      <AdvancedPageContent reportId={reportId} />
    </Suspense>
  );
}
