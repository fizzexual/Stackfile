import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow hover:opacity-90 focus-visible:ring-fuchsia-500",
        outline:
          "border border-white/15 bg-white/5 text-neutral-100 hover:bg-white/10 focus-visible:ring-white/30",
        ghost:
          "text-neutral-300 hover:bg-white/5 hover:text-white focus-visible:ring-white/20",
        destructive:
          "bg-red-500/90 text-white hover:bg-red-500 focus-visible:ring-red-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
