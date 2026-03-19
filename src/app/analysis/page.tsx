import { Suspense } from 'react';
import { AnalysisPageContent } from './analysis-client';

export default function AnalysisPage() {
    return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-lg font-medium text-white">Loading...</div>
            </div>
      }
    >
      <AnalysisPageContent />
    </Suspense>
  );
}
