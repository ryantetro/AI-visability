"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'motion/react';
import {
    GithubIcon,
    TwitterIcon,
    LinkedinIcon,
    SearchIcon,
} from 'lucide-react';
import { Button } from './button';
import Link from 'next/link';

interface FooterLink {
    title: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
}

interface FooterLinkGroup {
    label: string;
    links: FooterLink[];
}

type StickyFooterProps = React.ComponentProps<'footer'>;

export function StickyFooter({ className, ...props }: StickyFooterProps) {
    return (
        <footer
            className={cn('relative h-[600px] w-full', className)}
            style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}
            {...props}
        >
            {/* 
        This div is fixed to the bottom. Because the footer itself has h-[600px] 
        and is placed sequentially in the normal layout flow, as you scroll past it, 
        the blank space of the footer reveals this fixed layer behind it.
      */}
            <div className="fixed bottom-0 h-[600px] w-full overflow-hidden border-t border-white/10 -z-20">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(circle at 50% -8%, rgba(255,255,255,0.035), transparent 22%), radial-gradient(circle at 50% 120%, rgba(255,255,255,0.02), transparent 28%), linear-gradient(180deg, #050505 0%, #060606 42%, #040404 100%)',
                    }}
                />
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.58] pointer-events-none"
                    style={{
                        background:
                            'repeating-linear-gradient(90deg, rgba(255,255,255,0.014) 0, rgba(255,255,255,0.014) 1px, transparent 1px, transparent 88px), linear-gradient(180deg, rgba(255,255,255,0.018), transparent 22%, transparent 78%, rgba(255,255,255,0.012))',
                    }}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.028)_0%,rgba(255,255,255,0.012)_22%,rgba(6,6,6,0)_100%)]" />
                <div className="sticky top-[calc(100vh-600px)] h-full overflow-y-auto w-full max-w-[1280px] mx-auto">
                    <div className="relative flex size-full flex-col justify-between gap-5 px-4 py-12 md:px-8">
                        {/* Main Footer Content */}
                        <div className="relative z-10 mt-10 flex flex-col gap-12 md:flex-row xl:mt-0 justify-between">
                            <AnimatedContainer className="w-full max-w-sm space-y-6">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center rounded-full bg-[var(--color-primary-500)] p-2 shadow-[0_0_20px_rgba(68,131,255,0.32)]">
                                        <span className="text-white text-xs font-bold leading-none tracking-tight">
                                            AI
                                        </span>
                                    </div>
                                    <span className="font-semibold tracking-wide text-white">
                                        AISO
                                    </span>
                                </div>
                                <p className="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
                                    Make your business visible to AI. Check how ChatGPT, Perplexity, and Claude perceive your brand, and use our tools to optimize your answers.
                                </p>
                                <div className="flex gap-3">
                                    {socialLinks.map((link) => (
                                        <Button
                                            key={link.title}
                                            size="icon"
                                            variant="ghost"
                                            className="size-10 rounded-full bg-[rgba(255,255,255,0.05)] text-[#d6d3d1] hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
                                            asChild
                                        >
                                            <Link href={link.href} aria-label={link.title}>
                                                <link.icon className="size-4" />
                                            </Link>
                                        </Button>
                                    ))}
                                </div>
                            </AnimatedContainer>

                            <div className="flex gap-12 lg:gap-24 flex-wrap">
                                {footerLinkGroups.map((group, index) => (
                                    <AnimatedContainer
                                        key={group.label}
                                        delay={0.1 + index * 0.1}
                                        className="min-w-[140px]"
                                    >
                                        <div>
                                            <h3 className="text-sm uppercase tracking-wider font-semibold text-white mb-6">
                                                {group.label}
                                            </h3>
                                            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                                                {group.links.map((link) => (
                                                    <li key={link.title}>
                                                        <Link
                                                            href={link.href}
                                                            className="inline-flex items-center transition-all duration-300 hover:text-[var(--color-primary-300)]"
                                                        >
                                                            {link.icon && <link.icon className="me-2 size-4" />}
                                                            {link.title}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </AnimatedContainer>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="relative z-10 flex flex-col items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.1)] pt-8 pb-4 text-xs text-[var(--text-tertiary)] md:flex-row">
                            <p>© {new Date().getFullYear()} AISO — AI Search Optimization. All rights reserved.</p>
                            <div className="flex gap-6">
                                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

const socialLinks = [
    { title: 'X (Twitter)', href: 'https://x.com', icon: TwitterIcon },
    { title: 'LinkedIn', href: 'https://linkedin.com', icon: LinkedinIcon },
    { title: 'GitHub', href: 'https://github.com', icon: GithubIcon },
];

const footerLinkGroups: FooterLinkGroup[] = [
    {
        label: 'Product',
        links: [
            { title: 'AI Visibility Scan', href: '/#scan' },
            { title: 'How it works', href: '/#how-it-works' },
            { title: 'Pricing', href: '/#pricing' },
            { title: 'Leaderboard', href: '/leaderboard' },
            { title: 'Resources', href: '/#resources' },
        ],
    },
    {
        label: 'Resources',
        links: [
            { title: 'AISO Flow Atlas', href: '/ui-ux-flow' },
            { title: 'Styleguide', href: '/styleguide' },
            { title: 'Certified Reports', href: '/leaderboard' },
            { title: 'Terms', href: '/terms' },
            { title: 'Privacy', href: '/privacy' },
        ],
    },
    {
        label: 'Company',
        links: [
            { title: 'Run a Scan', href: '/#scan' },
            { title: 'Score Bands', href: '/#pricing' },
            { title: 'FAQ', href: '/#resources' },
        ],
    },
];

type AnimatedContainerProps = React.ComponentProps<typeof motion.div> & {
    children?: React.ReactNode;
    delay?: number;
};

function AnimatedContainer({
    delay = 0.1,
    children,
    ...props
}: AnimatedContainerProps) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
        return <div {...props as React.HTMLAttributes<HTMLDivElement>}>{children}</div>;
    }

    return (
        <motion.div
            initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
            whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8 }}
            {...props}
        >
            {children}
        </motion.div>
    );
}
