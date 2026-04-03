import { redirect } from 'next/navigation';
import { buildBrandHref, resolveBrandSection } from '@/lib/brand-navigation';

export default async function BrandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reportId = typeof params.report === 'string' ? params.report : null;
  const legacyTab = typeof params.tab === 'string' ? params.tab : null;

  redirect(buildBrandHref(resolveBrandSection(legacyTab), reportId));
}
