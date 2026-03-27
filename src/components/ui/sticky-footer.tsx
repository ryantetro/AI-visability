"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'motion/react';
import {
    GithubIcon,
    TwitterIcon,
    LinkedinIcon,
} from 'lucide-react';
import { Button } from './button';
import Link from 'next/link';
import { AisoBrand } from '@/components/ui/aiso-brand';

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
            className={cn('relative w-full border-t border-white/[0.06]', className)}
            style={{
                background:
                    'linear-gradient(180deg, rgba(6,6,6,1) 0%, rgba(4,4,5,1) 100%)',
            }}
            {...props}
        >
            <div className="w-full max-w-[1280px] mx-auto px-4 py-14 md:px-8">
                <div className="flex flex-col gap-12 md:flex-row justify-between">
                    {/* Brand column */}
                    <AnimatedContainer className="w-full max-w-sm space-y-6">
                        <AisoBrand logoClassName="h-7 w-7" textClassName="text-[15px]" wordmarkVariant="dark" />
                        <p className="max-w-xs text-sm leading-relaxed text-white/40">
                            Make your business visible to AI. Check how ChatGPT, Perplexity, and Claude perceive your brand, and use our tools to optimize your answers.
                        </p>
                        <div className="flex gap-2">
                            {socialLinks.map((link) => (
                                <Button
                                    key={link.title}
                                    size="icon"
                                    variant="ghost"
                                    className="size-9 rounded-lg bg-white/[0.03] text-white/30 hover:bg-white/[0.06] hover:text-white/60"
                                    asChild
                                >
                                    <Link href={link.href} aria-label={link.title}>
                                        <link.icon className="size-4" />
                                    </Link>
                                </Button>
                            ))}
                        </div>
                    </AnimatedContainer>

                    {/* Link columns */}
                    <div className="flex gap-12 lg:gap-24 flex-wrap">
                        {footerLinkGroups.map((group, index) => (
                            <AnimatedContainer
                                key={group.label}
                                delay={0.1 + index * 0.1}
                                className="min-w-[140px]"
                            >
                                <div>
                                    <h3 className="text-[11px] uppercase tracking-[0.1em] font-semibold text-white/50 mb-5">
                                        {group.label}
                                    </h3>
                                    <ul className="space-y-3 text-sm text-white/35">
                                        {group.links.map((link) => (
                                            <li key={link.title}>
                                                <Link
                                                    href={link.href}
                                                    className="inline-flex items-center transition-colors duration-150 hover:text-white/70"
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
                <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 text-xs text-white/25 md:flex-row">
                    <p>&copy; {new Date().getFullYear()} airadr &mdash; AI Search Optimization. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/terms" className="hover:text-white/50 transition-colors duration-150">Terms of Service</Link>
                        <Link href="/privacy" className="hover:text-white/50 transition-colors duration-150">Privacy Policy</Link>
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
            { title: 'airadr Flow Atlas', href: '/ui-ux-flow' },
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
