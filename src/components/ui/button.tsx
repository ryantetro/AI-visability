import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-x-2.5 whitespace-nowrap rounded-tremor-full text-tremor-label font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-background text-foreground hover:bg-surface-card-hover",
                destructive:
                    "bg-red-50 text-red-700 hover:bg-red-100",
                outline:
                    "bg-background hover:bg-surface-card-hover",
                secondary:
                    "bg-background text-foreground hover:bg-surface-card-hover",
                ghost: "hover:bg-surface-card-hover",
                link: "border-transparent text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-2.5 py-1.5",
                sm: "h-8 px-2 py-1 text-xs",
                lg: "h-10 px-4 py-2",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    },
)
Button.displayName = "Button"

export { Button, buttonVariants }
