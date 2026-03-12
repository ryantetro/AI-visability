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
        { label: 'Resources', href: '/#resources' },
    ];

    return (
        <header
            className={cn(
                'relative z-50 w-full max-w-3xl rounded-full border shadow-lg mx-4',
                'bg-[#0c0a09]/95 supports-[backdrop-filter]:bg-[#0c0a09]/80 backdrop-blur-lg',
                'border-[rgba(255,255,255,0.08)]'
            )}
        >
            <nav className="flex items-center justify-between p-1.5 pl-3">
                {/* Logo Section */}
                <Link href="/" className="hover:bg-[rgba(255,255,255,0.05)] flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 transition-colors duration-100">
                    <div className="flex items-center justify-center rounded-full bg-[#059669] p-1 h-6 w-6">
                        <span className="text-white text-[10px] font-bold leading-none tracking-tight">AI</span>
                    </div>
                    <p className="font-sans text-base font-bold tracking-tight">AISO</p>
                </Link>

                {/* Desktop Links */}
                <div className="hidden items-center gap-1 lg:flex">
                    {links.map((link) => (
                        <Link
                            key={link.label}
                            className={buttonVariants({ variant: 'ghost', size: 'sm', className: "rounded-full hover:bg-[rgba(255,255,255,0.05)] hover:text-white text-[#d6d3d1]" })}
                            href={link.href}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Mobile menu & CTAs */}
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="rounded-full hidden sm:flex hover:bg-[rgba(255,255,255,0.05)] hover:text-white text-[#d6d3d1]" asChild>
                        <Link href="/login">Log in</Link>
                    </Button>
                    <Button size="sm" className="rounded-full bg-[#059669] hover:bg-[#047857] text-white shadow-[0_0_15px_rgba(5,150,105,0.3)] hidden sm:flex" asChild>
                        <Link href="/audit">Check My AI Score</Link>
                    </Button>

                    <Sheet open={open} onOpenChange={setOpen}>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setOpen(!open)}
                            className="lg:hidden rounded-full h-8 w-8 bg-transparent border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.05)]"
                        >
                            <MenuIcon className="size-4" />
                        </Button>
                        <SheetContent
                            className="bg-[#0c0a09]/95 supports-[backdrop-filter]:bg-[#0c0a09]/80 gap-0 backdrop-blur-xl border-[rgba(255,255,255,0.08)]"
                            showClose={false}
                            side="left"
                        >
                            <div className="flex items-center gap-2 px-6 pt-8 pb-4">
                                <div className="flex items-center justify-center rounded-full bg-[#059669] p-1 h-6 w-6">
                                    <span className="text-white text-[10px] font-bold leading-none tracking-tight">AI</span>
                                </div>
                                <p className="font-sans text-base font-bold tracking-tight text-white">AISO</p>
                            </div>
                            <div className="grid gap-y-2 overflow-y-auto px-4 pt-4 pb-5">
                                {links.map((link) => (
                                    <Link
                                        key={link.label}
                                        className={buttonVariants({
                                            variant: 'ghost',
                                            className: 'justify-start rounded-full text-[#d6d3d1] hover:text-white hover:bg-[rgba(255,255,255,0.05)] text-base h-12',
                                        })}
                                        href={link.href}
                                        onClick={() => setOpen(false)}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                            <SheetFooter className="px-4 pb-8 flex-col gap-3 sm:flex-col">
                                <Button variant="outline" className="w-full rounded-full border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.05)] h-11" onClick={() => setOpen(false)} asChild>
                                    <Link href="/login">Log in</Link>
                                </Button>
                                <Button className="w-full rounded-full bg-[#059669] hover:bg-[#047857] text-white h-11" onClick={() => setOpen(false)} asChild>
                                    <Link href="/audit">Check My AI Score</Link>
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </nav>
        </header>
    );
}
