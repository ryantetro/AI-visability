import { redirect } from 'next/navigation';

export default async function LegacyDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/advanced?report=${id}`);
}
