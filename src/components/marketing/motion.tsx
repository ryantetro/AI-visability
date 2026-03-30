'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const motionEase = [0.22, 1, 0.36, 1] as const;

export const viewportOnce = { once: true as const, margin: '-80px' as const, amount: 0.15 as const };

export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() === true;
}

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? undefined : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: reduce ? 0 : 0.52, ease: motionEase, delay }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGrid({
  children,
  className,
  stagger = 0.09,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: reduce ? 0 : 0.06 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? {} : { opacity: 0, y: 18 },
        visible: reduce ? {} : { opacity: 1, y: 0, transition: { duration: 0.46, ease: motionEase } },
      }}
    >
      {children}
    </motion.div>
  );
}
