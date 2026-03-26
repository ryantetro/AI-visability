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

    return (
        <header
            className={cn(
                'relative z-50 w-full max-w-3xl rounded-2xl border mx-4',
                'bg-[rgba(8,8,10,0.65)] supports-[backdrop-filter]:bg-[rgba(8,8,10,0.45)] backdrop-blur-2xl backdrop-saturate-150',
                'border-[rgba(255,255,255,0.06)]',
                'shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_32px_rgba(0,0,0,0.2)]'
            )}
        >
            <nav className="flex items-center justify-between px-2 py-1.5 sm:px-3">
                {/* Logo Section */}
                <Link href="/" className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]">
                    <AisoBrand textClassName="tracking-[-0.01em] text-white/90" />
                </Link>

                {/* Desktop Links */}
                <div className="hidden items-center gap-0.5 lg:flex">
                    {links.map((link) => (
                        <Link
                            key={link.label}
                            className={buttonVariants({ variant: 'ghost', size: 'sm', className: "rounded-lg hover:bg-[rgba(255,255,255,0.05)] hover:text-white/95 text-white/50 text-[13px] font-medium transition-colors duration-150 px-3" })}
                            href={link.href}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Desktop CTAs — auth-aware */}
                <div className="hidden items-center gap-1.5 sm:flex">
                    {!loading && (
                        user ? (
                            <Button size="sm" className="rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/90 text-[13px] font-medium border border-white/[0.06] h-8 px-3.5 transition-all duration-150" asChild>
                                <Link href="/dashboard">
                                    <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                                    Dashboard
                                </Link>
                            </Button>
                        ) : (
                            <>
                                <Button size="sm" variant="ghost" className="rounded-lg hover:bg-[rgba(255,255,255,0.05)] hover:text-white/95 text-white/50 text-[13px] font-medium h-8" asChild>
                                    <Link href="/login">
                                        <LogIn className="mr-1.5 h-3.5 w-3.5" />
                                        Sign In
                                    </Link>
                                </Button>
                                <Button size="sm" className="rounded-lg bg-gradient-to-r from-[var(--color-primary-400)] to-[var(--color-primary-500)] hover:opacity-90 text-white text-[13px] font-medium h-8 px-3.5 transition-all duration-150 shadow-[0_0_12px_rgba(53,109,244,0.2)]" asChild>
                                    <Link href="/#scan">Get Started</Link>
                                </Button>
                            </>
                        )
                    )}
                </div>

                {/* Mobile hamburger */}
                <Sheet open={open} onOpenChange={setOpen}>
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setOpen(!open)}
                        className="sm:hidden rounded-lg h-8 w-8 bg-transparent border-[rgba(255,255,255,0.08)] text-white/70 hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
                    >
                        <MenuIcon className="size-4" />
                    </Button>
                    <SheetContent
                        className="bg-[rgba(8,8,10,0.95)] supports-[backdrop-filter]:bg-[rgba(8,8,10,0.85)] gap-0 backdrop-blur-2xl border-[rgba(255,255,255,0.06)]"
                        showClose={false}
                        side="left"
                    >
                        <div className="flex items-center gap-2.5 px-6 pt-8 pb-4">
                            <AisoBrand textClassName="tracking-[-0.01em] text-white/90" />
                        </div>
                        <div className="grid gap-y-1 overflow-y-auto px-4 pt-4 pb-5">
                            {links.map((link) => (
                                <Link
                                    key={link.label}
                                    className={buttonVariants({
                                        variant: 'ghost',
                                        className: 'justify-start rounded-lg text-white/50 hover:text-white/90 hover:bg-[rgba(255,255,255,0.05)] text-[15px] h-12',
                                    })}
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                        <SheetFooter className="px-4 pb-8 flex-col gap-3 sm:flex-col">
                            {user ? (
                                <Button className="w-full rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/90 border border-white/[0.06] h-11" onClick={() => setOpen(false)} asChild>
                                    <Link href="/dashboard">
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button variant="outline" className="w-full rounded-lg border-[rgba(255,255,255,0.08)] text-white/80 hover:bg-[rgba(255,255,255,0.05)] h-11" onClick={() => setOpen(false)} asChild>
                                        <Link href="/login">
                                            <LogIn className="mr-2 h-4 w-4" />
                                            Sign In
                                        </Link>
                                    </Button>
                                    <Button className="w-full rounded-lg bg-gradient-to-r from-[var(--color-primary-400)] to-[var(--color-primary-500)] hover:opacity-90 text-white border-0 h-11 shadow-[0_0_12px_rgba(53,109,244,0.2)]" onClick={() => setOpen(false)} asChild>
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
