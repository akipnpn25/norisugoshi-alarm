import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-night disabled:pointer-events-none disabled:opacity-35 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: "bg-moon text-night-deep hover:bg-moon-soft",
        secondary: "bg-night-surface text-foreground hover:bg-night-card",
        ghost: "bg-transparent text-foreground hover:bg-night-surface",
        danger: "bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-night-surface",
      },
      size: {
        default: "px-6 py-4 text-base",
        sm: "px-4 py-2.5 text-sm",
        lg: "px-8 py-6 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
