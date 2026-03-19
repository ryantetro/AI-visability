"use client";

import React, { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { Globe } from "lucide-react";
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon } from "@/components/ui/ai-icons";



const Circle = forwardRef<
    HTMLDivElement,
    { className?: string; children?: React.ReactNode; label?: string }
>(({ className, children, label }, ref) => {
    return (
        <div className="flex flex-col items-center gap-2">
            <div
                ref={ref}
                className={cn(
                    "z-10 flex size-12 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[var(--surface-card)] p-2.5 shadow-sm",
                    className,
                )}
            >
                {children}
            </div>
            {label && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] hidden sm:block">
                    {label}
                </span>
            )}
        </div>
    );
});

Circle.displayName = "Circle";

// ── Main Component ─────────────────────────────────────────────────────────────

export function AIBeamVisual() {
    const containerRef = useRef<HTMLDivElement>(null);
    const websiteRef = useRef<HTMLDivElement>(null);
    const chatGptRef = useRef<HTMLDivElement>(null);
    const perplexityRef = useRef<HTMLDivElement>(null);
    const geminiRef = useRef<HTMLDivElement>(null);
    const claudeRef = useRef<HTMLDivElement>(null);

    return (
        <div
            className="relative flex h-[320px] w-full max-w-2xl items-center justify-center overflow-hidden mx-auto"
            ref={containerRef}
        >
            <div className="flex size-full flex-col items-stretch justify-between gap-10">
                {/* Row 1 */}
                <div className="flex flex-row items-center justify-between">
                    <Circle ref={chatGptRef} label="ChatGPT" className="text-[#74aa9c]">
                        <ChatGPTIcon />
                    </Circle>
                    <Circle ref={perplexityRef} label="Perplexity" className="text-[#20B8CD]">
                        <PerplexityIcon />
                    </Circle>
                </div>

                {/* Row 2 — Centre */}
                <div className="flex flex-row items-center justify-between">
                    <Circle ref={geminiRef} label="Gemini" className="text-[#4285F4]">
                        <GeminiIcon />
                    </Circle>

                    {/* Central "website" node */}
                    <div className="flex flex-col items-center justify-center mt-[-30px]">
                        <Circle
                            ref={websiteRef}
                            className="size-16 border-[var(--color-primary-500)] shadow-[0_0_24px_rgba(0,180,120,0.2)] text-[var(--color-primary-400)]"
                        >
                            <Globe className="size-7" />
                        </Circle>
                        <span className="mt-3 text-xs font-semibold text-white tracking-wide uppercase">
                            Your Website
                        </span>
                    </div>

                    <Circle ref={claudeRef} label="Claude" className="text-[#d97757]">
                        <ClaudeIcon />
                    </Circle>
                </div>

                {/* Invisible spacer — keeps the original 3-row vertical spacing */}
                <div className="flex flex-row items-center justify-center opacity-0 pointer-events-none" aria-hidden>
                    <div className="size-12" />
                </div>

            </div>

            {/* Beams */}
            <AnimatedBeam containerRef={containerRef} fromRef={websiteRef} toRef={chatGptRef}
                curvature={-50} endYOffset={-10} duration={7}
                gradientStartColor="#10a37f" gradientStopColor="#ffffff" />
            <AnimatedBeam containerRef={containerRef} fromRef={websiteRef} toRef={perplexityRef}
                curvature={50} endYOffset={-10} duration={9}
                gradientStartColor="#10a37f" gradientStopColor="#20B8CD" />
            <AnimatedBeam containerRef={containerRef} fromRef={websiteRef} toRef={geminiRef}
                duration={8} gradientStartColor="#10a37f" gradientStopColor="#8ab4f8" />
            <AnimatedBeam containerRef={containerRef} fromRef={websiteRef} toRef={claudeRef}
                reverse duration={8} gradientStartColor="#10a37f" gradientStopColor="#d97757" />

        </div>
    );
}
