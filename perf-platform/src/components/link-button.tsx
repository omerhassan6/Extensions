import Link from "next/link";
import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { VariantProps } from "class-variance-authority";

// This component library is built on Base UI (not Radix), which composes
// custom elements via a `render` prop instead of Radix's `asChild`. This
// wrapper keeps call sites reading like a normal Link-styled-as-Button.
export function LinkButton({
  href,
  children,
  className,
  variant,
  size,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
} & VariantProps<typeof buttonVariants>) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      nativeButton={false}
      render={<Link href={href}>{children}</Link>}
    />
  );
}
