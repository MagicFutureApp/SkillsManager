import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  thumbClassName,
  ...props
}: SwitchPrimitive.Root.Props & {
  className?: string;
  thumbClassName?: string;
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full border border-border bg-muted p-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "size-5 rounded-full border border-border bg-background transition-transform data-checked:translate-x-5 data-checked:border-primary-foreground",
          thumbClassName
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
