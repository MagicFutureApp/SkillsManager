import { Field as FieldPrimitive } from "@base-ui/react/field";
import React from "react";

import { cn } from "@/lib/utils";

function Field({ className, ...props }: FieldPrimitive.Root.Props & { className?: string }) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn("grid min-w-0 gap-1.5 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: FieldPrimitive.Label.Props & { className?: string }) {
  return <FieldPrimitive.Label data-slot="field-label" className={cn(className)} {...props} />;
}

function FieldDescription({
  className,
  ...props
}: FieldPrimitive.Description.Props & { className?: string }) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn("text-xs font-normal text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Field, FieldDescription, FieldLabel };
