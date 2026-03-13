'use client';

import { useState } from 'react';
import {
  FileText,
  Image,
  Link2,
  MessageCircle,
  Type,
} from 'lucide-react';
import { AppShellNav } from '@/components/app/app-shell-nav';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { useImageUpload } from '@/hooks/use-image-upload';
import { cn } from '@/lib/utils';

const TITLE_MAX = 20;
const DESC_MAX = 55;

export default function FeaturedPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const logoUpload = useImageUpload();
  const logoPreview = logoUpload.previewUrl;

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <AppShellNav active="leaderboard" actionHref="/analysis" actionLabel="New scan" />
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-xl">
          <h1 className="text-center text-[2rem] font-bold tracking-tight text-[var(--text-primary)]">
            Featured Spot
          </h1>
          <p className="mx-auto mt-2 text-center text-[15px] text-[var(--text-muted)]">
            Buy your Featured Spot and get listed on the landing page and in the leaderboard
          </p>

          <div className="mt-6 text-center">
            <span className="text-4xl font-bold text-[var(--text-primary)]">$25</span>
            <span className="ml-1 text-lg text-[var(--text-muted)]">/month</span>
          </div>

          <div className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Spot Details</h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Add a title, short description, and your logo. Once saved, you can purchase a featured placement and we&apos;ll link it automatically.
            </p>

            <div className="mt-6 space-y-5">
              {/* Title */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
                  <Type className="h-4 w-4 text-[var(--text-muted)]" />
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  placeholder="e.g. YourWebsiteScore"
                  className="mt-2 border-white/10 bg-white/[0.03] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-white/20"
                />
                <div className="mt-1 flex justify-between text-[12px] text-[var(--text-muted)]">
                  <span>Keep it short and catchy</span>
                  <span>{title.length}/{TITLE_MAX}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
                  <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                  placeholder="A short pitch that will appear next to your logo."
                  rows={3}
                  className="mt-2 w-full resize-none rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                />
                <div className="mt-1 flex justify-between text-[12px] text-[var(--text-muted)]">
                  <span>Brief description of your offering</span>
                  <span>{description.length}/{DESC_MAX}</span>
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
                  <Link2 className="h-4 w-4 text-[var(--text-muted)]" />
                  URL
                </label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  className="mt-2 border-white/10 bg-white/[0.03] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-white/20"
                />
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                  Where your featured spot should link to
                </p>
              </div>

              {/* Logo */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
                  <Image className="h-4 w-4 text-[var(--text-muted)]" />
                  Logo
                </label>
                <div className="mt-2">
                  <ImageUpload hook={logoUpload} compact />
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-[13px] font-medium text-[var(--text-primary)]">Preview</h3>
                <div className="mt-2 flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] p-6">
                  {title || description || logoPreview ? (
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <img src={logoPreview} alt="" className="h-14 w-14 rounded-lg object-contain" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/5">
                          <Image className="h-6 w-6 text-[var(--text-muted)]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text-primary)]">
                          {title || 'Your title'}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                          {description || 'Your description'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Image className="h-8 w-8 text-[var(--text-muted)]" />
                      <span className="text-[13px] text-[var(--text-muted)]">
                        Fill in the fields above to see a preview
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                className={cn(
                  'w-full rounded-lg py-3 text-[15px] font-semibold transition-colors',
                  'bg-white/[0.08] text-[var(--text-primary)] hover:bg-white/[0.12]'
                )}
              >
                Buy Featured Spot
              </button>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="fixed right-6 bottom-6 z-20 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#202020] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <MessageCircle className="h-4 w-4" />
          Feedback
        </button>
      </div>
    </div>
  );
}
