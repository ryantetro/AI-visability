"use client";

import React from 'react';
import { MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function FloatingHeader() {
    const [open, setOpen] = React.useState(false);

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
                    <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] h-7 w-7 shadow-[0_0_12px_rgba(53,109,244,0.25)]">
                        <span className="text-white text-[10px] font-bold leading-none tracking-tight">AI</span>
                    </div>
                    <span className="text-[15px] font-semibold tracking-[-0.01em] text-white/90">AISO</span>
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

                {/* Mobile menu & CTAs */}
                <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="rounded-lg hidden sm:flex hover:bg-[rgba(255,255,255,0.05)] hover:text-white/95 text-white/50 text-[13px] font-medium h-8" asChild>
                        <Link href="/#resources">Resources</Link>
                    </Button>
                    <Button size="sm" className="rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/90 text-[13px] font-medium border border-white/[0.06] hidden sm:flex h-8 px-3.5 transition-all duration-150" asChild>
                        <Link href="/#scan">Get Started</Link>
                    </Button>

                    <Sheet open={open} onOpenChange={setOpen}>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setOpen(!open)}
                            className="lg:hidden rounded-lg h-8 w-8 bg-transparent border-[rgba(255,255,255,0.08)] text-white/70 hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
                        >
                            <MenuIcon className="size-4" />
                        </Button>
                        <SheetContent
                            className="bg-[rgba(8,8,10,0.95)] supports-[backdrop-filter]:bg-[rgba(8,8,10,0.85)] gap-0 backdrop-blur-2xl border-[rgba(255,255,255,0.06)]"
                            showClose={false}
                            side="left"
                        >
                            <div className="flex items-center gap-2.5 px-6 pt-8 pb-4">
                                <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] h-7 w-7 shadow-[0_0_12px_rgba(53,109,244,0.25)]">
                                    <span className="text-white text-[10px] font-bold leading-none tracking-tight">AI</span>
                                </div>
                                <span className="text-[15px] font-semibold tracking-[-0.01em] text-white/90">AISO</span>
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
                                <Button variant="outline" className="w-full rounded-lg border-[rgba(255,255,255,0.08)] text-white/80 hover:bg-[rgba(255,255,255,0.05)] h-11" onClick={() => setOpen(false)} asChild>
                                    <Link href="/#resources">Resources</Link>
                                </Button>
                                <Button className="w-full rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/90 border border-white/[0.06] h-11" onClick={() => setOpen(false)} asChild>
                                    <Link href="/#scan">Get Started</Link>
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </nav>
        </header>
    );
}
