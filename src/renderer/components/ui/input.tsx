import { Input as InputPrimitive } from "@base-ui/react/input";
import { Field } from "@base-ui/react/field";
import React from "react";

import { cn } from "@/lib/utils";

const inputClassName =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground focus:border-ring disabled:cursor-not-allowed disabled:opacity-50";

function Input({
  className,
  ...props
}: InputPrimitive.Props & {
  className?: string;
}) {
  return <InputPrimitive data-slot="input" className={cn(inputClassName, className)} {...props} />;
}

type TextareaProps = Field.Control.Props & {
  className?: string;
};

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <Field.Control
      data-slot="textarea"
      render={<textarea />}
      className={cn(
        "min-h-22 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground focus:border-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input, Textarea, inputClassName };
