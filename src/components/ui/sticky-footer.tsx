"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'motion/react';
import {
    GithubIcon,
    TwitterIcon,
    LinkedinIcon,
} from 'lucide-react';
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
            className={cn('relative w-full border-t border-gray-200 bg-gray-50', className)}
            {...props}
        >
            <div className="w-full max-w-[1280px] mx-auto px-4 py-14 md:px-8">
                <div className="flex flex-col gap-12 md:flex-row justify-between">
                    {/* Brand column */}
                    <AnimatedContainer className="w-full max-w-sm space-y-5">
                        <AisoBrand logoClassName="h-7 w-7" textClassName="text-[15px]" wordmarkVariant="dark" />
                        <p className="max-w-xs text-sm font-medium leading-relaxed text-gray-500">
                            Make your business visible to AI. Check how ChatGPT, Perplexity, and Claude perceive your brand, and use our tools to optimize your answers.
                        </p>
                        <div className="flex gap-2">
                            {socialLinks.map((link) => (
                                <Link
                                    key={link.title}
                                    href={link.href}
                                    aria-label={link.title}
                                    className="flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
                                >
                                    <link.icon className="size-4" />
                                </Link>
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
                                    <h3 className="mb-5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-900">
                                        {group.label}
                                    </h3>
                                    <ul className="space-y-3 text-sm font-medium text-gray-500">
                                        {group.links.map((link) => (
                                            <li key={link.title}>
                                                <Link
                                                    href={link.href}
                                                    className="inline-flex items-center transition-colors duration-150 hover:text-gray-900"
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
                <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 text-xs font-medium text-gray-400 md:flex-row">
                    <p>&copy; {new Date().getFullYear()} airadr &mdash; AI Search Optimization. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/terms" className="transition-colors duration-150 hover:text-gray-700">Terms of Service</Link>
                        <Link href="/privacy" className="transition-colors duration-150 hover:text-gray-700">Privacy Policy</Link>
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
