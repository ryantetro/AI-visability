'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, useInView } from 'motion/react';

interface AnimatedStatProps {
    value: number;
    suffix?: string;
    label: string;
}

export function AnimatedStat({ value, suffix = '', label }: AnimatedStatProps) {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        // Update display state whenever the rounded transform changes
        const unsubscribe = rounded.on("change", (latest) => {
            setDisplayValue(latest);
        });
        return unsubscribe;
    }, [rounded]);

    useEffect(() => {
        if (isInView) {
            const controls = animate(count, value, {
                duration: 2,
                ease: [0.22, 1, 0.36, 1], // Custom slow ease out
            });
            return controls.stop;
        }
    }, [count, value, isInView]);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center text-center"
        >
            <p className="flex items-center justify-center text-3xl font-semibold tracking-tight text-white drop-shadow-sm">
                {displayValue}{suffix}
            </p>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                {label}
            </p>
        </motion.div>
    );
}
