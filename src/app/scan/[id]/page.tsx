import { notFound, redirect } from 'next/navigation';
import { getDatabase } from '@/lib/services/registry';

export default async function LegacyScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scan = await getDatabase().getScan(id);

  if (!scan) {
    notFound();
  }

  if (scan.email && scan.status === 'complete') {
    redirect(`/analysis?report=${id}`);
  }

  redirect(`/analysis?scan=${id}`);
}
