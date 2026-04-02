"use client";

import React from 'react';
import { LayoutDashboard, LogIn, MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { AisoBrand } from '@/components/ui/aiso-brand';

export function FloatingHeader() {
  const [open, setOpen] = React.useState(false);
  const { user, loading } = useAuth();

  const links = [
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'Resources', href: '/#resources' },
  ];

  const linkClass =
    'rounded-lg px-3 text-[13px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-900';

  return (
    <header
      className={cn(
        'relative z-50 mx-4 w-full max-w-3xl rounded-2xl border border-gray-200/90',
        'bg-white/90 supports-[backdrop-filter]:bg-white/80 backdrop-blur-xl backdrop-saturate-150',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_28px_rgba(0,0,0,0.08)]'
      )}
    >
      <nav className="flex items-center justify-between px-2 py-1.5 sm:px-3">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors duration-150 hover:bg-gray-100"
        >
          <AisoBrand textClassName="tracking-[-0.01em] text-gray-900" wordmarkVariant="dark" />
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: cn(linkClass, 'h-8') })}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-1.5 sm:flex">
          {!loading && (
            user ? (
              <Button
                size="sm"
                className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-3.5 text-[13px] font-semibold text-gray-900 transition-all duration-150 hover:bg-gray-100"
                asChild
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" className={cn(linkClass, 'h-8')} asChild>
                  <Link href="/login">
                    <LogIn className="mr-1.5 h-3.5 w-3.5" />
                    Sign In
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] px-3.5 text-[13px] font-semibold text-white shadow-sm transition-all duration-150 hover:opacity-95"
                  asChild
                >
                  <Link href="/#scan">Get Started</Link>
                </Button>
              </>
            )
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setOpen(!open)}
            className="h-8 w-8 rounded-lg border-gray-200 bg-white text-gray-800 hover:bg-gray-50 sm:hidden"
          >
            <MenuIcon className="size-4" />
          </Button>
          <SheetContent className="gap-0 border-gray-200 bg-white" showClose={false} side="left">
            <div className="flex items-center gap-2.5 px-6 pb-4 pt-8">
              <AisoBrand textClassName="tracking-[-0.01em] text-gray-900" wordmarkVariant="dark" />
            </div>
            <div className="grid gap-y-1 overflow-y-auto px-4 pb-5 pt-4">
              {links.map((link) => (
                <Link
                  key={link.label}
                  className={buttonVariants({
                    variant: 'ghost',
                    className:
                      'h-12 justify-start rounded-lg text-[15px] font-semibold text-gray-800 hover:bg-gray-100 hover:text-gray-900',
                  })}
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <SheetFooter className="flex-col gap-3 px-4 pb-8 sm:flex-col">
              {user ? (
                <Button
                  className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 font-semibold text-gray-900 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                  asChild
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-lg border-gray-200 font-semibold text-gray-800 hover:bg-gray-50"
                    onClick={() => setOpen(false)}
                    asChild
                  >
                    <Link href="/login">
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </Link>
                  </Button>
                  <Button
                    className="h-11 w-full rounded-lg border-0 bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] font-semibold text-white shadow-sm hover:opacity-95"
                    onClick={() => setOpen(false)}
                    asChild
                  >
                    <Link href="/#scan">Get Started</Link>
                  </Button>
                </>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
