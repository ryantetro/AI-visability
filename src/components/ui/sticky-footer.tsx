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
            <div className="fixed bottom-0 h-[600px] w-full bg-[#0c0a09] border-t border-[#44403c] overflow-hidden -z-20">
                <div className="sticky top-[calc(100vh-600px)] h-full overflow-y-auto w-full max-w-[1280px] mx-auto">
                    <div className="relative flex size-full flex-col justify-between gap-5 px-4 py-12 md:px-8">
                        {/* Subtle dot-grid texture */}
                        <div
                            aria-hidden
                            className="absolute inset-0 isolate z-0 contain-strict pointer-events-none opacity-[0.03]"
                            style={{
                                backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />

                        {/* Main Footer Content */}
                        <div className="relative z-10 mt-10 flex flex-col gap-12 md:flex-row xl:mt-0 justify-between">
                            <AnimatedContainer className="w-full max-w-sm space-y-6">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center rounded-full bg-[#059669] p-2">
                                        <span className="text-white text-xs font-bold leading-none tracking-tight">
                                            AI
                                        </span>
                                    </div>
                                    <span className="font-semibold tracking-wide text-white">
                                        AISO
                                    </span>
                                </div>
                                <p className="text-[#a8a29e] text-sm leading-relaxed max-w-xs">
                                    Make your business visible to AI. Check how ChatGPT, Perplexity, and Claude perceive your brand, and use our tools to optimize your answers.
                                </p>
                                <div className="flex gap-3">
                                    {socialLinks.map((link) => (
                                        <Button
                                            key={link.title}
                                            size="icon"
                                            variant="ghost"
                                            className="size-10 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#d6d3d1] hover:text-white"
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
                                            <ul className="text-[#a8a29e] space-y-3 text-sm">
                                                {group.links.map((link) => (
                                                    <li key={link.title}>
                                                        <Link
                                                            href={link.href}
                                                            className="hover:text-[#10b981] inline-flex items-center transition-all duration-300"
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
                        <div className="relative z-10 text-[#78716c] flex flex-col items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.1)] pt-8 pb-4 text-xs md:flex-row">
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
    { title: 'X (Twitter)', href: '#', icon: TwitterIcon },
    { title: 'LinkedIn', href: '#', icon: LinkedinIcon },
    { title: 'GitHub', href: '#', icon: GithubIcon },
];

const footerLinkGroups: FooterLinkGroup[] = [
    {
        label: 'Product',
        links: [
            { title: 'AI Visibility Scan', href: '#' },
            { title: 'Competitor Analysis', href: '#' },
            { title: 'Automated Fixes', href: '#' },
            { title: 'Pricing', href: '#' },
            { title: 'API Access', href: '#' },
        ],
    },
    {
        label: 'Resources',
        links: [
            { title: 'Blog', href: '#' },
            { title: 'Optimization Guide', href: '#' },
            { title: 'Documentation', href: '#' },
            { title: 'Help Center', href: '#' },
        ],
    },
    {
        label: 'Company',
        links: [
            { title: 'About Us', href: '#' },
            { title: 'Contact', href: '#' },
            { title: 'Partners', href: '#' },
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
