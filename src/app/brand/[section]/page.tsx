import { notFound } from 'next/navigation';
import { isBrandSectionKey } from '@/lib/brand-navigation';
import { BrandWorkspaceSectionClient } from './brand-workspace-section-client';

export default async function BrandWorkspaceSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!isBrandSectionKey(section)) {
    notFound();
  }

  return <BrandWorkspaceSectionClient section={section} />;
}
