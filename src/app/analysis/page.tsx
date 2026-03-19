import { redirect } from 'next/navigation';

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reportId = typeof params.report === 'string'
    ? params.report
    : typeof params.scan === 'string'
      ? params.scan
      : null;

  if (reportId) {
    redirect(`/report?report=${reportId}`);
  }

  redirect('/dashboard');
}
