import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

type SelectOption<Value extends string> = {
  label: React.ReactNode;
  value: Value;
};

type SelectProps<Value extends string> = {
  className?: string;
  disabled?: boolean;
  options: readonly SelectOption<Value>[];
  placeholder?: React.ReactNode;
  value: Value;
  onValueChange: (value: Value) => void;
};

function Select<Value extends string>({
  className,
  disabled,
  options,
  placeholder,
  value,
  onValueChange
}: SelectProps<Value>) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <SelectPrimitive.Root
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (nextValue !== null) {
          onValueChange(nextValue as Value);
        }
      }}
    >
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        className={cn(
          "flex h-10 w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-lg border border-input bg-background px-3 text-left text-sm font-normal text-foreground outline-none transition-colors focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground",
          className
        )}
      >
        <SelectPrimitive.Value
          placeholder={placeholder}
          className="min-w-0 flex-1 truncate whitespace-nowrap"
        >
          {selectedOption?.label}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown aria-hidden="true" className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={4}
          align="start"
          className="z-50"
          alignItemWithTrigger={false}
        >
          <SelectPrimitive.Popup
            data-slot="select-content"
            className="max-h-[min(var(--available-height),320px)] min-w-[var(--anchor-width)] overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none"
          >
            <SelectPrimitive.List>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="grid min-h-8 cursor-default grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-muted data-highlighted:text-foreground data-selected:font-medium data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  <SelectPrimitive.ItemIndicator
                    keepMounted
                    className={cn(
                      "flex items-center justify-center",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <Check aria-hidden="true" className="size-3.5" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText className="truncate">
                    {option.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
export type { SelectOption };
