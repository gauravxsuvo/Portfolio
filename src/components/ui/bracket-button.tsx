import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "border-primary text-primary hover:bg-primary hover:text-bg",
  secondary:
    "border-secondary text-secondary hover:bg-secondary hover:text-bg",
  ghost: "border-border text-fg/70 hover:bg-fg/10 hover:text-fg",
};

const BASE =
  "inline-flex items-center gap-0 border px-3 py-1.5 text-sm tracking-wide transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Brackets({ children }: { children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="opacity-60">
        [{" "}
      </span>
      {children}
      <span aria-hidden="true" className="opacity-60">
        {" "}
        ]
      </span>
    </>
  );
}

type CommonProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

export const BracketButton = forwardRef<
  HTMLButtonElement,
  CommonProps & ButtonHTMLAttributes<HTMLButtonElement>
>(function BracketButton({ variant = "primary", children, className = "", ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      <Brackets>{children}</Brackets>
    </button>
  );
});

export function BracketLink({
  variant = "primary",
  children,
  className = "",
  href,
  external,
  ...rest
}: CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; external?: boolean }) {
  const classes = `${BASE} ${VARIANT_CLASSES[variant]} ${className}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...rest}
      >
        <Brackets>{children}</Brackets>
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      <Brackets>{children}</Brackets>
    </Link>
  );
}
